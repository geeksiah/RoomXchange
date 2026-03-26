import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  adminConversationListQuerySchema,
  adminConversationsListResponseSchema,
  adminConversationSchema,
  adminEventListQuerySchema,
  adminEventSchema,
  adminEventsListResponseSchema,
  adminListingListQuerySchema,
  adminListingsListResponseSchema,
  adminReportListQuerySchema,
  adminReportsListResponseSchema,
  adminSubscriptionListQuerySchema,
  adminSubscriptionsListResponseSchema,
  adminUserListQuerySchema,
  adminUsersListResponseSchema,
  adminSubscriptionUpdateSchema,
  adminUserUpdateSchema,
  listingUpdateSchema,
  notificationSettingsSchema,
  type AdminConversation,
  type AdminEvent,
  type Listing,
  type ListingSummary,
  type NotificationSettings,
  type Report,
  type UserProfile
} from "@roomxchange/contracts";
import { maskPhone } from "@roomxchange/shared";
import { setUserSubscriptionState } from "./auth.js";
import { db } from "./aws.js";
import { env } from "./config.js";
import type {
  AdminEventItem,
  ConversationItem,
  ConversationMessageItem,
  ListingFeedItem,
  ListingItem,
  ListingLookupItem,
  NotificationSettingsItem,
  ReportItem,
  UserItem
} from "./domain.js";
import { assertFound } from "./errors.js";
import { tableKeys } from "./keys.js";

function toUserProfile(item: UserItem): UserProfile {
  return {
    userId: item.userId,
    phone: item.phone,
    name: item.name,
    avatar: item.avatar ?? null,
    email: item.email ?? null,
    phonePublic: item.phonePublic ?? false,
    role: item.role,
    accountStatus: item.accountStatus ?? "active",
    isSubscribed: item.isSubscribed,
    subscriptionStatus: item.subscriptionStatus,
    subscriptionProvider: item.subscriptionProvider ?? null,
    subscriptionPlan: item.subscriptionPlan ?? null,
    subscriptionExpiresAt: item.subscriptionExpiresAt ?? null,
    listingsCount: item.listingsCount,
    successfulListings: item.successfulListings,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function toListingSummary(item: ListingItem | ListingLookupItem): ListingSummary {
  return {
    listingId: item.listingId,
    ownerId: item.ownerId,
    title: item.title,
    propertyType: item.propertyType ?? "apartment",
    listingSubtype: item.listingSubtype ?? null,
    price: item.price,
    location: item.location,
    lat: item.lat,
    lng: item.lng,
    previewImage: item.previewImage,
    vrUrl: item.vrUrl ?? null,
    amenities: item.amenities,
    createdAt: item.createdAt
  };
}

async function getOwner(userId: string) {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.user(userId)
    })
  );

  return result.Item as UserItem | undefined;
}

function toListing(item: ListingLookupItem, owner: UserItem): Listing {
  return {
    ...item,
    ownerContact: {
      name: owner.name,
      avatar: owner.avatar ?? null,
      phoneMasked: maskPhone(owner.phone),
      phone: owner.phonePublic ? owner.phone : null,
      canContact: false
    }
  };
}

function getDefaultNotificationSettings(): NotificationSettings {
  return {
    pushEnabled: true,
    messageNotificationsEnabled: true,
    listingMatchNotificationsEnabled: true,
    donationProvider: "Paystack",
    donationUrl: null,
    donationPresetAmounts: [50, 100, 200, 500, 1000],
    updatedAt: new Date().toISOString()
  };
}

function normalizeQuery(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function paginateList<T>(items: T[], limit: number, cursor?: string) {
  const start = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const sliced = items.slice(start, start + limit);
  const nextCursor = start + limit < items.length ? String(start + limit) : null;

  return {
    items: sliced,
    nextCursor,
    total: items.length
  };
}

function toAdminEvent(item: AdminEventItem): AdminEvent {
  return adminEventSchema.parse({
    id: `${item.PK}#${item.SK}`,
    adminId: item.adminId,
    action: item.action,
    createdAt: item.createdAt,
    targetUserId: item.targetUserId ?? null,
    listingId: item.listingId ?? null,
    conversationId: item.conversationId ?? null,
    reportId: item.reportId ?? null,
    role: item.role ?? null,
    accountStatus: item.accountStatus ?? null,
    subscriptionStatus: item.subscriptionStatus ?? null,
    status: item.status ?? null,
    resolutionNote: item.resolutionNote ?? null
  });
}

export async function getAdminUsers(query: unknown = {}) {
  const parsed = adminUserListQuerySchema.parse(query);
  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity",
      ExpressionAttributeNames: {
        "#entity": "entity"
      },
      ExpressionAttributeValues: {
        ":entity": "USER"
      }
    })
  );

  const search = normalizeQuery(parsed.query);
  const filtered = ((result.Items ?? []) as UserItem[])
    .map(toUserProfile)
    .filter((user) => {
      const queryPass =
        !search ||
        user.name.toLowerCase().includes(search) ||
        (user.email ?? "").toLowerCase().includes(search) ||
        user.phone.toLowerCase().includes(search);
      const rolePass = !parsed.role || user.role === parsed.role;
      const accountPass = !parsed.accountStatus || user.accountStatus === parsed.accountStatus;
      const activityPass =
        !parsed.activity ||
        (parsed.activity === "has_listings" && user.listingsCount > 0) ||
        (parsed.activity === "no_listings" && user.listingsCount === 0) ||
        (parsed.activity === "subscribed" && user.isSubscribed);

      return queryPass && rolePass && accountPass && activityPass;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return adminUsersListResponseSchema.parse(paginateList(filtered, parsed.limit, parsed.cursor));
}

export async function updateAdminUser(adminId: string, userId: string, input: unknown) {
  const parsed = adminUserUpdateSchema.parse(input);
  const current = assertFound(await getOwner(userId), "User not found.");
  const updated: UserItem = {
    ...current,
    ...parsed,
    updatedAt: new Date().toISOString()
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: updated
    })
  );

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: {
        ...tableKeys.adminEvent(adminId, updated.updatedAt),
        entity: "ADMIN_EVENT",
        adminId,
        targetUserId: userId,
        action: "user.update",
        createdAt: updated.updatedAt,
        role: updated.role,
        accountStatus: updated.accountStatus ?? "active"
      }
    })
  );

  return toUserProfile(updated);
}

export async function getAdminListings(query: unknown = {}) {
  const parsed = adminListingListQuerySchema.parse(query);
  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity",
      ExpressionAttributeNames: {
        "#entity": "entity"
      },
      ExpressionAttributeValues: {
        ":entity": "LISTING_LOOKUP"
      }
    })
  );

  const listings = (result.Items ?? []) as ListingLookupItem[];
  const hydrated = await Promise.all(
    listings.map(async (listing) => {
      const owner = assertFound(await getOwner(listing.ownerId), "Listing owner not found.");
      return toListing(listing, owner);
    })
  );

  const search = normalizeQuery(parsed.query);
  const filtered = hydrated
    .filter((listing) => {
      const queryPass =
        !search ||
        listing.title.toLowerCase().includes(search) ||
        listing.location.toLowerCase().includes(search) ||
        listing.ownerContact.name.toLowerCase().includes(search);
      const statusPass = !parsed.status || listing.status === parsed.status;
      const ownerPass = !parsed.ownerId || listing.ownerId === parsed.ownerId;

      return queryPass && statusPass && ownerPass;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return adminListingsListResponseSchema.parse(paginateList(filtered, parsed.limit, parsed.cursor));
}

export async function updateAdminListing(adminId: string, listingId: string, input: unknown) {
  const parsed = listingUpdateSchema.parse(input);
  const current = assertFound(
    (
      await db.send(
        new GetCommand({
          TableName: env.TABLE_NAME,
          Key: tableKeys.listingLookup(listingId)
        })
      )
    ).Item as ListingLookupItem | undefined,
    "Listing not found."
  );

  const updatedAt = new Date().toISOString();
  const updated: ListingItem = {
    ...current,
    ...tableKeys.listing(current.ownerId, current.listingId),
    entity: "LISTING",
    ...parsed,
    propertyType: parsed.propertyType ?? current.propertyType ?? "apartment",
    listingSubtype: parsed.listingSubtype === undefined ? current.listingSubtype ?? null : parsed.listingSubtype ?? null,
    vrUrl: parsed.vrUrl === undefined ? current.vrUrl : parsed.vrUrl ?? null,
    mapboxPlaceId: parsed.mapboxPlaceId === undefined ? current.mapboxPlaceId : parsed.mapboxPlaceId ?? null,
    updatedAt
  };

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: {
              ...updated,
              ...tableKeys.listing(updated.ownerId, updated.listingId),
              entity: "LISTING"
            } satisfies ListingItem
          }
        },
        {
          Put: {
            TableName: env.TABLE_NAME,
            Item: {
              ...updated,
              ...tableKeys.listingLookup(updated.listingId),
              entity: "LISTING_LOOKUP"
            } satisfies ListingLookupItem
          }
        },
        ...(updated.status === "published"
          ? [
              {
                Put: {
                  TableName: env.TABLE_NAME,
                  Item: {
                    ...tableKeys.listingFeed(updated.createdAt, updated.ownerId, updated.listingId),
                    entity: "LISTING_INDEX",
                    ...toListingSummary(updated)
                  } satisfies ListingFeedItem
                }
              }
            ]
          : [
              {
                Delete: {
                  TableName: env.TABLE_NAME,
                  Key: tableKeys.listingFeed(updated.createdAt, updated.ownerId, updated.listingId)
                }
              }
            ])
      ]
    })
  );

  const owner = assertFound(await getOwner(updated.ownerId), "Listing owner not found.");
  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: {
        ...tableKeys.adminEvent(adminId, updatedAt),
        entity: "ADMIN_EVENT",
        adminId,
        listingId,
        action: "listing.update",
        createdAt: updatedAt,
        status: updated.status
      }
    })
  );

  return toListing(
    {
      ...updated,
      ...tableKeys.listingLookup(updated.listingId),
      entity: "LISTING_LOOKUP"
    },
    owner
  );
}

export async function deleteAdminListing(adminId: string, listingId: string) {
  const current = assertFound(
    (
      await db.send(
        new GetCommand({
          TableName: env.TABLE_NAME,
          Key: tableKeys.listingLookup(listingId)
        })
      )
    ).Item as ListingLookupItem | undefined,
    "Listing not found."
  );

  const deletedAt = new Date().toISOString();

  await db.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: env.TABLE_NAME,
            Key: tableKeys.listing(current.ownerId, current.listingId)
          }
        },
        {
          Delete: {
            TableName: env.TABLE_NAME,
            Key: tableKeys.listingLookup(current.listingId)
          }
        },
        {
          Delete: {
            TableName: env.TABLE_NAME,
            Key: tableKeys.listingFeed(current.createdAt, current.ownerId, current.listingId)
          }
        },
        {
          Update: {
            TableName: env.TABLE_NAME,
            Key: tableKeys.user(current.ownerId),
            UpdateExpression: "SET listingsCount = if_not_exists(listingsCount, :zero) - :one, updatedAt = :updatedAt",
            ConditionExpression: "attribute_exists(PK)",
            ExpressionAttributeValues: {
              ":zero": 0,
              ":one": 1,
              ":updatedAt": deletedAt
            }
          }
        }
      ]
    })
  );

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: {
        ...tableKeys.adminEvent(adminId, deletedAt),
        entity: "ADMIN_EVENT",
        adminId,
        listingId,
        action: "listing.delete",
        createdAt: deletedAt
      }
    })
  );
}

export async function getAdminAnalytics() {
  const [usersResult, listingsResult, reportsResult] = await Promise.all([
    db.send(
      new ScanCommand({
        TableName: env.TABLE_NAME,
        FilterExpression: "#entity = :entity",
        ExpressionAttributeNames: { "#entity": "entity" },
        ExpressionAttributeValues: { ":entity": "USER" }
      })
    ),
    db.send(
      new ScanCommand({
        TableName: env.TABLE_NAME,
        FilterExpression: "#entity = :entity",
        ExpressionAttributeNames: { "#entity": "entity" },
        ExpressionAttributeValues: { ":entity": "LISTING_LOOKUP" }
      })
    ),
    db.send(
      new ScanCommand({
        TableName: env.TABLE_NAME,
        FilterExpression: "#entity = :entity",
        ExpressionAttributeNames: { "#entity": "entity" },
        ExpressionAttributeValues: { ":entity": "REPORT" }
      })
    )
  ]);

  const users = (usersResult.Items ?? []) as UserItem[];
  const listings = (listingsResult.Items ?? []) as ListingLookupItem[];
  const reports = (reportsResult.Items ?? []) as ReportItem[];

  return {
    totalUsers: users.length,
    activeUsers: users.filter((user) => (user.accountStatus ?? "active") === "active").length,
    frozenUsers: users.filter((user) => user.accountStatus === "frozen").length,
    removedUsers: users.filter((user) => user.accountStatus === "removed").length,
    totalListings: listings.length,
    publishedListings: listings.filter((listing) => listing.status === "published").length,
    archivedListings: listings.filter((listing) => listing.status === "archived").length,
    openReports: reports.filter((report) => report.status === "open").length,
    reviewingReports: reports.filter((report) => report.status === "reviewing").length,
    resolvedReports: reports.filter((report) => report.status === "resolved").length,
    totalAdmins: users.filter((user) => ["moderator", "admin", "super_admin"].includes(user.role)).length
  };
}

export async function getAdminEvents(query: unknown = {}) {
  const parsed = adminEventListQuerySchema.parse(query);
  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity",
      ExpressionAttributeNames: { "#entity": "entity" },
      ExpressionAttributeValues: { ":entity": "ADMIN_EVENT" }
    })
  );

  const filtered = ((result.Items ?? []) as AdminEventItem[])
    .filter((item) => (!parsed.adminId || item.adminId === parsed.adminId) && (!parsed.action || item.action === parsed.action))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(toAdminEvent);

  return adminEventsListResponseSchema.parse(paginateList(filtered, parsed.limit, parsed.cursor));
}

export async function getAdminConversations(query: unknown = {}) {
  const parsed = adminConversationListQuerySchema.parse(query);
  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity",
      ExpressionAttributeNames: { "#entity": "entity" },
      ExpressionAttributeValues: { ":entity": "CONVERSATION" }
    })
  );

  const conversations = (result.Items ?? []) as ConversationItem[];
  const hydrated = await Promise.all(
    conversations.map(async (conversation) => {
      const messages = await db.send(
        new QueryCommand({
          TableName: env.TABLE_NAME,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": `CONVERSATION#${conversation.conversationId}`,
            ":sk": "MESSAGE#"
          }
        })
      );

      return adminConversationSchema.parse({
        conversationId: conversation.conversationId,
        listingId: conversation.listingId,
        listingTitle: conversation.listingTitle,
        listingPreviewImage: conversation.listingPreviewImage,
        buyer: {
          userId: conversation.buyerId,
          name: conversation.buyerName,
          avatar: conversation.buyerAvatar
        },
        owner: {
          userId: conversation.ownerId,
          name: conversation.ownerName,
          avatar: conversation.ownerAvatar
        },
        lastMessagePreview: conversation.lastMessagePreview,
        lastMessageAt: conversation.lastMessageAt,
        messageCount: (messages.Items ?? []).length,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      } satisfies AdminConversation);
    })
  );

  const search = normalizeQuery(parsed.query);
  const filtered = hydrated
    .filter((conversation) => {
      const queryPass =
        !search ||
        conversation.listingTitle.toLowerCase().includes(search) ||
        conversation.buyer.name.toLowerCase().includes(search) ||
        conversation.owner.name.toLowerCase().includes(search) ||
        conversation.lastMessagePreview.toLowerCase().includes(search);
      const listingPass = !parsed.listingId || conversation.listingId === parsed.listingId;
      const ownerPass = !parsed.ownerId || conversation.owner.userId === parsed.ownerId;
      const buyerPass = !parsed.buyerId || conversation.buyer.userId === parsed.buyerId;

      return queryPass && listingPass && ownerPass && buyerPass;
    })
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));

  return adminConversationsListResponseSchema.parse(paginateList(filtered, parsed.limit, parsed.cursor));
}

export async function deleteAdminConversation(adminId: string, conversationId: string) {
  const conversation = assertFound(
    (
      await db.send(
        new GetCommand({
          TableName: env.TABLE_NAME,
          Key: tableKeys.conversation(conversationId)
        })
      )
    ).Item as ConversationItem | undefined,
    "Conversation not found."
  );

  const messages = await db.send(
    new QueryCommand({
      TableName: env.TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `CONVERSATION#${conversationId}`,
        ":sk": "MESSAGE#"
      }
    })
  );

  await Promise.all([
    db.send(new DeleteCommand({ TableName: env.TABLE_NAME, Key: tableKeys.conversation(conversationId) })),
    db.send(new DeleteCommand({ TableName: env.TABLE_NAME, Key: tableKeys.userConversation(conversation.ownerId, conversationId) })),
    db.send(new DeleteCommand({ TableName: env.TABLE_NAME, Key: tableKeys.userConversation(conversation.buyerId, conversationId) })),
    ...((messages.Items ?? []) as ConversationMessageItem[]).map((message) =>
      db.send(new DeleteCommand({ TableName: env.TABLE_NAME, Key: { PK: message.PK, SK: message.SK } }))
    )
  ]);

  const deletedAt = new Date().toISOString();
  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: {
        ...tableKeys.adminEvent(adminId, deletedAt),
        entity: "ADMIN_EVENT",
        adminId,
        conversationId,
        action: "conversation.delete",
        createdAt: deletedAt
      }
    })
  );

  return { success: true as const };
}

export async function getAdminSubscriptions(query: unknown = {}) {
  const parsed = adminSubscriptionListQuerySchema.parse(query);
  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity",
      ExpressionAttributeNames: { "#entity": "entity" },
      ExpressionAttributeValues: { ":entity": "USER" }
    })
  );

  const search = normalizeQuery(parsed.query);
  const filtered = ((result.Items ?? []) as UserItem[])
    .map(toUserProfile)
    .filter((user) => {
      const queryPass =
        !search ||
        user.name.toLowerCase().includes(search) ||
        (user.email ?? "").toLowerCase().includes(search) ||
        user.phone.toLowerCase().includes(search);
      const statusPass = !parsed.subscriptionStatus || user.subscriptionStatus === parsed.subscriptionStatus;
      const accessPass = parsed.isSubscribed === undefined || user.isSubscribed === parsed.isSubscribed;
      return queryPass && statusPass && accessPass;
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return adminSubscriptionsListResponseSchema.parse(paginateList(filtered, parsed.limit, parsed.cursor));
}

export async function updateAdminSubscription(adminId: string, userId: string, input: unknown) {
  const parsed = adminSubscriptionUpdateSchema.parse(input);
  const current = assertFound(await getOwner(userId), "User not found.");
  const updated = await setUserSubscriptionState(userId, {
    isSubscribed: parsed.isSubscribed ?? current.isSubscribed,
    subscriptionStatus: parsed.subscriptionStatus ?? current.subscriptionStatus,
    subscriptionExpiresAt:
      parsed.subscriptionExpiresAt === undefined ? current.subscriptionExpiresAt ?? null : parsed.subscriptionExpiresAt ?? null,
    subscriptionPlan: parsed.subscriptionPlan === undefined ? current.subscriptionPlan ?? null : parsed.subscriptionPlan ?? null,
    subscriptionProvider:
      parsed.subscriptionProvider === undefined ? current.subscriptionProvider ?? null : parsed.subscriptionProvider ?? null,
    paystackCustomerCode: current.paystackCustomerCode ?? null,
    paystackSubscriptionCode: current.paystackSubscriptionCode ?? null
  });

  const updatedAt = new Date().toISOString();
  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: {
        ...tableKeys.adminEvent(adminId, updatedAt),
        entity: "ADMIN_EVENT",
        adminId,
        targetUserId: userId,
        action: "subscription.update",
        createdAt: updatedAt,
        subscriptionStatus: updated.subscriptionStatus
      }
    })
  );

  return updated;
}

export async function getNotificationSettings() {
  const result = await db.send(
    new GetCommand({
      TableName: env.TABLE_NAME,
      Key: tableKeys.appSetting("NOTIFICATIONS")
    })
  );

  return notificationSettingsSchema.parse(result.Item ?? getDefaultNotificationSettings());
}

export async function updateAdminNotificationSettings(adminId: string, input: unknown) {
  const parsed = notificationSettingsSchema.partial().parse(input);
  const current = await getNotificationSettings();
  const updatedAt = new Date().toISOString();
  const item: NotificationSettingsItem = {
    ...tableKeys.appSetting("NOTIFICATIONS"),
    entity: "APP_NOTIFICATION_SETTINGS",
    pushEnabled: parsed.pushEnabled ?? current.pushEnabled,
    messageNotificationsEnabled: parsed.messageNotificationsEnabled ?? current.messageNotificationsEnabled,
    listingMatchNotificationsEnabled: parsed.listingMatchNotificationsEnabled ?? current.listingMatchNotificationsEnabled,
    donationProvider: parsed.donationProvider === undefined ? current.donationProvider : parsed.donationProvider,
    donationUrl: parsed.donationUrl === undefined ? current.donationUrl : parsed.donationUrl,
    donationPresetAmounts: parsed.donationPresetAmounts ?? current.donationPresetAmounts,
    updatedAt
  };

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: item
    })
  );

  await db.send(
    new PutCommand({
      TableName: env.TABLE_NAME,
      Item: {
        ...tableKeys.adminEvent(adminId, updatedAt),
        entity: "ADMIN_EVENT",
        adminId,
        action: "notifications.update",
        createdAt: updatedAt
      }
    })
  );

  return notificationSettingsSchema.parse(item);
}

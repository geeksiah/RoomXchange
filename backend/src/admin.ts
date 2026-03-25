import { DeleteCommand, GetCommand, PutCommand, QueryCommand, ScanCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  adminConversationSchema,
  adminSubscriptionUpdateSchema,
  adminUserUpdateSchema,
  listingUpdateSchema,
  notificationSettingsSchema,
  type AdminConversation,
  type Listing,
  type ListingSummary,
  type NotificationSettings,
  type UserProfile
} from "@roomxchange/contracts";
import { maskPhone } from "@roomxchange/shared";
import { setUserSubscriptionState } from "./auth.js";
import { db } from "./aws.js";
import { env } from "./config.js";
import type {
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
    updatedAt: new Date().toISOString()
  };
}

export async function getAdminUsers() {
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

  return ((result.Items ?? []) as UserItem[]).map(toUserProfile);
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

export async function getAdminListings() {
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
  return Promise.all(
    listings.map(async (listing) => {
      const owner = assertFound(await getOwner(listing.ownerId), "Listing owner not found.");
      return toListing(listing, owner);
    })
  );
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

export async function getAdminConversations() {
  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity",
      ExpressionAttributeNames: { "#entity": "entity" },
      ExpressionAttributeValues: { ":entity": "CONVERSATION" }
    })
  );

  const conversations = (result.Items ?? []) as ConversationItem[];
  return Promise.all(
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

export async function getAdminSubscriptions() {
  const result = await db.send(
    new ScanCommand({
      TableName: env.TABLE_NAME,
      FilterExpression: "#entity = :entity",
      ExpressionAttributeNames: { "#entity": "entity" },
      ExpressionAttributeValues: { ":entity": "USER" }
    })
  );

  return ((result.Items ?? []) as UserItem[]).map(toUserProfile);
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

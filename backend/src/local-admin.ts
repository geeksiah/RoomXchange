import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import {
  adminConversationListQuerySchema,
  adminConversationsListResponseSchema,
  adminEventListQuerySchema,
  adminEventsListResponseSchema,
  adminEventSchema,
  adminListingListQuerySchema,
  adminListingsListResponseSchema,
  adminReportListQuerySchema,
  adminReportsListResponseSchema,
  adminSubscriptionListQuerySchema,
  adminSubscriptionsListResponseSchema,
  adminUserListQuerySchema,
  adminUsersListResponseSchema,
  adminLoginSchema,
  adminSubscriptionUpdateSchema,
  adminUserUpdateSchema,
  listingUpdateSchema,
  notificationSettingsSchema,
  reportUpdateSchema,
  type AdminAnalytics,
  type AdminConversation,
  type AdminEvent,
  type AdminLoginInput,
  type AuthSession,
  type Listing,
  type NotificationSettings,
  type Report,
  type UserProfile
} from "@roomxchange/contracts";
import { maskPhone } from "@roomxchange/shared";
import { AppError, assertFound } from "./errors.js";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createFakeJwt(payload: Record<string, string>) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.roomxchange-local-admin`;
}

function toSession(user: UserProfile): AuthSession {
  const payload = {
    sub: user.userId,
    phone_number: user.phone,
    name: user.name,
    email: user.email ?? ""
  };

  return {
    user,
    tokens: {
      accessToken: createFakeJwt(payload),
      idToken: createFakeJwt(payload),
      refreshToken: "roomxchange-local-refresh-token",
      expiresIn: 86_400
    }
  };
}

function nowIso() {
  return new Date().toISOString();
}

function isAdminRole(role: UserProfile["role"]) {
  return ["moderator", "admin", "super_admin"].includes(role);
}

const localState: {
  users: UserProfile[];
  listings: Listing[];
  conversations: AdminConversation[];
  reports: Report[];
  adminEvents: AdminEvent[];
  notificationSettings: NotificationSettings;
} = {
  users: [
    {
      userId: "6b1d0d8c-5650-4703-b6d4-20b8c2579e11",
      phone: "+233240000001",
      name: "RoomXchange Admin",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      email: "admin@roomxchange.dev",
      phonePublic: false,
      role: "super_admin",
      accountStatus: "active",
      isSubscribed: true,
      subscriptionStatus: "active",
      subscriptionProvider: "roomxchange-local",
      subscriptionPlan: "admin",
      subscriptionExpiresAt: "2027-03-24T00:00:00.000Z",
      listingsCount: 1,
      successfulListings: 1,
      createdAt: "2026-03-24T08:00:00.000Z",
      updatedAt: "2026-03-24T08:00:00.000Z"
    },
    {
      userId: "f7e7b52a-1c14-4eb4-98bd-5737cded6f01",
      phone: "+233240000002",
      name: "Ama Ofori",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
      email: "ama.ofori@roomxchange.dev",
      phonePublic: true,
      role: "member",
      accountStatus: "active",
      isSubscribed: true,
      subscriptionStatus: "active",
      subscriptionProvider: "roomxchange-local",
      subscriptionPlan: "starter",
      subscriptionExpiresAt: "2027-03-24T00:00:00.000Z",
      listingsCount: 2,
      successfulListings: 2,
      createdAt: "2026-03-24T08:00:00.000Z",
      updatedAt: "2026-03-24T08:00:00.000Z"
    },
    {
      userId: "1cf4c7b7-c7a7-4d3f-8ca1-2d9d3743d8d9",
      phone: "+233240000003",
      name: "Kojo Mensah",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
      email: "kojo.mensah@roomxchange.dev",
      phonePublic: true,
      role: "member",
      accountStatus: "active",
      isSubscribed: true,
      subscriptionStatus: "active",
      subscriptionProvider: "roomxchange-local",
      subscriptionPlan: "starter",
      subscriptionExpiresAt: "2027-03-24T00:00:00.000Z",
      listingsCount: 1,
      successfulListings: 1,
      createdAt: "2026-03-24T08:00:00.000Z",
      updatedAt: "2026-03-24T08:00:00.000Z"
    },
    {
      userId: "305ef7fe-b253-4b9b-9087-879a846e9b47",
      phone: "+233240000004",
      name: "Naa Dedei",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      email: "naa.dedei@roomxchange.dev",
      phonePublic: false,
      role: "moderator",
      accountStatus: "active",
      isSubscribed: true,
      subscriptionStatus: "active",
      subscriptionProvider: "roomxchange-local",
      subscriptionPlan: "ops",
      subscriptionExpiresAt: "2027-03-24T00:00:00.000Z",
      listingsCount: 1,
      successfulListings: 1,
      createdAt: "2026-03-24T08:00:00.000Z",
      updatedAt: "2026-03-24T08:00:00.000Z"
    }
  ],
  listings: [],
  conversations: [
    {
      conversationId: "local-conversation-0001",
      listingId: "local-listing-0001",
      listingTitle: "Sunlit Ensuite Room Near Osu Oxford Street",
      listingPreviewImage: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
      buyer: {
        userId: "6b1d0d8c-5650-4703-b6d4-20b8c2579e11",
        name: "RoomXchange Admin",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"
      },
      owner: {
        userId: "f7e7b52a-1c14-4eb4-98bd-5737cded6f01",
        name: "Ama Ofori",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80"
      },
      lastMessagePreview: "Perfect. I would like to visit after work and confirm the move-in date.",
      lastMessageAt: "2026-03-24T08:10:00.000Z",
      messageCount: 2,
      createdAt: "2026-03-24T08:00:00.000Z",
      updatedAt: "2026-03-24T08:10:00.000Z"
    }
  ],
  reports: [
    {
      reportId: "local-report-0001",
      listingId: "local-listing-0002",
      reporterId: "6b1d0d8c-5650-4703-b6d4-20b8c2579e11",
      targetUserId: "1cf4c7b7-c7a7-4d3f-8ca1-2d9d3743d8d9",
      reason: "Suspicious duplicate listing",
      status: "open",
      resolutionNote: null,
      createdAt: "2026-03-24T08:20:00.000Z",
      updatedAt: "2026-03-24T08:20:00.000Z"
    }
  ],
  adminEvents: [],
  notificationSettings: {
    pushEnabled: true,
    messageNotificationsEnabled: true,
    listingMatchNotificationsEnabled: true,
    donationProvider: "Paystack",
    donationUrl: "https://paystack.com/pay/roomxchange-support",
    donationPresetAmounts: [50, 100, 200, 500, 1000],
    updatedAt: "2026-03-24T08:00:00.000Z"
  }
};

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

function recordAdminEvent(adminId: string, action: string, extra: Omit<AdminEvent, "id" | "adminId" | "action" | "createdAt"> = {}) {
  const event = adminEventSchema.parse({
    id: randomUUID(),
    adminId,
    action,
    createdAt: nowIso(),
    ...extra
  });
  localState.adminEvents.unshift(event);
}

localState.listings = [
  {
    listingId: "local-listing-0001",
    ownerId: "f7e7b52a-1c14-4eb4-98bd-5737cded6f01",
    title: "Sunlit Ensuite Room Near Osu Oxford Street",
    propertyType: "room",
    listingSubtype: "single_room_sc",
    price: 1200,
    location: "Osu, Accra",
    lat: 5.5601,
    lng: -0.1823,
    images: ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80"],
    previewImage: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    vrUrl: null,
    description: "Bright ensuite room with fast Wi-Fi and great access to nightlife and transit.",
    amenities: ["wifi", "air_conditioning", "workspace"],
    mapboxPlaceId: null,
    status: "published",
    createdAt: "2026-03-24T08:00:00.000Z",
    updatedAt: "2026-03-24T08:00:00.000Z",
    ownerContact: {
      name: "Ama Ofori",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
      phoneMasked: maskPhone("+233240000002"),
      phone: "+233240000002",
      canContact: false
    }
  },
  {
    listingId: "local-listing-0002",
    ownerId: "1cf4c7b7-c7a7-4d3f-8ca1-2d9d3743d8d9",
    title: "Modern 1 Bedroom Apartment in East Legon",
    propertyType: "apartment",
    listingSubtype: "one_bedroom",
    price: 2300,
    location: "East Legon, Accra",
    lat: 5.6396,
    lng: -0.1537,
    images: ["https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80"],
    previewImage: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
    vrUrl: null,
    description: "One-bedroom apartment with secure parking and a calm residential setting.",
    amenities: ["wifi", "parking", "kitchen", "laundry"],
    mapboxPlaceId: null,
    status: "published",
    createdAt: "2026-03-24T07:50:00.000Z",
    updatedAt: "2026-03-24T07:50:00.000Z",
    ownerContact: {
      name: "Kojo Mensah",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
      phoneMasked: maskPhone("+233240000003"),
      phone: "+233240000003",
      canContact: false
    }
  },
  {
    listingId: "local-listing-0003",
    ownerId: "305ef7fe-b253-4b9b-9087-879a846e9b47",
    title: "Budget Room With Shared Kitchen in Madina",
    propertyType: "room",
    listingSubtype: "single_room_sc",
    price: 650,
    location: "Madina, Accra",
    lat: 5.6814,
    lng: -0.1647,
    images: ["https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80"],
    previewImage: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
    vrUrl: null,
    description: "Affordable private room with kitchen access and practical utility coverage.",
    amenities: ["wifi", "kitchen"],
    mapboxPlaceId: null,
    status: "archived",
    createdAt: "2026-03-24T07:35:00.000Z",
    updatedAt: "2026-03-24T07:35:00.000Z",
    ownerContact: {
      name: "Naa Dedei",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      phoneMasked: maskPhone("+233240000004"),
      phone: null,
      canContact: false
    }
  }
];

export function isLocalAdminMode() {
  return !(process.env.TABLE_NAME || process.env.ROOMXCHANGE_TABLE_NAME);
}

function assertLocalAdmin(userId: string) {
  const user = localState.users.find((item) => item.userId === userId);
  if (!user || !isAdminRole(user.role) || user.accountStatus !== "active") {
    throw new AppError(403, "Admin access is required.");
  }
  return user;
}

function syncListingOwnerContact(ownerId: string) {
  const owner = localState.users.find((user) => user.userId === ownerId);
  if (!owner) {
    return;
  }

  localState.listings = localState.listings.map((listing) =>
    listing.ownerId === ownerId
      ? {
          ...listing,
          ownerContact: {
            ...listing.ownerContact,
            name: owner.name,
            avatar: owner.avatar,
            phone: owner.phonePublic ? owner.phone : null,
            phoneMasked: owner.phonePublic ? maskPhone(owner.phone) : "Hidden"
          }
        }
      : listing
  );
}

export async function localAdminLogin(input: unknown) {
  const parsed = adminLoginSchema.parse(input as AdminLoginInput);
  const expectedEmail = process.env.ADMIN_WEB_EMAIL ?? "admin@roomxchange.dev";
  const expectedPassword = process.env.ADMIN_WEB_PASSWORD ?? "Admin@12345";

  if (parsed.email.toLowerCase() !== expectedEmail.toLowerCase() || parsed.password !== expectedPassword) {
    throw new AppError(401, "Invalid admin credentials.");
  }

  const user = assertFound(localState.users.find((item) => item.email?.toLowerCase() === parsed.email.toLowerCase()), "Admin account not found.");
  assertLocalAdmin(user.userId);
  return toSession(clone(user));
}

export async function localGetUserProfile(userId: string) {
  return clone(assertFound(localState.users.find((item) => item.userId === userId), "User not found."));
}

export async function localGetAdminUsers(userId: string, query: unknown = {}) {
  assertLocalAdmin(userId);
  const parsed = adminUserListQuerySchema.parse(query);
  const search = parsed.query?.trim().toLowerCase() ?? "";
  const filtered = localState.users
    .filter((user) => {
      const queryPass =
        !search ||
        user.name.toLowerCase().includes(search) ||
        (user.email ?? "").toLowerCase().includes(search) ||
        user.phone.toLowerCase().includes(search);
      const rolePass = !parsed.role || user.role === parsed.role;
      const statusPass = !parsed.accountStatus || user.accountStatus === parsed.accountStatus;
      const activityPass =
        !parsed.activity ||
        (parsed.activity === "has_listings" && user.listingsCount > 0) ||
        (parsed.activity === "no_listings" && user.listingsCount === 0) ||
        (parsed.activity === "subscribed" && user.isSubscribed);
      return queryPass && rolePass && statusPass && activityPass;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return adminUsersListResponseSchema.parse(paginateList(clone(filtered), parsed.limit, parsed.cursor));
}

export async function localUpdateAdminUser(adminId: string, userId: string, input: unknown) {
  assertLocalAdmin(adminId);
  const parsed = adminUserUpdateSchema.parse(input);
  const user = assertFound(localState.users.find((item) => item.userId === userId), "User not found.");
  Object.assign(user, parsed, { updatedAt: nowIso() });
  syncListingOwnerContact(userId);
  recordAdminEvent(adminId, "user.update", {
    targetUserId: userId,
    role: user.role,
    accountStatus: user.accountStatus
  });
  return clone(user);
}

export async function localGetAdminListings(userId: string, query: unknown = {}) {
  assertLocalAdmin(userId);
  const parsed = adminListingListQuerySchema.parse(query);
  const search = parsed.query?.trim().toLowerCase() ?? "";
  const filtered = localState.listings
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

  return adminListingsListResponseSchema.parse(paginateList(clone(filtered), parsed.limit, parsed.cursor));
}

export async function localUpdateAdminListing(adminId: string, listingId: string, input: unknown) {
  assertLocalAdmin(adminId);
  const parsed = listingUpdateSchema.parse(input);
  const listing = assertFound(localState.listings.find((item) => item.listingId === listingId), "Listing not found.");
  Object.assign(listing, parsed, { updatedAt: nowIso() });
  recordAdminEvent(adminId, "listing.update", {
    listingId,
    status: listing.status
  });
  return clone(listing);
}

export async function localDeleteAdminListing(adminId: string, listingId: string) {
  assertLocalAdmin(adminId);
  localState.listings = localState.listings.filter((item) => item.listingId !== listingId);
  recordAdminEvent(adminId, "listing.delete", {
    listingId
  });
  return { success: true as const };
}

export async function localGetAdminAnalytics(userId: string): Promise<AdminAnalytics> {
  assertLocalAdmin(userId);
  return {
    totalUsers: localState.users.length,
    activeUsers: localState.users.filter((user) => user.accountStatus === "active").length,
    frozenUsers: localState.users.filter((user) => user.accountStatus === "frozen").length,
    removedUsers: localState.users.filter((user) => user.accountStatus === "removed").length,
    totalListings: localState.listings.length,
    publishedListings: localState.listings.filter((listing) => listing.status === "published").length,
    archivedListings: localState.listings.filter((listing) => listing.status === "archived").length,
    openReports: localState.reports.filter((report) => report.status === "open").length,
    reviewingReports: localState.reports.filter((report) => report.status === "reviewing").length,
    resolvedReports: localState.reports.filter((report) => report.status === "resolved").length,
    totalAdmins: localState.users.filter((user) => isAdminRole(user.role)).length
  };
}

export async function localGetAdminConversations(userId: string, query: unknown = {}) {
  assertLocalAdmin(userId);
  const parsed = adminConversationListQuerySchema.parse(query);
  const search = parsed.query?.trim().toLowerCase() ?? "";
  const filtered = localState.conversations
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

  return adminConversationsListResponseSchema.parse(paginateList(clone(filtered), parsed.limit, parsed.cursor));
}

export async function localDeleteAdminConversation(adminId: string, conversationId: string) {
  assertLocalAdmin(adminId);
  localState.conversations = localState.conversations.filter((item) => item.conversationId !== conversationId);
  recordAdminEvent(adminId, "conversation.delete", {
    conversationId
  });
  return { success: true as const };
}

export async function localGetAdminSubscriptions(userId: string, query: unknown = {}) {
  assertLocalAdmin(userId);
  const parsed = adminSubscriptionListQuerySchema.parse(query);
  const search = parsed.query?.trim().toLowerCase() ?? "";
  const filtered = localState.users
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

  return adminSubscriptionsListResponseSchema.parse(paginateList(clone(filtered), parsed.limit, parsed.cursor));
}

export async function localUpdateAdminSubscription(adminId: string, userId: string, input: unknown) {
  assertLocalAdmin(adminId);
  const parsed = adminSubscriptionUpdateSchema.parse(input);
  const user = assertFound(localState.users.find((item) => item.userId === userId), "User not found.");
  Object.assign(user, parsed, { updatedAt: nowIso() });
  recordAdminEvent(adminId, "subscription.update", {
    targetUserId: userId,
    subscriptionStatus: user.subscriptionStatus
  });
  return clone(user);
}

export async function localGetNotificationSettings(userId?: string) {
  if (userId) {
    assertLocalAdmin(userId);
  }
  return clone(localState.notificationSettings);
}

export async function localUpdateAdminNotificationSettings(adminId: string, input: unknown) {
  assertLocalAdmin(adminId);
  const parsed = notificationSettingsSchema.partial().parse(input);
  Object.assign(localState.notificationSettings, parsed, { updatedAt: nowIso() });
  recordAdminEvent(adminId, "notifications.update");
  return clone(localState.notificationSettings);
}

export async function localGetReports(userId: string, query: unknown = {}) {
  assertLocalAdmin(userId);
  const parsed = adminReportListQuerySchema.parse(query);
  const search = parsed.query?.trim().toLowerCase() ?? "";
  const filtered = localState.reports
    .filter((report) => {
      const queryPass = !search || report.reason.toLowerCase().includes(search);
      const statusPass = !parsed.status || report.status === parsed.status;
      const listingPass = !parsed.listingId || report.listingId === parsed.listingId;
      const userPass = !parsed.targetUserId || report.targetUserId === parsed.targetUserId;
      return queryPass && statusPass && listingPass && userPass;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return adminReportsListResponseSchema.parse(paginateList(clone(filtered), parsed.limit, parsed.cursor));
}

export async function localUpdateReport(adminId: string, reportId: string, input: unknown) {
  assertLocalAdmin(adminId);
  const parsed = reportUpdateSchema.parse(input);
  const report = assertFound(localState.reports.find((item) => item.reportId === reportId), "Report not found.");
  Object.assign(report, {
    status: parsed.status,
    resolutionNote: parsed.resolutionNote ?? null,
    updatedAt: nowIso()
  });
  recordAdminEvent(adminId, "report.update", {
    reportId,
    status: report.status,
    resolutionNote: report.resolutionNote
  });
  return clone(report);
}

export async function localCreateReport(userId: string, input: { listingId: string; targetUserId: string; reason: string }) {
  const report: Report = {
    reportId: randomUUID(),
    listingId: input.listingId,
    reporterId: userId,
    targetUserId: input.targetUserId,
    reason: input.reason,
    status: "open",
    resolutionNote: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  localState.reports.unshift(report);
  return clone(report);
}

export async function localGetAdminEvents(userId: string, query: unknown = {}) {
  assertLocalAdmin(userId);
  const parsed = adminEventListQuerySchema.parse(query);
  const filtered = localState.adminEvents
    .filter((event) => (!parsed.adminId || event.adminId === parsed.adminId) && (!parsed.action || event.action === parsed.action))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return adminEventsListResponseSchema.parse(paginateList(clone(filtered), parsed.limit, parsed.cursor));
}

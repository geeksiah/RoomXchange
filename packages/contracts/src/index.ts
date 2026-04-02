import { z } from "zod";

export const subscriptionStatuses = ["inactive", "active", "past_due", "expired", "cancelled"] as const;
export const listingStatuses = ["draft", "published", "archived"] as const;
export const reportStatuses = ["open", "reviewing", "resolved", "dismissed"] as const;
export const userRoles = ["member", "moderator", "admin", "super_admin"] as const;
export const accountStatuses = ["active", "frozen", "removed"] as const;
export const propertyTypes = ["room", "apartment"] as const;
export const listingSubtypes = ["studio", "single_room_sc", "one_bedroom", "two_bedroom_plus"] as const;
export const suggestedAmenities = [
  "Fast Wi-Fi",
  "Parking",
  "Kitchen",
  "Laundry",
  "Pool",
  "Workspace",
  "Heating",
  "A/C",
  "Pet friendly",
  "3D tour"
] as const;

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+[1-9]\d{7,14}|233\d{9}|0\d{9})$/, "Enter a valid phone number.");

export const emailSchema = z.string().trim().email();
export const passwordSchema = z.string().min(6).max(128);

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, emailSchema.optional());

const optionalUrlSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, z.string().url().optional());

const nullableUrlSchema = z.preprocess((value) => {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}, z.string().url().nullable().optional());

const optionalStringSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, z.string().trim().min(1).optional());

const nullableStringSchema = z.preprocess((value) => {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}, z.string().trim().min(1).nullable().optional());

const optionalNameSchema = optionalStringSchema.pipe(z.string().trim().min(2).max(80).optional());

const storedPropertyTypeSchema = z.preprocess((value) => value ?? "apartment", z.enum(propertyTypes));
export const cursorSchema = z.string().trim().min(1);
export const conversationIdSchema = z.string().trim().min(16).max(128);

export const otpRequestSchema = z.object({
  phone: phoneSchema,
  name: optionalNameSchema,
  email: optionalEmailSchema
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const authLoginSchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  password: passwordSchema
});

export const authRefreshSchema = z.object({
  refreshToken: z.string().trim().min(8)
});

export const authSignupRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: optionalEmailSchema,
  phone: phoneSchema,
  password: passwordSchema
});

export const authSignupVerifySchema = z.object({
  phone: phoneSchema,
  session: z.string().trim().min(8),
  code: z.string().trim().regex(/^\d{4,8}$/)
});

export const authPasswordResetRequestSchema = z.object({
  identifier: z.string().trim().min(3).max(160)
});

export const authPasswordResetVerifySchema = z.object({
  identifier: z.string().trim().min(3).max(160),
  session: z.string().trim().min(8),
  code: z.string().trim().regex(/^\d{4,8}$/),
  newPassword: passwordSchema
});

export const authChallengeResponseSchema = z.object({
  session: z.string(),
  destination: z.string()
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  session: z.string().trim().min(8),
  code: z.string().trim().regex(/^\d{4,8}$/),
  name: optionalNameSchema,
  email: optionalEmailSchema
});

export const amenitySchema = z.string().trim().min(2).max(32);

export const listingInputSchema = z.object({
  title: z.string().trim().min(8).max(120),
  propertyType: z.enum(propertyTypes).default("room"),
  listingSubtype: z.enum(listingSubtypes).optional(),
  price: z.number().positive().max(1_000_000),
  location: z.string().trim().min(3).max(160),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  images: z.array(z.string().url()).min(1).max(10),
  previewImage: z.string().url(),
  vrUrl: optionalUrlSchema,
  description: z.string().trim().min(20).max(3000),
  amenities: z.array(amenitySchema).max(12).default([]),
  mapboxPlaceId: optionalStringSchema.pipe(z.string().trim().min(3).max(160).optional()),
  status: z.enum(listingStatuses).default("published")
});

export const listingUpdateSchema = listingInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided.");

export const feedQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  query: z.string().trim().min(1).max(120).optional(),
  location: z.string().trim().min(2).max(120).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  propertyType: z.enum(propertyTypes).optional(),
  listingSubtypes: z
    .union([z.enum(listingSubtypes), z.array(z.enum(listingSubtypes)), z.string()])
    .optional()
    .transform((value) => {
      if (!value) {
        return [];
      }

      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value === "string" && value.includes(",")) {
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean) as (typeof listingSubtypes)[number][];
      }

      return [value as (typeof listingSubtypes)[number]];
    }),
  hasVr: z
    .union([z.boolean(), z.string().transform((value) => value === "true")])
    .optional(),
  amenities: z
    .union([amenitySchema, z.array(amenitySchema), z.string()])
    .optional()
    .transform((value) => {
      if (!value) {
        return [];
      }

      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value === "string" && value.includes(",")) {
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      return [value];
    })
});

export const uploadPresignSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileName: z.string().trim().min(3).max(120)
});

export const reportCreateSchema = z.object({
  listingId: z.string().trim().uuid(),
  targetUserId: z.string().trim().uuid(),
  reason: z.string().trim().min(10).max(500)
});

export const reportUpdateSchema = z.object({
  status: z.enum(reportStatuses),
  resolutionNote: z.string().trim().min(8).max(500).optional()
});

export const profileUpdateSchema = z.object({
  name: optionalNameSchema,
  avatar: optionalUrlSchema,
  email: optionalEmailSchema,
  phonePublic: z.boolean().optional()
});

export const adminUserUpdateSchema = z.object({
  name: optionalNameSchema,
  avatar: optionalUrlSchema,
  email: optionalEmailSchema,
  phonePublic: z.boolean().optional(),
  role: z.enum(userRoles).optional(),
  accountStatus: z.enum(accountStatuses).optional()
});

export const adminSubscriptionUpdateSchema = z.object({
  isSubscribed: z.boolean().optional(),
  subscriptionStatus: z.enum(subscriptionStatuses).optional(),
  subscriptionExpiresAt: z.string().nullable().optional(),
  subscriptionPlan: z.string().nullable().optional(),
  subscriptionProvider: z.string().nullable().optional()
});

export const subscriptionCheckoutSchema = z.object({
  email: optionalEmailSchema,
  successUrl: z.string().url().optional()
});

export const subscriptionVerifySchema = z.object({
  reference: z.string().trim().min(6),
  source: z.enum(["manual", "webhook"]).default("manual")
});

export const ownerContactSchema = z.object({
  name: z.string(),
  avatar: z.string().url().nullable(),
  phoneMasked: z.string(),
  phone: z.string().nullable(),
  canContact: z.boolean()
});

export const listingSchema = z.object({
  listingId: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  propertyType: storedPropertyTypeSchema,
  listingSubtype: z.enum(listingSubtypes).nullable(),
  price: z.number(),
  location: z.string(),
  lat: z.number(),
  lng: z.number(),
  images: z.array(z.string().url()),
  previewImage: z.string().url(),
  vrUrl: z.string().url().nullable(),
  description: z.string(),
  amenities: z.array(amenitySchema),
  mapboxPlaceId: z.string().nullable(),
  status: z.enum(listingStatuses),
  createdAt: z.string(),
  updatedAt: z.string(),
  ownerContact: ownerContactSchema
});

export const listingSummarySchema = z.object({
  listingId: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
  propertyType: storedPropertyTypeSchema,
  listingSubtype: z.enum(listingSubtypes).nullable(),
  price: z.number(),
  location: z.string(),
  lat: z.number(),
  lng: z.number(),
  previewImage: z.string().url(),
  vrUrl: z.string().url().nullable(),
  amenities: z.array(amenitySchema),
  createdAt: z.string()
});

export const userProfileSchema = z.object({
  userId: z.string().uuid(),
  phone: phoneSchema,
  name: z.string(),
  avatar: z.string().url().nullable(),
  email: emailSchema.nullable(),
  phonePublic: z.boolean(),
  role: z.enum(userRoles),
  accountStatus: z.enum(accountStatuses),
  isSubscribed: z.boolean(),
  subscriptionStatus: z.enum(subscriptionStatuses),
  subscriptionProvider: z.string().nullable(),
  subscriptionPlan: z.string().nullable(),
  subscriptionExpiresAt: z.string().nullable(),
  listingsCount: z.number().int().nonnegative(),
  successfulListings: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  idToken: z.string(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().int().positive()
});

export const authSessionSchema = z.object({
  user: userProfileSchema,
  tokens: authTokensSchema
});

export const feedResponseSchema = z.object({
  items: z.array(listingSummarySchema),
  nextCursor: z.string().nullable()
});

export const uploadPresignResponseSchema = z.object({
  uploadId: z.string().uuid(),
  key: z.string(),
  uploadUrl: z.string().url(),
  fileUrl: z.string().url(),
  headers: z.record(z.string(), z.string())
});

export const subscriptionStatusSchema = z.object({
  isSubscribed: z.boolean(),
  subscriptionStatus: z.enum(subscriptionStatuses),
  subscriptionExpiresAt: z.string().nullable(),
  provider: z.string().nullable(),
  plan: z.string().nullable()
});

export const checkoutLinkResponseSchema = z.object({
  authorizationUrl: z.string().url(),
  reference: z.string()
});

export const reportSchema = z.object({
  reportId: z.string().uuid(),
  listingId: z.string().uuid(),
  reporterId: z.string().uuid(),
  targetUserId: z.string().uuid(),
  reason: z.string(),
  status: z.enum(reportStatuses),
  resolutionNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const conversationParticipantSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  avatar: z.string().url().nullable()
});

export const conversationSummarySchema = z.object({
  conversationId: conversationIdSchema,
  listingId: z.string().uuid(),
  listingTitle: z.string(),
  listingPreviewImage: z.string().url(),
  participant: conversationParticipantSchema,
  lastMessagePreview: z.string(),
  lastMessageAt: z.string(),
  unreadCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const openConversationInputSchema = z.object({
  listingId: z.string().uuid()
});

export const conversationListResponseSchema = z.object({
  items: z.array(conversationSummarySchema)
});

export const conversationMutationResultSchema = z.object({
  success: z.literal(true)
});

export const adminAnalyticsSchema = z.object({
  totalUsers: z.number().int().nonnegative(),
  activeUsers: z.number().int().nonnegative(),
  frozenUsers: z.number().int().nonnegative(),
  removedUsers: z.number().int().nonnegative(),
  totalListings: z.number().int().nonnegative(),
  publishedListings: z.number().int().nonnegative(),
  archivedListings: z.number().int().nonnegative(),
  openReports: z.number().int().nonnegative(),
  reviewingReports: z.number().int().nonnegative(),
  resolvedReports: z.number().int().nonnegative(),
  totalAdmins: z.number().int().nonnegative()
});

export const adminConversationSchema = z.object({
  conversationId: conversationIdSchema,
  listingId: z.string().uuid(),
  listingTitle: z.string(),
  listingPreviewImage: z.string().url(),
  buyer: conversationParticipantSchema,
  owner: conversationParticipantSchema,
  lastMessagePreview: z.string(),
  lastMessageAt: z.string(),
  messageCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const adminUserListQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().trim().min(1).max(160).optional(),
  role: z.enum(userRoles).optional(),
  accountStatus: z.enum(accountStatuses).optional(),
  activity: z.enum(["has_listings", "no_listings", "subscribed"]).optional()
});

export const adminListingListQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().trim().min(1).max(160).optional(),
  status: z.enum(listingStatuses).optional(),
  ownerId: z.string().uuid().optional()
});

export const adminReportListQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().trim().min(1).max(160).optional(),
  status: z.enum(reportStatuses).optional(),
  listingId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional()
});

export const adminConversationListQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().trim().min(1).max(160).optional(),
  listingId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  buyerId: z.string().uuid().optional()
});

export const adminSubscriptionListQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().trim().min(1).max(160).optional(),
  subscriptionStatus: z.enum(subscriptionStatuses).optional(),
  isSubscribed: z
    .union([z.boolean(), z.string().transform((value) => value === "true")])
    .optional()
});

export const adminEventSchema = z.object({
  id: z.string().trim().min(1).max(200),
  adminId: z.string().uuid(),
  action: z.string().trim().min(1).max(80),
  createdAt: z.string(),
  targetUserId: z.string().uuid().nullable().optional(),
  listingId: z.string().uuid().nullable().optional(),
  conversationId: conversationIdSchema.nullable().optional(),
  reportId: z.string().uuid().nullable().optional(),
  role: z.enum(userRoles).nullable().optional(),
  accountStatus: z.enum(accountStatuses).nullable().optional(),
  subscriptionStatus: z.enum(subscriptionStatuses).nullable().optional(),
  status: z.string().trim().min(1).max(40).nullable().optional(),
  resolutionNote: z.string().trim().min(1).max(500).nullable().optional()
});

export const adminEventListQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().min(1).max(80).optional(),
  adminId: z.string().uuid().optional()
});

function createPaginatedListSchema<Item extends z.ZodTypeAny>(itemSchema: Item) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative()
  });
}

export const adminUsersListResponseSchema = createPaginatedListSchema(userProfileSchema);
export const adminListingsListResponseSchema = createPaginatedListSchema(listingSchema);
export const adminReportsListResponseSchema = createPaginatedListSchema(reportSchema);
export const adminConversationsListResponseSchema = createPaginatedListSchema(adminConversationSchema);
export const adminSubscriptionsListResponseSchema = createPaginatedListSchema(userProfileSchema);
export const adminEventsListResponseSchema = createPaginatedListSchema(adminEventSchema);

export const notificationSettingsSchema = z.object({
  pushEnabled: z.boolean(),
  messageNotificationsEnabled: z.boolean(),
  listingMatchNotificationsEnabled: z.boolean(),
  donationProvider: nullableStringSchema.pipe(z.string().trim().min(2).max(40).nullable().optional()).default("Paystack"),
  donationUrl: nullableUrlSchema.default(null),
  donationPresetAmounts: z.array(z.number().int().positive().max(100000)).min(1).max(5).default([50, 100, 200, 500, 1000]),
  updatedAt: z.string()
});

export const notificationKinds = ["message", "listing_match", "system"] as const;
export const pushPlatforms = ["ios", "android"] as const;

export const notificationRecordSchema = z.object({
  id: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(500),
  createdAt: z.string(),
  listingId: z.string().uuid().optional(),
  read: z.boolean(),
  kind: z.enum(notificationKinds)
});

export const reminderPreferenceSchema = z.object({
  id: z.string().trim().min(1).max(128),
  location: z.string().trim().min(2).max(120),
  propertyType: z.enum(["all", ...propertyTypes]),
  listingSubtypes: z.array(z.enum(listingSubtypes)).max(4),
  minBudget: z.number().min(0),
  maxBudget: z.number().min(0),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const reminderUpsertInputSchema = reminderPreferenceSchema
  .omit({ createdAt: true, updatedAt: true })
  .partial({ id: true });

export const notificationUpdateSchema = z.object({
  read: z.boolean()
});

export const pushTokenUpsertSchema = z.object({
  token: z.string().trim().min(8).max(256),
  platform: z.enum(pushPlatforms)
});

export const pushTokenDeleteSchema = z.object({
  token: z.string().trim().min(8).max(256)
});

export const notificationsListResponseSchema = z.object({
  items: z.array(notificationRecordSchema)
});

export const remindersListResponseSchema = z.object({
  items: z.array(reminderPreferenceSchema)
});

export const conversationMessageSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: conversationIdSchema,
  listingId: z.string().uuid(),
  senderId: z.string().uuid(),
  body: z.string(),
  createdAt: z.string()
});

export const conversationMessageListQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(60).default(30)
});

export const conversationMessageListResponseSchema = z.object({
  items: z.array(conversationMessageSchema),
  nextCursor: z.string().nullable()
});

export const sendConversationMessageInputSchema = z.object({
  body: z.string().trim().min(1).max(2000)
});

export const deleteConversationMessagesInputSchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(50)
});

export const realtimeEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message.sent"),
    conversation: conversationSummarySchema,
    message: conversationMessageSchema
  }),
  z.object({
    type: z.literal("notification.created"),
    notification: notificationRecordSchema
  }),
  z.object({
    type: z.literal("conversation.read"),
    conversationId: conversationIdSchema
  })
]);

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type AuthLoginInput = z.infer<typeof authLoginSchema>;
export type AuthRefreshInput = z.infer<typeof authRefreshSchema>;
export type AuthSignupRequestInput = z.infer<typeof authSignupRequestSchema>;
export type AuthSignupVerifyInput = z.infer<typeof authSignupVerifySchema>;
export type AuthPasswordResetRequestInput = z.infer<typeof authPasswordResetRequestSchema>;
export type AuthPasswordResetVerifyInput = z.infer<typeof authPasswordResetVerifySchema>;
export type AuthChallengeResponse = z.infer<typeof authChallengeResponseSchema>;
export type ListingInput = z.infer<typeof listingInputSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
export type UploadPresignInput = z.infer<typeof uploadPresignSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
export type AdminSubscriptionUpdateInput = z.infer<typeof adminSubscriptionUpdateSchema>;
export type SubscriptionCheckoutInput = z.infer<typeof subscriptionCheckoutSchema>;
export type SubscriptionVerifyInput = z.infer<typeof subscriptionVerifySchema>;
export type OwnerContact = z.infer<typeof ownerContactSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type ListingSummary = z.infer<typeof listingSummarySchema>;
export type FeedResponse = z.infer<typeof feedResponseSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type AdminAnalytics = z.infer<typeof adminAnalyticsSchema>;
export type AdminConversation = z.infer<typeof adminConversationSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminListingListQuery = z.infer<typeof adminListingListQuerySchema>;
export type AdminReportListQuery = z.infer<typeof adminReportListQuerySchema>;
export type AdminConversationListQuery = z.infer<typeof adminConversationListQuerySchema>;
export type AdminSubscriptionListQuery = z.infer<typeof adminSubscriptionListQuerySchema>;
export type AdminEvent = z.infer<typeof adminEventSchema>;
export type AdminEventListQuery = z.infer<typeof adminEventListQuerySchema>;
export type AdminUsersListResponse = z.infer<typeof adminUsersListResponseSchema>;
export type AdminListingsListResponse = z.infer<typeof adminListingsListResponseSchema>;
export type AdminReportsListResponse = z.infer<typeof adminReportsListResponseSchema>;
export type AdminConversationsListResponse = z.infer<typeof adminConversationsListResponseSchema>;
export type AdminSubscriptionsListResponse = z.infer<typeof adminSubscriptionsListResponseSchema>;
export type AdminEventsListResponse = z.infer<typeof adminEventsListResponseSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type UploadPresignResponse = z.infer<typeof uploadPresignResponseSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type CheckoutLinkResponse = z.infer<typeof checkoutLinkResponseSchema>;
export type Report = z.infer<typeof reportSchema>;
export type ConversationParticipant = z.infer<typeof conversationParticipantSchema>;
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export type OpenConversationInput = z.infer<typeof openConversationInputSchema>;
export type ConversationListResponse = z.infer<typeof conversationListResponseSchema>;
export type ConversationMutationResult = z.infer<typeof conversationMutationResultSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type ConversationMessageListQuery = z.infer<typeof conversationMessageListQuerySchema>;
export type ConversationMessageListResponse = z.infer<typeof conversationMessageListResponseSchema>;
export type DeleteConversationMessagesInput = z.infer<typeof deleteConversationMessagesInputSchema>;
export type SendConversationMessageInput = z.infer<typeof sendConversationMessageInputSchema>;
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type NotificationRecord = z.infer<typeof notificationRecordSchema>;
export type ReminderPreference = z.infer<typeof reminderPreferenceSchema>;
export type ReminderUpsertInput = z.infer<typeof reminderUpsertInputSchema>;
export type NotificationUpdateInput = z.infer<typeof notificationUpdateSchema>;
export type PushTokenUpsertInput = z.infer<typeof pushTokenUpsertSchema>;
export type PushTokenDeleteInput = z.infer<typeof pushTokenDeleteSchema>;
export type NotificationsListResponse = z.infer<typeof notificationsListResponseSchema>;
export type RemindersListResponse = z.infer<typeof remindersListResponseSchema>;

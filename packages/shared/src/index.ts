import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import {
  adminLoginSchema,
  authChallengeResponseSchema,
  authLoginSchema,
  authPasswordResetRequestSchema,
  authPasswordResetVerifySchema,
  authSignupRequestSchema,
  authSignupVerifySchema,
  adminConversationListQuerySchema,
  adminConversationsListResponseSchema,
  adminEventListQuerySchema,
  adminEventsListResponseSchema,
  adminEventSchema,
  adminAnalyticsSchema,
  adminConversationSchema,
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
  authSessionSchema,
  checkoutLinkResponseSchema,
  conversationListResponseSchema,
  conversationMutationResultSchema,
  conversationMessageListQuerySchema,
  conversationMessageListResponseSchema,
  conversationMessageSchema,
  deleteConversationMessagesInputSchema,
  feedResponseSchema,
  listingSchema,
  listingSummarySchema,
  listingUpdateSchema,
  notificationRecordSchema,
  notificationSettingsSchema,
  notificationUpdateSchema,
  otpRequestSchema,
  openConversationInputSchema,
  remindersListResponseSchema,
  reminderPreferenceSchema,
  reminderUpsertInputSchema,
  otpVerifySchema,
  profileUpdateSchema,
  pushTokenDeleteSchema,
  pushTokenUpsertSchema,
  realtimeEventSchema,
  reportCreateSchema,
  reportSchema,
  reportUpdateSchema,
  sendConversationMessageInputSchema,
  subscriptionCheckoutSchema,
  subscriptionStatusSchema,
  subscriptionVerifySchema,
  uploadPresignResponseSchema,
  uploadPresignSchema,
  userProfileSchema,
  type AuthSession,
  type AuthChallengeResponse,
  type AuthLoginInput,
  type AuthPasswordResetRequestInput,
  type AuthPasswordResetVerifyInput,
  type AuthSignupRequestInput,
  type AuthSignupVerifyInput,
  type AdminLoginInput,
  type AdminAnalytics,
  type AdminConversation,
  type AdminConversationListQuery,
  type AdminConversationsListResponse,
  type AdminEvent,
  type AdminEventListQuery,
  type AdminEventsListResponse,
  type AdminListingListQuery,
  type AdminListingsListResponse,
  type AdminSubscriptionUpdateInput,
  type AdminSubscriptionListQuery,
  type AdminSubscriptionsListResponse,
  type AdminUserListQuery,
  type AdminUsersListResponse,
  type AdminReportListQuery,
  type AdminReportsListResponse,
  type AdminUserUpdateInput,
  type CheckoutLinkResponse,
  type ConversationListResponse,
  type ConversationMessage,
  type ConversationMessageListQuery,
  type ConversationMessageListResponse,
  type ConversationMutationResult,
  type ConversationSummary,
  type DeleteConversationMessagesInput,
  type FeedQueryInput,
  type FeedResponse,
  type Listing,
  type ListingInput,
  type ListingSummary,
  type ListingUpdateInput,
  type NotificationRecord,
  type NotificationSettings,
  type NotificationUpdateInput,
  type NotificationsListResponse,
  type OtpRequestInput,
  type OtpVerifyInput,
  type OpenConversationInput,
  type ProfileUpdateInput,
  type PushTokenDeleteInput,
  type PushTokenUpsertInput,
  type RealtimeEvent,
  type Report,
  type ReportCreateInput,
  type ReportUpdateInput,
  type ReminderPreference,
  type ReminderUpsertInput,
  type RemindersListResponse,
  type SendConversationMessageInput,
  type SubscriptionCheckoutInput,
  type SubscriptionStatus,
  type SubscriptionVerifyInput,
  type UploadPresignInput,
  type UploadPresignResponse,
  type UserProfile,
  conversationSummarySchema,
  notificationsListResponseSchema
} from "@roomxchange/contracts";
import { z } from "zod";

const defaultConfig = {
  apiUrl: process.env.NEXT_PUBLIC_ROOMXCHANGE_API_URL ?? process.env.EXPO_PUBLIC_ROOMXCHANGE_API_URL ?? "",
  webUrl: process.env.NEXT_PUBLIC_ROOMXCHANGE_WEB_URL ?? process.env.EXPO_PUBLIC_ROOMXCHANGE_WEB_URL ?? "",
  mediaUrl:
    process.env.NEXT_PUBLIC_ROOMXCHANGE_MEDIA_URL ??
    process.env.EXPO_PUBLIC_ROOMXCHANGE_MEDIA_URL ??
    "https://media.roomxchange.com",
  mapboxToken:
    process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? "",
  socketUrl:
    process.env.NEXT_PUBLIC_ROOMXCHANGE_SOCKET_URL ??
    process.env.EXPO_PUBLIC_ROOMXCHANGE_SOCKET_URL ??
    ""
};

export type RoomXchangeConfig = typeof defaultConfig;
export const roomXchangeConfig = defaultConfig;

function resolveApiBaseUrl(override?: string) {
  if (override) {
    return override;
  }

  if (roomXchangeConfig.apiUrl) {
    return roomXchangeConfig.apiUrl;
  }

  if (
    typeof window !== "undefined" &&
    typeof window.location !== "undefined" &&
    typeof window.location.hostname === "string" &&
    window.location.hostname === "localhost"
  ) {
    return "http://localhost:4000";
  }

  return "";
}

export const designTokens = {
  colors: {
    background: "#F7F7F7",
    surface: "#FFFFFF",
    surfaceMuted: "#F7F7F7",
    text: "#111111",
    textMuted: "#6B7280",
    accent: "#FF385C",
    accentSoft: "#FFE8EE",
    border: "#EAEAEA",
    success: "#18794E",
    danger: "#B42318",
    shadow: "rgba(17, 17, 17, 0.08)"
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 24,
    pill: 999
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40
  }
} as const;

const currencyFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  currencyDisplay: "code",
  maximumFractionDigits: 0
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatMonthlyPrice(amount: number) {
  return `${formatCurrency(amount)}/mo`;
}

export function sanitizePhone(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  const digitsOnly = cleaned.replace(/[^\d]/g, "");

  if (/^0\d{9}$/.test(digitsOnly)) {
    return `+233${digitsOnly.slice(1)}`;
  }

  if (/^233\d{9}$/.test(digitsOnly)) {
    return `+${digitsOnly}`;
  }

  return cleaned;
}

export function maskPhone(phone: string) {
  if (phone.length < 6) {
    return phone;
  }

  return `${phone.slice(0, 4)} **** ${phone.slice(-2)}`;
}

const vrAllowList = ["poly.cam", "polycam.ai", "lumalabs.ai", "capture.lumalabs.ai"];

export function isAllowedVrUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && vrAllowList.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function buildSubscribeUrl(reference?: string) {
  const baseUrl =
    roomXchangeConfig.webUrl ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const url = new URL("/subscribe", baseUrl);
  if (reference) {
    url.searchParams.set("reference", reference);
  }
  return url.toString();
}

export function buildStaticMapUrl(lat: number, lng: number, zoom = 11) {
  if (!roomXchangeConfig.mapboxToken) {
    return null;
  }

  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-l+ff385c(${lng},${lat})/${lng},${lat},${zoom}/1200x700?access_token=${roomXchangeConfig.mapboxToken}`;
}

export function buildMapboxSearchUrl(query: string) {
  return `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=8&country=GH&language=en&access_token=${roomXchangeConfig.mapboxToken}`;
}

export function buildRealtimeUrl(accessToken: string) {
  if (!roomXchangeConfig.socketUrl) {
    return null;
  }

  const url = new URL(roomXchangeConfig.socketUrl);
  url.searchParams.set("token", accessToken);
  return url.toString();
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatConversationTimestamp(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-GH", { hour: "numeric", minute: "2-digit" }).format(date);
  }

  const dayDiff = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (dayDiff < 7) {
    return new Intl.DateTimeFormat("en-GH", { weekday: "short" }).format(date);
  }

  return new Intl.DateTimeFormat("en-GH", { day: "numeric", month: "short" }).format(date);
}

type ApiClientOptions = {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | null> | string | null;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  token?: string | null;
};

function parseApiError(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? fallback;
  }

  return fallback;
}

async function request<T>(
  path: string,
  schema: { parse: (input: unknown) => T },
  options: RequestOptions = {},
  client?: ApiClientOptions
) {
  const resolvedToken = options.token ?? (await client?.getAccessToken?.());
  const config: AxiosRequestConfig = {
    url: path,
    baseURL: resolveApiBaseUrl(client?.baseUrl),
    method: options.method ?? "GET",
    headers: {
      ...(resolvedToken ? { authorization: `Bearer ${resolvedToken}` } : {}),
      ...(options.body ? { "content-type": "application/json" } : {})
    },
    data: options.body,
    params: options.params
  };

  try {
    const response = await axios.request(config);
    return schema.parse(response.data);
  } catch (error) {
    throw new Error(parseApiError(error, "Request failed."));
  }
}

export function createApiClient(options: ApiClientOptions = {}) {
  const login = async (input: AuthLoginInput) => {
    authLoginSchema.parse(input);
    return request("/auth/login", authSessionSchema, { method: "POST", body: input }, options);
  };

  const requestSignup = async (input: AuthSignupRequestInput) => {
    authSignupRequestSchema.parse(input);
    return request("/auth/signup/request", authChallengeResponseSchema, { method: "POST", body: input }, options);
  };

  const verifySignup = async (input: AuthSignupVerifyInput) => {
    authSignupVerifySchema.parse(input);
    return request("/auth/signup/verify", conversationMutationResultSchema, { method: "POST", body: input }, options);
  };

  const requestPasswordReset = async (input: AuthPasswordResetRequestInput) => {
    authPasswordResetRequestSchema.parse(input);
    return request("/auth/password-reset/request", authChallengeResponseSchema, { method: "POST", body: input }, options);
  };

  const verifyPasswordReset = async (input: AuthPasswordResetVerifyInput) => {
    authPasswordResetVerifySchema.parse(input);
    return request("/auth/password-reset/verify", conversationMutationResultSchema, { method: "POST", body: input }, options);
  };

  const requestOtp = async (input: OtpRequestInput) => {
    otpRequestSchema.parse(input);
    return request(
      "/auth/request-otp",
      z.object({ session: z.string(), challengeName: z.string() }),
      { method: "POST", body: input },
      options
    );
  };

  return {
    adminLogin(input: AdminLoginInput) {
      adminLoginSchema.parse(input);
      return request("/admin/auth/login", authSessionSchema, { method: "POST", body: input }, options);
    },
    login,
    requestSignup,
    verifySignup,
    requestPasswordReset,
    verifyPasswordReset,
    requestOtp,
    requestOtpChallenge(input: OtpRequestInput) {
      return requestOtp(input);
    },
    async verifyOtp(input: OtpVerifyInput) {
      otpVerifySchema.parse(input);
      return request("/auth/verify-otp", authSessionSchema, { method: "POST", body: input }, options);
    },
    getMe() {
      return request("/auth/me", userProfileSchema, {}, options);
    },
    updateProfile(input: ProfileUpdateInput) {
      profileUpdateSchema.parse(input);
      return request("/auth/me", userProfileSchema, { method: "PATCH", body: input }, options);
    },
    getFeed(query: Partial<FeedQueryInput> = {}) {
      const params = Object.fromEntries(
        Object.entries(query).flatMap(([key, value]) => {
          if (Array.isArray(value)) {
            return [[key, value.join(",")]];
          }
          return [[key, value as string | number | boolean | undefined | null]];
        })
      );

      return request("/listings/feed", feedResponseSchema, { params }, options);
    },
    getListing(listingId: string) {
      return request(`/listings/${listingId}`, listingSchema, {}, options);
    },
    getUserListings(userId: string) {
      return request(`/listings/user/${userId}`, z.array(listingSummarySchema), {}, options);
    },
    createListing(input: ListingInput) {
      return request("/listings/create", listingSchema, { method: "POST", body: input }, options);
    },
    updateListing(listingId: string, input: ListingUpdateInput) {
      return request(`/listings/${listingId}`, listingSchema, { method: "PATCH", body: input }, options);
    },
    async deleteListing(listingId: string) {
      await request(`/listings/${listingId}`, z.any(), { method: "DELETE" }, options);
    },
    createUpload(input: UploadPresignInput) {
      uploadPresignSchema.parse(input);
      return request("/uploads/presign", uploadPresignResponseSchema, { method: "POST", body: input }, options);
    },
    getSubscriptionStatus() {
      return request("/subscription/status", subscriptionStatusSchema, {}, options);
    },
    createCheckoutLink(input: SubscriptionCheckoutInput = {}) {
      subscriptionCheckoutSchema.parse(input);
      return request("/subscription/checkout-link", checkoutLinkResponseSchema, { method: "POST", body: input }, options);
    },
    verifySubscription(input: SubscriptionVerifyInput) {
      subscriptionVerifySchema.parse(input);
      return request("/subscription/verify", subscriptionStatusSchema, { method: "POST", body: input }, options);
    },
    createReport(input: ReportCreateInput) {
      reportCreateSchema.parse(input);
      return request("/reports/create", reportSchema, { method: "POST", body: input }, options);
    },
    getMyReports() {
      return request("/reports/mine", z.array(reportSchema), {}, options);
    },
    getAdminReports(query: Partial<AdminReportListQuery> = {}) {
      const params = adminReportListQuerySchema.partial().parse(query);
      return request("/admin/reports", adminReportsListResponseSchema, { params }, options);
    },
    updateAdminReport(reportId: string, input: ReportUpdateInput) {
      reportUpdateSchema.parse(input);
      return request(`/admin/reports/${reportId}`, reportSchema, { method: "PATCH", body: input }, options);
    },
    getAdminUsers(query: Partial<AdminUserListQuery> = {}) {
      const params = adminUserListQuerySchema.partial().parse(query);
      return request("/admin/users", adminUsersListResponseSchema, { params }, options);
    },
    updateAdminUser(userId: string, input: AdminUserUpdateInput) {
      adminUserUpdateSchema.parse(input);
      return request(`/admin/users/${userId}`, userProfileSchema, { method: "PATCH", body: input }, options);
    },
    getAdminListings(query: Partial<AdminListingListQuery> = {}) {
      const params = adminListingListQuerySchema.partial().parse(query);
      return request("/admin/listings", adminListingsListResponseSchema, { params }, options);
    },
    updateAdminListing(listingId: string, input: ListingUpdateInput) {
      listingUpdateSchema.parse(input);
      return request(`/admin/listings/${listingId}`, listingSchema, { method: "PATCH", body: input }, options);
    },
    async deleteAdminListing(listingId: string) {
      await request(`/admin/listings/${listingId}`, z.any(), { method: "DELETE" }, options);
    },
    getAdminAnalytics() {
      return request("/admin/analytics", adminAnalyticsSchema, {}, options);
    },
    getAdminConversations(query: Partial<AdminConversationListQuery> = {}) {
      const params = adminConversationListQuerySchema.partial().parse(query);
      return request("/admin/conversations", adminConversationsListResponseSchema, { params }, options);
    },
    async deleteAdminConversation(conversationId: string) {
      await request(`/admin/conversations/${conversationId}`, conversationMutationResultSchema, { method: "DELETE" }, options);
    },
    getAdminSubscriptions(query: Partial<AdminSubscriptionListQuery> = {}) {
      const params = adminSubscriptionListQuerySchema.partial().parse(query);
      return request("/admin/subscriptions", adminSubscriptionsListResponseSchema, { params }, options);
    },
    updateAdminSubscription(userId: string, input: AdminSubscriptionUpdateInput) {
      adminSubscriptionUpdateSchema.parse(input);
      return request(`/admin/subscriptions/${userId}`, userProfileSchema, { method: "PATCH", body: input }, options);
    },
    getNotificationSettings() {
      return request("/app/notification-settings", notificationSettingsSchema, {}, options);
    },
    getNotifications() {
      return request("/app/notifications", notificationsListResponseSchema, {}, options);
    },
    updateNotification(notificationId: string, input: NotificationUpdateInput) {
      notificationUpdateSchema.parse(input);
      return request(`/app/notifications/${notificationId}`, notificationRecordSchema, { method: "PATCH", body: input }, options);
    },
    markAllNotificationsRead() {
      return request("/app/notifications/read-all", conversationMutationResultSchema, { method: "POST" }, options);
    },
    deleteNotification(notificationId: string) {
      return request(`/app/notifications/${notificationId}`, conversationMutationResultSchema, { method: "DELETE" }, options);
    },
    clearNotifications() {
      return request("/app/notifications/clear", conversationMutationResultSchema, { method: "POST" }, options);
    },
    getReminders() {
      return request("/app/reminders", remindersListResponseSchema, {}, options);
    },
    upsertReminder(input: ReminderUpsertInput) {
      reminderUpsertInputSchema.parse(input);
      return request("/app/reminders", reminderPreferenceSchema, { method: "POST", body: input }, options);
    },
    updateReminder(reminderId: string, input: ReminderUpsertInput) {
      reminderUpsertInputSchema.parse(input);
      return request(`/app/reminders/${reminderId}`, reminderPreferenceSchema, { method: "PATCH", body: input }, options);
    },
    deleteReminder(reminderId: string) {
      return request(`/app/reminders/${reminderId}`, conversationMutationResultSchema, { method: "DELETE" }, options);
    },
    registerPushToken(input: PushTokenUpsertInput) {
      pushTokenUpsertSchema.parse(input);
      return request("/app/push-token/register", conversationMutationResultSchema, { method: "POST", body: input }, options);
    },
    unregisterPushToken(input: PushTokenDeleteInput) {
      pushTokenDeleteSchema.parse(input);
      return request("/app/push-token/unregister", conversationMutationResultSchema, { method: "POST", body: input }, options);
    },
    getAdminNotificationSettings() {
      return request("/admin/notifications/settings", notificationSettingsSchema, {}, options);
    },
    getAdminEvents(query: Partial<AdminEventListQuery> = {}) {
      const params = adminEventListQuerySchema.partial().parse(query);
      return request("/admin/events", adminEventsListResponseSchema, { params }, options);
    },
    updateAdminNotificationSettings(input: Partial<NotificationSettings>) {
      return request("/admin/notifications/settings", notificationSettingsSchema, { method: "PATCH", body: input }, options);
    },
    openConversation(input: OpenConversationInput) {
      openConversationInputSchema.parse(input);
      return request("/conversations/open", conversationSummarySchema, { method: "POST", body: input }, options);
    },
    getConversations() {
      return request("/conversations", conversationListResponseSchema, {}, options);
    },
    markAllConversationsRead() {
      return request("/conversations/read-all", conversationMutationResultSchema, { method: "POST" }, options);
    },
    deleteConversation(conversationId: string) {
      return request(`/conversations/${conversationId}`, conversationMutationResultSchema, { method: "DELETE" }, options);
    },
    getConversationMessages(conversationId: string, query: Partial<ConversationMessageListQuery> = {}) {
      const params = conversationMessageListQuerySchema.partial().parse(query);
      return request(`/conversations/${conversationId}/messages`, conversationMessageListResponseSchema, { params }, options);
    },
    sendConversationMessage(conversationId: string, input: SendConversationMessageInput) {
      sendConversationMessageInputSchema.parse(input);
      return request(`/conversations/${conversationId}/messages`, conversationMessageSchema, { method: "POST", body: input }, options);
    },
    deleteConversationMessages(conversationId: string, input: DeleteConversationMessagesInput) {
      deleteConversationMessagesInputSchema.parse(input);
      return request(`/conversations/${conversationId}/messages/delete`, conversationMutationResultSchema, { method: "POST", body: input }, options);
    }
  };
}

export const amenityLabels: Record<string, string> = {
  wifi: "Fast Wi-Fi",
  parking: "Parking",
  kitchen: "Kitchen",
  laundry: "Laundry",
  pool: "Pool",
  workspace: "Workspace",
  heating: "Heating",
  air_conditioning: "A/C",
  pet_friendly: "Pet friendly",
  vr_ready: "3D tour"
};

export const listingSubtypeLabels: Record<string, string> = {
  studio: "Studio",
  single_room_sc: "Single Room SC",
  one_bedroom: "1 Bedroom",
  two_bedroom_plus: "2 Bedroom+"
};

export function formatAmenityLabel(value: string) {
  const mapped = amenityLabels[value];
  if (mapped) {
    return mapped;
  }

  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatListingSubtypeLabel(value: string) {
  return listingSubtypeLabels[value] ?? value;
}

export function parseRealtimeEvent(value: unknown): RealtimeEvent {
  return realtimeEventSchema.parse(value);
}

export type {
  AdminLoginInput,
  AuthChallengeResponse,
  AuthLoginInput,
  AuthPasswordResetRequestInput,
  AuthPasswordResetVerifyInput,
  AuthSignupRequestInput,
  AuthSignupVerifyInput,
  AuthSession,
  AdminConversation,
  AdminConversationListQuery,
  AdminConversationsListResponse,
  AdminEvent,
  AdminEventListQuery,
  AdminEventsListResponse,
  AdminListingListQuery,
  AdminListingsListResponse,
  AdminReportListQuery,
  AdminReportsListResponse,
  AdminSubscriptionListQuery,
  AdminSubscriptionUpdateInput,
  AdminSubscriptionsListResponse,
  AdminUserListQuery,
  AdminUsersListResponse,
  AdminUserUpdateInput,
  CheckoutLinkResponse,
  ConversationListResponse,
  ConversationMessage,
  ConversationMessageListQuery,
  ConversationMessageListResponse,
  ConversationSummary,
  FeedQueryInput,
  FeedResponse,
  Listing,
  ListingInput,
  ListingSummary,
  ListingUpdateInput,
  NotificationSettings,
  NotificationRecord,
  NotificationUpdateInput,
  NotificationsListResponse,
  OtpRequestInput,
  OtpVerifyInput,
  ProfileUpdateInput,
  PushTokenDeleteInput,
  PushTokenUpsertInput,
  RealtimeEvent,
  Report,
  ReportCreateInput,
  ReportUpdateInput,
  ReminderPreference,
  ReminderUpsertInput,
  RemindersListResponse,
  SendConversationMessageInput,
  SubscriptionCheckoutInput,
  SubscriptionStatus,
  SubscriptionVerifyInput,
  UploadPresignInput,
  UploadPresignResponse,
  UserProfile
};

import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { z } from "zod";
import {
  authChallengeResponseSchema,
  authLoginSchema,
  authPasswordResetRequestSchema,
  authPasswordResetVerifySchema,
  authSessionSchema,
  authSignupRequestSchema,
  authSignupVerifySchema,
  checkoutLinkResponseSchema,
  conversationListResponseSchema,
  conversationMessageListQuerySchema,
  conversationMessageListResponseSchema,
  conversationMessageSchema,
  conversationMutationResultSchema,
  conversationSummarySchema,
  deleteConversationMessagesInputSchema,
  feedResponseSchema,
  listingSchema,
  listingSummarySchema,
  listingUpdateSchema,
  notificationRecordSchema,
  notificationSettingsSchema,
  notificationUpdateSchema,
  notificationsListResponseSchema,
  openConversationInputSchema,
  profileUpdateSchema,
  pushTokenDeleteSchema,
  pushTokenUpsertSchema,
  realtimeEventSchema,
  reminderPreferenceSchema,
  remindersListResponseSchema,
  reminderUpsertInputSchema,
  reportCreateSchema,
  reportSchema,
  sendConversationMessageInputSchema,
  subscriptionCheckoutSchema,
  subscriptionStatusSchema,
  subscriptionVerifySchema,
  uploadPresignResponseSchema,
  uploadPresignSchema,
  userProfileSchema,
  type AuthChallengeResponse,
  type AuthLoginInput,
  type AuthPasswordResetRequestInput,
  type AuthPasswordResetVerifyInput,
  type AuthSession,
  type AuthSignupRequestInput,
  type AuthSignupVerifyInput,
  type CheckoutLinkResponse,
  type ConversationListResponse,
  type ConversationMessageListQuery,
  type ConversationMessageListResponse,
  type FeedQueryInput,
  type FeedResponse,
  type Listing,
  type ListingInput,
  type ListingSummary,
  type ListingUpdateInput,
  type NotificationRecord,
  type NotificationsListResponse,
  type NotificationSettings,
  type NotificationUpdateInput,
  type OpenConversationInput,
  type ProfileUpdateInput,
  type PushTokenDeleteInput,
  type PushTokenUpsertInput,
  type RealtimeEvent,
  type ReminderPreference,
  type RemindersListResponse,
  type Report,
  type ReportCreateInput,
  type SendConversationMessageInput,
  type SubscriptionCheckoutInput,
  type SubscriptionStatus,
  type SubscriptionVerifyInput,
  type UploadPresignInput,
  type UploadPresignResponse,
  type UserProfile
} from "@roomxchange/contracts";

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

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:4000";
  }

  return "";
}

export function buildRealtimeUrl(accessToken: string) {
  if (!roomXchangeConfig.socketUrl) {
    return null;
  }

  const url = new URL(roomXchangeConfig.socketUrl);
  url.searchParams.set("token", accessToken);
  return url.toString();
}

export function parseRealtimeEvent(value: unknown): RealtimeEvent {
  return realtimeEventSchema.parse(value);
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

export function createMobileApiClient(options: ApiClientOptions = {}) {
  return {
    login(input: AuthLoginInput) {
      authLoginSchema.parse(input);
      return request("/auth/login", authSessionSchema, { method: "POST", body: input }, options);
    },
    requestSignup(input: AuthSignupRequestInput) {
      authSignupRequestSchema.parse(input);
      return request("/auth/signup/request", authChallengeResponseSchema, { method: "POST", body: input }, options);
    },
    verifySignup(input: AuthSignupVerifyInput) {
      authSignupVerifySchema.parse(input);
      return request("/auth/signup/verify", conversationMutationResultSchema, { method: "POST", body: input }, options);
    },
    requestPasswordReset(input: AuthPasswordResetRequestInput) {
      authPasswordResetRequestSchema.parse(input);
      return request("/auth/password-reset/request", authChallengeResponseSchema, { method: "POST", body: input }, options);
    },
    verifyPasswordReset(input: AuthPasswordResetVerifyInput) {
      authPasswordResetVerifySchema.parse(input);
      return request("/auth/password-reset/verify", conversationMutationResultSchema, { method: "POST", body: input }, options);
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
      listingUpdateSchema.parse(input);
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

export type {
  AuthChallengeResponse,
  AuthLoginInput,
  AuthPasswordResetRequestInput,
  AuthPasswordResetVerifyInput,
  AuthSession,
  AuthSignupRequestInput,
  AuthSignupVerifyInput,
  CheckoutLinkResponse,
  ConversationListResponse,
  ConversationMessageListQuery,
  ConversationMessageListResponse,
  FeedQueryInput,
  FeedResponse,
  Listing,
  ListingInput,
  ListingSummary,
  ListingUpdateInput,
  NotificationRecord,
  NotificationsListResponse,
  NotificationSettings,
  NotificationUpdateInput,
  OpenConversationInput,
  ProfileUpdateInput,
  PushTokenDeleteInput,
  PushTokenUpsertInput,
  RealtimeEvent,
  ReminderPreference,
  RemindersListResponse,
  Report,
  ReportCreateInput,
  SendConversationMessageInput,
  SubscriptionCheckoutInput,
  SubscriptionStatus,
  SubscriptionVerifyInput,
  UploadPresignInput,
  UploadPresignResponse,
  UserProfile
};

import type {
  ConversationMessage,
  ConversationSummary,
  Listing,
  ListingSummary,
  NotificationRecord,
  ReminderPreference,
  Report,
  SubscriptionStatus,
  UserProfile
} from "@roomxchange/contracts";

export type UserItem = UserProfile & {
  PK: string;
  SK: string;
  entity: "USER";
  cognitoUsername?: string | null;
  paystackCustomerCode?: string | null;
  paystackSubscriptionCode?: string | null;
  GSI2PK?: string;
  GSI2SK?: string;
};

export type PendingSignupItem = {
  PK: string;
  SK: string;
  entity: "PENDING_SIGNUP";
  sessionId: string;
  userId: string;
  cognitoUsername: string;
  phone: string;
  email: string;
  name: string;
  code: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PendingPasswordResetItem = {
  PK: string;
  SK: string;
  entity: "PASSWORD_RESET";
  sessionId: string;
  userId: string;
  cognitoUsername: string;
  phone: string;
  identifier: string;
  code: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ListingItem = Omit<Listing, "ownerContact"> & {
  PK: string;
  SK: string;
  entity: "LISTING";
};

export type ListingLookupItem = Omit<Listing, "ownerContact"> & {
  PK: string;
  SK: string;
  entity: "LISTING_LOOKUP";
};

export type ListingFeedItem = ListingSummary & {
  PK: string;
  SK: string;
  entity: "LISTING_INDEX";
};

export type ReportItem = Report & {
  PK: string;
  SK: string;
  entity: "REPORT";
  GSI1PK: string;
  GSI1SK: string;
};

export type UserReportItem = Report & {
  PK: string;
  SK: string;
  entity: "USER_REPORT";
};

export type ConversationItem = {
  PK: string;
  SK: string;
  entity: "CONVERSATION";
  conversationId: string;
  listingId: string;
  listingTitle: string;
  listingPreviewImage: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string | null;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ConversationMessageItem = ConversationMessage & {
  PK: string;
  SK: string;
  entity: "CONVERSATION_MESSAGE";
};

export type UserConversationItem = Omit<ConversationSummary, "participant"> & {
  PK: string;
  SK: string;
  entity: "USER_CONVERSATION";
  userId: string;
  participantId: string;
  participantName: string;
  participantAvatar: string | null;
  hiddenMessageIds?: string[];
  GSI3PK: string;
  GSI3SK: string;
};

export type NotificationSettingsItem = {
  PK: string;
  SK: string;
  entity: "APP_NOTIFICATION_SETTINGS";
  pushEnabled: boolean;
  messageNotificationsEnabled: boolean;
  listingMatchNotificationsEnabled: boolean;
  donationProvider: string | null;
  donationUrl: string | null;
  donationPresetAmounts: number[];
  updatedAt: string;
};

export type UserNotificationItem = NotificationRecord & {
  PK: string;
  SK: string;
  entity: "USER_NOTIFICATION";
  userId: string;
  sourceKey?: string | null;
};

export type UserReminderItem = ReminderPreference & {
  PK: string;
  SK: string;
  entity: "USER_REMINDER";
  userId: string;
};

export type UserPushTokenItem = {
  PK: string;
  SK: string;
  entity: "USER_PUSH_TOKEN";
  userId: string;
  token: string;
  platform: "ios" | "android";
  createdAt: string;
  updatedAt: string;
};

export type PushTokenLookupItem = {
  PK: string;
  SK: string;
  entity: "PUSH_TOKEN_LOOKUP";
  userId: string;
  token: string;
  platform: "ios" | "android";
  createdAt: string;
  updatedAt: string;
};

export type UserSocketItem = {
  PK: string;
  SK: string;
  entity: "SOCKET_CONNECTION";
  userId: string;
  connectionId: string;
  connectedAt: string;
};

export type SocketLookupItem = {
  PK: string;
  SK: string;
  entity: "SOCKET_LOOKUP";
  userId: string;
  connectionId: string;
  connectedAt: string;
};

export type SubscriptionItem = SubscriptionStatus & {
  PK: string;
  SK: string;
  entity: "SUBSCRIPTION";
  providerCode?: string | null;
  customerCode?: string | null;
  reference?: string | null;
  updatedAt: string;
  createdAt: string;
};

export type PaymentEventItem = {
  PK: string;
  SK: string;
  entity: "PAYMENT_EVENT";
  reference: string;
  userId: string;
  status: string;
  source: string;
  amount?: number | null;
  raw: unknown;
  createdAt: string;
};

export type UploadItem = {
  PK: string;
  SK: string;
  entity: "UPLOAD";
  uploadId: string;
  userId: string;
  key: string;
  fileUrl: string;
  contentType: string;
  status: "pending" | "completed" | "deleted";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  GSI2PK: string;
  GSI2SK: string;
};

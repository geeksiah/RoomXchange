export const tableKeys = {
  user: (userId: string) => ({ PK: `USER#${userId}`, SK: "PROFILE" }),
  listing: (userId: string, listingId: string) => ({ PK: `USER#${userId}`, SK: `LISTING#${listingId}` }),
  listingLookup: (listingId: string) => ({ PK: `LISTING#${listingId}`, SK: "META" }),
  listingFeed: (createdAt: string, userId: string, listingId: string) => ({
    PK: "LISTING",
    SK: `CREATED_AT#${createdAt}#USER#${userId}#LISTING#${listingId}`
  }),
  subscription: (userId: string) => ({ PK: `USER#${userId}`, SK: "SUBSCRIPTION#CURRENT" }),
  report: (reportId: string) => ({ PK: `REPORT#${reportId}`, SK: "META" }),
  userReport: (userId: string, reportId: string) => ({ PK: `USER#${userId}`, SK: `REPORT#${reportId}` }),
  userNotification: (userId: string, notificationId: string) => ({ PK: `USER#${userId}`, SK: `NOTIFICATION#${notificationId}` }),
  userReminder: (userId: string, reminderId: string) => ({ PK: `USER#${userId}`, SK: `REMINDER#${reminderId}` }),
  pendingSignup: (sessionId: string) => ({ PK: "AUTH#PENDING_SIGNUP", SK: `SESSION#${sessionId}` }),
  pendingPasswordReset: (sessionId: string) => ({ PK: "AUTH#PASSWORD_RESET", SK: `SESSION#${sessionId}` }),
  conversation: (conversationId: string) => ({ PK: `CONVERSATION#${conversationId}`, SK: "META" }),
  conversationMessage: (conversationId: string, createdAt: string, messageId: string) => ({
    PK: `CONVERSATION#${conversationId}`,
    SK: `MESSAGE#${createdAt}#${messageId}`
  }),
  userConversation: (userId: string, conversationId: string) => ({ PK: `USER#${userId}`, SK: `CONVERSATION#${conversationId}` }),
  userSocket: (userId: string, connectionId: string) => ({ PK: `USER#${userId}`, SK: `SOCKET#${connectionId}` }),
  socketLookup: (connectionId: string) => ({ PK: `SOCKET#${connectionId}`, SK: "META" }),
  paymentCurrent: (reference: string) => ({ PK: `PAYMENT#${reference}`, SK: "LATEST" }),
  paymentEvent: (reference: string, timestamp: string) => ({ PK: `PAYMENT#${reference}`, SK: `EVENT#${timestamp}` }),
  upload: (userId: string, uploadId: string) => ({ PK: `USER#${userId}`, SK: `UPLOAD#${uploadId}` }),
  adminEvent: (adminId: string, timestamp: string) => ({ PK: `ADMIN#${adminId}`, SK: `EVENT#${timestamp}` }),
  appSetting: (name: string) => ({ PK: "APP_SETTINGS", SK: name })
} as const;

export function subscriptionOperationalIndex(status: string, expiresAt: string | null, userId: string) {
  if (status === "active" && expiresAt) {
    return {
      GSI2PK: "SUBSCRIPTION_STATUS#ACTIVE",
      GSI2SK: `EXPIRES_AT#${expiresAt}#USER#${userId}`
    };
  }

  return {
    GSI2PK: `SUBSCRIPTION_STATUS#${status.toUpperCase()}`,
    GSI2SK: `UPDATED_AT#${new Date().toISOString()}#USER#${userId}`
  };
}

export function uploadOperationalIndex(status: string, expiresAt: string, uploadId: string) {
  return {
    GSI2PK: `UPLOAD_STATUS#${status.toUpperCase()}`,
    GSI2SK: `EXPIRES_AT#${expiresAt}#UPLOAD#${uploadId}`
  };
}

export function conversationInboxIndex(userId: string, updatedAt: string, conversationId: string) {
  return {
    GSI3PK: `USER_CONVERSATION#${userId}`,
    GSI3SK: `UPDATED_AT#${updatedAt}#CONVERSATION#${conversationId}`
  };
}

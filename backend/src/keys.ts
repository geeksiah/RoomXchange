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
  paymentCurrent: (reference: string) => ({ PK: `PAYMENT#${reference}`, SK: "LATEST" }),
  paymentEvent: (reference: string, timestamp: string) => ({ PK: `PAYMENT#${reference}`, SK: `EVENT#${timestamp}` }),
  upload: (userId: string, uploadId: string) => ({ PK: `USER#${userId}`, SK: `UPLOAD#${uploadId}` }),
  adminEvent: (adminId: string, timestamp: string) => ({ PK: `ADMIN#${adminId}`, SK: `EVENT#${timestamp}` })
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

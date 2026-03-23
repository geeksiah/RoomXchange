import type { Listing, ListingSummary, Report, SubscriptionStatus, UserProfile } from "@roomxchange/contracts";

export type UserItem = UserProfile & {
  PK: string;
  SK: string;
  entity: "USER";
  paystackCustomerCode?: string | null;
  paystackSubscriptionCode?: string | null;
  GSI2PK?: string;
  GSI2SK?: string;
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

import { z } from "zod";

export const subscriptionStatuses = ["inactive", "active", "past_due", "expired", "cancelled"] as const;
export const listingStatuses = ["draft", "published", "archived"] as const;
export const reportStatuses = ["open", "reviewing", "resolved", "dismissed"] as const;
export const userRoles = ["member", "admin"] as const;

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone number must be in E.164 format.");

export const emailSchema = z.string().trim().email();

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

const optionalStringSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}, z.string().trim().min(1).optional());

const optionalNameSchema = optionalStringSchema.pipe(z.string().trim().min(2).max(80).optional());

export const cursorSchema = z.string().trim().min(1);

export const otpRequestSchema = z.object({
  phone: phoneSchema,
  name: optionalNameSchema,
  email: optionalEmailSchema
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  session: z.string().trim().min(8),
  code: z.string().trim().regex(/^\d{4,8}$/),
  name: optionalNameSchema,
  email: optionalEmailSchema
});

export const amenitySchema = z.enum([
  "wifi",
  "parking",
  "kitchen",
  "laundry",
  "pool",
  "workspace",
  "heating",
  "air_conditioning",
  "pet_friendly",
  "vr_ready"
]);

export const listingInputSchema = z.object({
  title: z.string().trim().min(8).max(120),
  price: z.number().positive().max(1_000_000),
  location: z.string().trim().min(3).max(160),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  images: z.array(z.string().url()).min(1).max(12),
  previewImage: z.string().url(),
  vrUrl: optionalUrlSchema,
  description: z.string().trim().min(40).max(3000),
  amenities: z.array(amenitySchema).max(12).default([]),
  mapboxPlaceId: optionalStringSchema.pipe(z.string().trim().min(3).max(160).optional()),
  status: z.enum(listingStatuses).default("published")
});

export const listingUpdateSchema = listingInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided."
);

export const feedQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  location: z.string().trim().min(2).max(120).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
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
          .filter(Boolean) as Array<z.infer<typeof amenitySchema>>;
      }

      return [value as z.infer<typeof amenitySchema>];
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
  email: optionalEmailSchema
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
  phoneMasked: z.string(),
  phone: z.string().nullable(),
  canContact: z.boolean()
});

export const listingSchema = z.object({
  listingId: z.string().uuid(),
  ownerId: z.string().uuid(),
  title: z.string(),
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

export const listingSummarySchema = listingSchema.pick({
  listingId: true,
  ownerId: true,
  title: true,
  price: true,
  location: true,
  lat: true,
  lng: true,
  previewImage: true,
  vrUrl: true,
  amenities: true,
  createdAt: true
});

export const userProfileSchema = z.object({
  userId: z.string().uuid(),
  phone: phoneSchema,
  name: z.string(),
  avatar: z.string().url().nullable(),
  email: emailSchema.nullable(),
  role: z.enum(userRoles),
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

export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type ListingInput = z.infer<typeof listingInputSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
export type UploadPresignInput = z.infer<typeof uploadPresignSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export type ReportUpdateInput = z.infer<typeof reportUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type SubscriptionCheckoutInput = z.infer<typeof subscriptionCheckoutSchema>;
export type SubscriptionVerifyInput = z.infer<typeof subscriptionVerifySchema>;
export type OwnerContact = z.infer<typeof ownerContactSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type ListingSummary = z.infer<typeof listingSummarySchema>;
export type FeedResponse = z.infer<typeof feedResponseSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type UploadPresignResponse = z.infer<typeof uploadPresignResponseSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type CheckoutLinkResponse = z.infer<typeof checkoutLinkResponseSchema>;
export type Report = z.infer<typeof reportSchema>;

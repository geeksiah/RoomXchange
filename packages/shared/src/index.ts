import {
  checkoutLinkResponseSchema,
  feedResponseSchema,
  listingSchema,
  otpRequestSchema,
  otpVerifySchema,
  profileUpdateSchema,
  reportCreateSchema,
  reportSchema,
  reportUpdateSchema,
  subscriptionCheckoutSchema,
  subscriptionStatusSchema,
  subscriptionVerifySchema,
  uploadPresignResponseSchema,
  uploadPresignSchema,
  userProfileSchema,
  type AuthSession,
  type CheckoutLinkResponse,
  type FeedQueryInput,
  type FeedResponse,
  type Listing,
  type ListingInput,
  type ListingSummary,
  type ListingUpdateInput,
  type OtpRequestInput,
  type OtpVerifyInput,
  type ProfileUpdateInput,
  type Report,
  type ReportCreateInput,
  type ReportUpdateInput,
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
    process.env.NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? ""
};

export type RoomXchangeConfig = typeof defaultConfig;

export const roomXchangeConfig = defaultConfig;

export const designTokens = {
  colors: {
    background: "#f7f2eb",
    surface: "#fffdfa",
    surfaceMuted: "#efe4d7",
    text: "#2a2018",
    textMuted: "#6f5a4a",
    accent: "#f15a50",
    accentSoft: "#ffe0da",
    border: "#e8d8c7",
    success: "#18794e",
    danger: "#a92d2d",
    shadow: "rgba(39, 24, 12, 0.08)"
  },
  radius: {
    sm: 14,
    md: 20,
    lg: 28,
    pill: 999
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  }
} as const;

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function sanitizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
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

  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-l+f15a50(${lng},${lat})/${lng},${lat},${zoom}/1200x700?access_token=${roomXchangeConfig.mapboxToken}`;
}

export function buildMapboxSearchUrl(query: string) {
  return `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=5&access_token=${roomXchangeConfig.mapboxToken}`;
}

type ApiClientOptions = {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | null> | string | null;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

async function request<T>(
  path: string,
  schema: { parse: (input: unknown) => T },
  options: RequestOptions = {},
  client?: ApiClientOptions
) {
  const baseUrl = client?.baseUrl ?? roomXchangeConfig.apiUrl;
  const resolvedToken = options.token ?? (await client?.getAccessToken?.());
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(resolvedToken ? { authorization: `Bearer ${resolvedToken}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? "Request failed.");
  }

  return schema.parse(payload);
}

export function createApiClient(options: ApiClientOptions = {}) {
  const requestOtp = async (input: OtpRequestInput) => {
    otpRequestSchema.parse(input);
    const response = await fetch(`${options.baseUrl ?? roomXchangeConfig.apiUrl}/auth/request-otp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.message ?? "Unable to send OTP.");
    }
    return payload as { session: string; challengeName: string };
  };

  return {
    requestOtp,
    requestOtpChallenge(input: OtpRequestInput) {
      return requestOtp(input);
    },
    async verifyOtp(input: OtpVerifyInput) {
      otpVerifySchema.parse(input);
      const response = await fetch(`${options.baseUrl ?? roomXchangeConfig.apiUrl}/auth/verify-otp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to verify OTP.");
      }
      return payload as AuthSession;
    },
    getMe() {
      return request("/auth/me", userProfileSchema, {}, options);
    },
    getFeed(query: Partial<FeedQueryInput> = {}) {
      const search = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => search.append(key, String(item)));
        } else if (value !== undefined && value !== null && value !== "") {
          search.set(key, String(value));
        }
      });

      return request(`/listings/feed${search.size ? `?${search.toString()}` : ""}`, feedResponseSchema, {}, options);
    },
    getListing(listingId: string) {
      return request(`/listings/${listingId}`, listingSchema, {}, options);
    },
    async getUserListings(userId: string) {
      const token = await options.getAccessToken?.();
      const response = await fetch(`${options.baseUrl ?? roomXchangeConfig.apiUrl}/listings/user/${userId}`, {
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {})
        }
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to load listings.");
      }
      return payload as ListingSummary[];
    },
    async createListing(input: ListingInput) {
      const token = await options.getAccessToken?.();
      const response = await fetch(`${options.baseUrl ?? roomXchangeConfig.apiUrl}/listings/create`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(input)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to create listing.");
      }
      return listingSchema.parse(payload);
    },
    async updateListing(listingId: string, input: ListingUpdateInput) {
      const token = await options.getAccessToken?.();
      const response = await fetch(`${options.baseUrl ?? roomXchangeConfig.apiUrl}/listings/${listingId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(input)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to update listing.");
      }
      return listingSchema.parse(payload);
    },
    async deleteListing(listingId: string) {
      const token = await options.getAccessToken?.();
      const response = await fetch(`${options.baseUrl ?? roomXchangeConfig.apiUrl}/listings/${listingId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Unable to archive listing.");
      }
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
    async getAdminReports() {
      const token = await options.getAccessToken?.();
      const response = await fetch(`${options.baseUrl ?? roomXchangeConfig.apiUrl}/admin/reports`, {
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {})
        }
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to load reports.");
      }
      return payload as Report[];
    },
    async updateAdminReport(reportId: string, input: ReportUpdateInput) {
      reportUpdateSchema.parse(input);
      const token = await options.getAccessToken?.();
      const response = await fetch(`${options.baseUrl ?? roomXchangeConfig.apiUrl}/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(input)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to update report.");
      }
      return reportSchema.parse(payload);
    },
    async updateProfile(input: ProfileUpdateInput) {
      profileUpdateSchema.parse(input);
      const token = await options.getAccessToken?.();
      const response = await fetch(`${options.baseUrl ?? roomXchangeConfig.apiUrl}/auth/me`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(input)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to update profile.");
      }
      return userProfileSchema.parse(payload);
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
  vr_ready: "VR tour"
};

export type {
  AuthSession,
  CheckoutLinkResponse,
  FeedResponse,
  Listing,
  ListingInput,
  ListingSummary,
  ListingUpdateInput,
  OtpRequestInput,
  OtpVerifyInput,
  ProfileUpdateInput,
  Report,
  ReportCreateInput,
  ReportUpdateInput,
  SubscriptionCheckoutInput,
  SubscriptionStatus,
  SubscriptionVerifyInput,
  UploadPresignInput,
  UploadPresignResponse,
  UserProfile
};

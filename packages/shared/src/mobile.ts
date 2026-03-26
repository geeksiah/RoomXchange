import type {
  ConversationSummary,
  FeedQueryInput,
  ListingSummary,
  NotificationRecord,
  NotificationSettings,
  ReminderPreference
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

export function buildMapboxSearchUrl(query: string) {
  return `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=8&country=GH&language=en&access_token=${roomXchangeConfig.mapboxToken}`;
}

export type {
  ConversationSummary,
  FeedQueryInput,
  ListingSummary,
  NotificationRecord,
  NotificationSettings,
  ReminderPreference
};

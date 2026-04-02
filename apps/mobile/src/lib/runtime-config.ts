import Constants from "expo-constants";

type RuntimeExtraConfig = {
  apiUrl?: string;
  eas?: {
    projectId?: string;
  };
  mapboxToken?: string;
  mediaUrl?: string;
  pushProjectId?: string;
};

function getRuntimeExtra() {
  return (Constants.expoConfig?.extra as RuntimeExtraConfig | undefined) ?? {};
}

export function getRuntimeMapboxToken() {
  return (getRuntimeExtra().mapboxToken ?? process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN ?? "").trim();
}

export function getRuntimeMediaUrl() {
  return (getRuntimeExtra().mediaUrl ?? process.env.EXPO_PUBLIC_ROOMXCHANGE_MEDIA_URL ?? "").trim();
}

export function getRuntimePushProjectId() {
  const constantsWithEas = Constants as typeof Constants & {
    easConfig?: {
      projectId?: string;
    };
  };
  const easProjectId = constantsWithEas.easConfig?.projectId?.trim();
  if (easProjectId) {
    return easProjectId;
  }

  const runtimeProjectId = getRuntimeExtra().pushProjectId?.trim() || getRuntimeExtra().eas?.projectId?.trim();
  if (runtimeProjectId) {
    return runtimeProjectId;
  }

  return (process.env.EXPO_PUBLIC_ROOMXCHANGE_PUSH_PROJECT_ID ?? "").trim();
}

export function buildRuntimeMapboxSearchUrl(query: string) {
  const token = getRuntimeMapboxToken();
  if (!token) {
    return null;
  }

  return `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&limit=8&country=GH&language=en&access_token=${token}`;
}

export function buildRuntimeStaticMapUrl(lat: number, lng: number, zoom = 11) {
  const token = getRuntimeMapboxToken();
  if (!token) {
    return null;
  }

  return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-l+ff385c(${lng},${lat})/${lng},${lat},${zoom}/1200x700?access_token=${token}`;
}

export function resolveRuntimeMediaUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  const mediaUrl = getRuntimeMediaUrl();
  if (!mediaUrl) {
    return trimmedValue;
  }

  try {
    return new URL(trimmedValue.replace(/^\/+/, ""), `${mediaUrl.replace(/\/+$/, "")}/`).toString();
  } catch {
    return trimmedValue;
  }
}

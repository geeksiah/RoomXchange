import type { ExpoConfig } from "expo/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadWorkspaceEnv() {
  const envPath = resolve(__dirname, "../../.env");
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadWorkspaceEnv();

const googleServicesFile = process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json";
const androidGoogleServicesFile = process.env.GOOGLE_SERVICES_JSON || existsSync(googleServicesFile) ? googleServicesFile : undefined;
const sharedGoogleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
const androidGoogleMapsApiKey = process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY?.trim() || sharedGoogleMapsApiKey;
const iosGoogleMapsApiKey = process.env.EXPO_PUBLIC_IOS_GOOGLE_MAPS_API_KEY?.trim() || sharedGoogleMapsApiKey;
const mapboxPublicToken =
  process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN?.trim() ||
  process.env.ROOMXCHANGE_MAPBOX_PUBLIC_TOKEN?.trim() ||
  "";
const defaultWebUrl = "https://roomxchange.netlify.app";
const configuredWebUrl = process.env.EXPO_PUBLIC_ROOMXCHANGE_WEB_URL?.trim();
const appWebUrl =
  configuredWebUrl && /^https?:\/\//i.test(configuredWebUrl) && configuredWebUrl !== "BACKEND_ONLY_DEPLOYMENT"
    ? configuredWebUrl
    : defaultWebUrl;
const configuredSupportUrl = process.env.EXPO_PUBLIC_ROOMXCHANGE_SUPPORT_URL?.trim();
const supportUrl =
  configuredSupportUrl && /^https?:\/\//i.test(configuredSupportUrl) ? configuredSupportUrl : `${appWebUrl}#support`;
const privacyPolicyUrl = `${appWebUrl}/privacy-policy`;
const accountDeletionUrl = `${appWebUrl}/delete-account`;

const config: ExpoConfig = {
  name: "RoomXchange",
  slug: "roomxchange",
  owner: "nsiahgh6",
  scheme: "roomxchange",
  version: "1.0.0",
  newArchEnabled: true,
  userInterfaceStyle: "light",
  icon: "./src/assets/icon-primary-bg.png",
  splash: {
    image: "./src/assets/icon-light-splash-foreground.png",
    backgroundColor: "#FF385C",
    resizeMode: "contain"
  },
  ios: {
    supportsTablet: true,
    icon: "./src/assets/icon-primary-bg.png",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    },
    config: iosGoogleMapsApiKey
      ? {
          googleMapsApiKey: iosGoogleMapsApiKey
        }
      : undefined,
    bundleIdentifier: "com.roomxchange.mobile"
  },
  android: {
    package: "com.roomxchange.mobile",
    googleServicesFile: androidGoogleServicesFile,
    config: androidGoogleMapsApiKey
      ? {
          googleMaps: {
            apiKey: androidGoogleMapsApiKey
          }
        }
      : undefined,
    adaptiveIcon: {
      foregroundImage: "./src/assets/icon-light-foreground.png",
      backgroundColor: "#FF385C"
    }
  },
  experiments: {
    typedRoutes: true
  },
  plugins: [
    "expo-router",
    "expo-notifications",
    "expo-secure-store",
    "./plugins/with-monorepo-android-bundle",
    "./plugins/with-android-display-compliance"
  ],
  extra: {
    eas: {
      projectId: "9e11f47c-5b61-4f3b-a09d-7c13ce5f0fda"
    },
    apiUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_API_URL ?? "",
    mediaUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_MEDIA_URL ?? "",
    webUrl: appWebUrl,
    socketUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_SOCKET_URL ?? "",
    pushProjectId: process.env.EXPO_PUBLIC_ROOMXCHANGE_PUSH_PROJECT_ID ?? "",
    mapboxToken: mapboxPublicToken,
    supportUrl,
    privacyPolicyUrl,
    accountDeletionUrl,
    maps: {
      androidConfigured: Boolean(androidGoogleMapsApiKey),
      iosConfigured: Boolean(iosGoogleMapsApiKey)
    }
  }
};

export default config;

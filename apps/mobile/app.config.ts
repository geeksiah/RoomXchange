import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "RoomXchange",
  slug: "roomxchange",
  owner: "facefindr-app",
  scheme: "roomxchange",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./src/assets/icon.png",
  splash: {
    image: "./src/assets/icon-light-splash.png",
    backgroundColor: "#FF385C",
    resizeMode: "contain"
  },
  ios: {
    supportsTablet: true,
    icon: "./src/assets/icon.png",
    bundleIdentifier: "com.roomxchange.mobile"
  },
  android: {
    package: "com.roomxchange.mobile",
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./src/assets/icon.png",
      backgroundColor: "#FCFCFA"
    }
  },
  experiments: {
    typedRoutes: true,
    autolinkingModuleResolution: true
  },
  plugins: ["expo-router", "expo-notifications", "expo-secure-store"],
  extra: {
    eas: {
      projectId: "77748195-a71f-4a62-90f6-0cd7ecde03ef"
    },
    apiUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_API_URL ?? "",
    webUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_WEB_URL ?? "http://localhost:3000",
    socketUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_SOCKET_URL ?? "",
    pushProjectId: process.env.EXPO_PUBLIC_ROOMXCHANGE_PUSH_PROJECT_ID ?? "",
    supportUrl:
      process.env.EXPO_PUBLIC_ROOMXCHANGE_SUPPORT_URL ??
      `${process.env.EXPO_PUBLIC_ROOMXCHANGE_WEB_URL ?? "http://localhost:3000"}#support`
  }
};

export default config;

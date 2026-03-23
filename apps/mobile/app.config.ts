import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "RoomXchange",
  slug: "roomxchange",
  scheme: "roomxchange",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  experiments: {
    typedRoutes: true
  },
  plugins: ["expo-router"],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_API_URL ?? "",
    webUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_WEB_URL ?? "https://roomxchange.com"
  }
};

export default config;

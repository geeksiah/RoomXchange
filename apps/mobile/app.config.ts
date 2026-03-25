import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "RoomXchange",
  slug: "roomxchange",
  scheme: "roomxchange",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./src/assets/icon.png",
  splash: {
    image: "./src/assets/icon.png",
    backgroundColor: "#FCFCFA",
    resizeMode: "contain"
  },
  ios: {
    supportsTablet: true,
    icon: "./src/assets/icon.png"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./src/assets/icon.png",
      backgroundColor: "#FCFCFA"
    }
  },
  experiments: {
    typedRoutes: true,
    autolinkingModuleResolution: true
  },
  plugins: ["expo-router", "expo-notifications"],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_API_URL ?? "",
    webUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_WEB_URL ?? "http://localhost:3000",
    socketUrl: process.env.EXPO_PUBLIC_ROOMXCHANGE_SOCKET_URL ?? "",
    pushProjectId: process.env.EXPO_PUBLIC_ROOMXCHANGE_PUSH_PROJECT_ID ?? ""
  }
};

export default config;

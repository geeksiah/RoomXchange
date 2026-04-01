import Constants from "expo-constants";
import { Platform, UIManager } from "react-native";
import { PROVIDER_GOOGLE, type Provider } from "react-native-maps";

type ExpoMapConfig = {
  android?: {
    config?: {
      googleMaps?: {
        apiKey?: string;
      };
    };
  };
  ios?: {
    config?: {
      googleMapsApiKey?: string;
    };
  };
  extra?: {
    maps?: {
      androidConfigured?: boolean;
      iosConfigured?: boolean;
    };
  };
};

function hasNativeMapManager(name: string) {
  const getViewManagerConfig = UIManager.getViewManagerConfig?.bind(UIManager);
  return Boolean(getViewManagerConfig?.(name));
}

function hasDefaultMapManager() {
  return hasNativeMapManager("AIRMap") || hasNativeMapManager("RNMapsAirMap");
}

function hasGoogleMapManager() {
  return hasNativeMapManager("AIRGoogleMap");
}

function getExpoMapConfig() {
  const expoConfig = Constants.expoConfig as ExpoMapConfig | null;
  const configuredFromExtra = expoConfig?.extra?.maps;

  return {
    expoConfig,
    androidConfigured:
      configuredFromExtra?.androidConfigured ??
      Boolean(expoConfig?.android?.config?.googleMaps?.apiKey),
    iosConfigured:
      configuredFromExtra?.iosConfigured ??
      Boolean(expoConfig?.ios?.config?.googleMapsApiKey)
  };
}

export function getNativeMapProvider(): Provider | undefined {
  if (Platform.OS !== "ios") {
    return undefined;
  }

  const { iosConfigured } = getExpoMapConfig();
  return iosConfigured && hasGoogleMapManager() ? PROVIDER_GOOGLE : undefined;
}

export function isNativeMapAvailable() {
  const { androidConfigured } = getExpoMapConfig();
  const defaultManagerAvailable = hasDefaultMapManager();
  const googleManagerAvailable = hasGoogleMapManager();

  if (Platform.OS === "android") {
    return androidConfigured && (defaultManagerAvailable || googleManagerAvailable);
  }

  if (Platform.OS === "ios") {
    return Boolean(getNativeMapProvider() ? googleManagerAvailable : defaultManagerAvailable);
  }

  return false;
}

export function getMapAvailabilityHint() {
  if (Platform.OS === "android") {
    return "This Android build could not start the native map view. Install the latest synced build, or use the listings view for now.";
  }

  if (Platform.OS === "ios") {
    return "Rebuild the iOS app after syncing the native Google Maps configuration so the native map view is included.";
  }

  return "Map view is unavailable on this platform.";
}

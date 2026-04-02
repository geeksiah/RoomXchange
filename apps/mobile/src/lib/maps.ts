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

type NativeMapDiagnostics = {
  platform: string;
  androidConfigured: boolean;
  iosConfigured: boolean;
  defaultManagerAvailable: boolean;
  googleManagerAvailable: boolean;
};

function hasNativeMapManager(name: string) {
  const hasViewManagerConfig = UIManager.hasViewManagerConfig?.bind(UIManager);
  const getViewManagerConfig = UIManager.getViewManagerConfig?.bind(UIManager);
  return Boolean(hasViewManagerConfig?.(name) || getViewManagerConfig?.(name));
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

export function getNativeMapDiagnostics(): NativeMapDiagnostics {
  const { androidConfigured, iosConfigured } = getExpoMapConfig();

  return {
    platform: Platform.OS,
    androidConfigured,
    iosConfigured,
    defaultManagerAvailable: hasDefaultMapManager(),
    googleManagerAvailable: hasGoogleMapManager()
  };
}

export function logNativeMapDiagnostics(scope: string) {
  const diagnostics = getNativeMapDiagnostics();
  console.warn(`[maps] ${scope}`, diagnostics);
  return diagnostics;
}

export function getNativeMapProvider(): Provider | undefined {
  if (Platform.OS !== "ios") {
    return undefined;
  }

  const { iosConfigured } = getExpoMapConfig();
  return iosConfigured && hasGoogleMapManager() ? PROVIDER_GOOGLE : undefined;
}

export function isNativeMapConfigured() {
  const { androidConfigured, iosConfigured } = getExpoMapConfig();

  if (Platform.OS === "android") {
    return androidConfigured;
  }

  if (Platform.OS === "ios") {
    return iosConfigured;
  }

  return false;
}

export function isNativeMapAvailable() {
  const { androidConfigured } = getExpoMapConfig();
  const defaultManagerAvailable = hasDefaultMapManager();
  const googleManagerAvailable = hasGoogleMapManager();

  if (Platform.OS === "android") {
    return androidConfigured && defaultManagerAvailable;
  }

  if (Platform.OS === "ios") {
    return Boolean(getNativeMapProvider() ? googleManagerAvailable : defaultManagerAvailable);
  }

  return false;
}

export function getMapAvailabilityHint() {
  if (Platform.OS === "android") {
    return "This Android build could not start the native map view. Reinstall the latest build and confirm the Android Maps SDK key is allowed for this app package and signing fingerprint.";
  }

  if (Platform.OS === "ios") {
    return "Rebuild the iOS app after syncing the native Google Maps configuration so the native map view is included.";
  }

  return "Map view is unavailable on this platform.";
}

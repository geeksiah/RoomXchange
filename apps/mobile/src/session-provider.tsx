import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createMobileApiClient, type AuthSession } from "@roomxchange/shared/src/mobile-client";

type SessionContextValue = {
  session: AuthSession | null;
  hydrated: boolean;
  api: ReturnType<typeof createApiClient>;
  setSession: (value: AuthSession | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const storageKey = "roomxchange.mobile.session";
const SessionContext = createContext<SessionContextValue | null>(null);

function resolveMobileApiUrl() {
  const extra =
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined) ??
    ((Constants as unknown as { manifest?: { extra?: { apiUrl?: string } } }).manifest?.extra as
      | { apiUrl?: string }
      | undefined) ??
    ((Constants as unknown as { manifest2?: { extra?: { apiUrl?: string } } }).manifest2?.extra as
      | { apiUrl?: string }
      | undefined);

  return extra?.apiUrl ?? process.env.EXPO_PUBLIC_ROOMXCHANGE_API_URL ?? "";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const apiBaseUrl = resolveMobileApiUrl();

  useEffect(() => {
    SecureStore.getItemAsync(storageKey).then((value) => {
      if (value) {
        setSessionState(JSON.parse(value) as AuthSession);
      }
      setHydrated(true);
    });
  }, []);

  const remoteApi = useMemo(
    () =>
      createMobileApiClient({
        baseUrl: apiBaseUrl,
        getAccessToken: () => session?.tokens.accessToken ?? null
      }),
    [apiBaseUrl, session?.tokens.accessToken]
  );
  const api = remoteApi;

  const setSession = async (value: AuthSession | null) => {
    setSessionState(value);
    if (value) {
      await SecureStore.setItemAsync(storageKey, JSON.stringify(value));
    } else {
      await SecureStore.deleteItemAsync(storageKey);
    }
  };

  const logout = () => setSession(null);

  const refreshProfile = async () => {
    if (!session) {
      return;
    }

    const user = await api.getMe();
    await setSession({
      ...session,
      user
    });
  };

  return <SessionContext.Provider value={{ session, hydrated, api, setSession, refreshProfile, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider.");
  }
  return value;
}

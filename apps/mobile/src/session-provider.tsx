import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createApiClient, type AuthSession } from "@roomxchange/shared";

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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

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
      createApiClient({
        getAccessToken: () => session?.tokens.accessToken ?? null
      }),
    [session?.tokens.accessToken]
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

import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { createMobileApiClient, type AuthSession } from "@roomxchange/shared/src/mobile-client";

type SessionContextValue = {
  session: AuthSession | null;
  hydrated: boolean;
  api: ReturnType<typeof createMobileApiClient>;
  setSession: (value: AuthSession | null) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const storageNamespace = "roomxchange.mobile.session";
const storageKeys = {
  legacy: storageNamespace,
  user: `${storageNamespace}.user`,
  accessToken: `${storageNamespace}.accessToken`,
  idToken: `${storageNamespace}.idToken`,
  refreshToken: `${storageNamespace}.refreshToken`,
  expiresIn: `${storageNamespace}.expiresIn`
} as const;
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

async function clearStoredSession() {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(storageKeys.legacy),
    SecureStore.deleteItemAsync(storageKeys.user),
    SecureStore.deleteItemAsync(storageKeys.accessToken),
    SecureStore.deleteItemAsync(storageKeys.idToken),
    SecureStore.deleteItemAsync(storageKeys.refreshToken),
    SecureStore.deleteItemAsync(storageKeys.expiresIn)
  ]);
}

async function writeStoredSession(value: AuthSession) {
  const writes = await Promise.allSettled([
    SecureStore.setItemAsync(storageKeys.legacy, JSON.stringify(value)),
    SecureStore.setItemAsync(storageKeys.user, JSON.stringify(value.user)),
    SecureStore.setItemAsync(storageKeys.accessToken, value.tokens.accessToken),
    SecureStore.setItemAsync(storageKeys.idToken, value.tokens.idToken),
    SecureStore.setItemAsync(storageKeys.expiresIn, String(value.tokens.expiresIn)),
    value.tokens.refreshToken
      ? SecureStore.setItemAsync(storageKeys.refreshToken, value.tokens.refreshToken)
      : SecureStore.deleteItemAsync(storageKeys.refreshToken)
  ]);

  if (writes.some((entry) => entry.status === "rejected")) {
    await clearStoredSession();
    throw new Error("Unable to persist the current session.");
  }
}

async function readSegmentedSession() {
  const [userValue, accessToken, idToken, refreshToken, expiresInValue] = await Promise.all([
    SecureStore.getItemAsync(storageKeys.user),
    SecureStore.getItemAsync(storageKeys.accessToken),
    SecureStore.getItemAsync(storageKeys.idToken),
    SecureStore.getItemAsync(storageKeys.refreshToken),
    SecureStore.getItemAsync(storageKeys.expiresIn)
  ]);

  if (!userValue || !accessToken || !idToken || !expiresInValue) {
    return null;
  }

  const expiresIn = Number(expiresInValue);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    return null;
  }

  return {
    user: JSON.parse(userValue) as AuthSession["user"],
    tokens: {
      accessToken,
      idToken,
      refreshToken: refreshToken ?? undefined,
      expiresIn
    }
  } satisfies AuthSession;
}

async function readStoredSession() {
  try {
    const segmented = await readSegmentedSession();
    if (segmented) {
      return segmented;
    }
  } catch {
    await clearStoredSession();
    return null;
  }

  const legacyValue = await SecureStore.getItemAsync(storageKeys.legacy);
  if (!legacyValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(legacyValue) as AuthSession;
    await writeStoredSession(parsed);
    return parsed;
  } catch {
    await clearStoredSession();
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const apiBaseUrl = resolveMobileApiUrl();
  const sessionRef = useRef<AuthSession | null>(null);
  const clearingUnauthorizedRef = useRef(false);
  const refreshingSessionRef = useRef<Promise<AuthSession | null> | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const clearSessionState = useCallback(async () => {
    sessionRef.current = null;
    setSessionState(null);
    await clearStoredSession();
  }, []);

  const persistSessionState = useCallback(async (value: AuthSession) => {
    await writeStoredSession(value);
    sessionRef.current = value;
    setSessionState(value);
    return value;
  }, []);

  const refreshSessionTokens = useCallback(
    async ({ clearOnFailure = true }: { clearOnFailure?: boolean } = {}) => {
      const currentSession = sessionRef.current;
      if (!currentSession) {
        return null;
      }

      const refreshToken = currentSession.tokens.refreshToken?.trim();
      if (!refreshToken) {
        if (clearOnFailure) {
          await clearSessionState();
          return null;
        }

        return currentSession;
      }

      if (refreshingSessionRef.current) {
        return refreshingSessionRef.current;
      }

      const refreshApi = createMobileApiClient({ baseUrl: apiBaseUrl });
      const refreshPromise = (async () => {
        try {
          const nextSession = await refreshApi.refreshSession({ refreshToken });
          await persistSessionState(nextSession);
          return nextSession;
        } catch {
          if (clearOnFailure) {
            await clearSessionState();
            return null;
          }

          return currentSession;
        } finally {
          refreshingSessionRef.current = null;
        }
      })();

      refreshingSessionRef.current = refreshPromise;
      return refreshPromise;
    },
    [apiBaseUrl, clearSessionState, persistSessionState]
  );

  const handleUnauthorized = useCallback(async () => {
    if (clearingUnauthorizedRef.current) {
      return;
    }

    clearingUnauthorizedRef.current = true;

    try {
      await clearSessionState();
    } finally {
      clearingUnauthorizedRef.current = false;
    }
  }, [clearSessionState]);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const storedSession = await readStoredSession();
        if (!active) {
          return;
        }

        if (storedSession) {
          sessionRef.current = storedSession;
          setSessionState(storedSession);
          if (storedSession.tokens.refreshToken) {
            void refreshSessionTokens({ clearOnFailure: false });
          }
        }
      } finally {
        if (active) {
          setHydrated(true);
        }
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, [refreshSessionTokens]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && sessionRef.current?.tokens.refreshToken) {
        void refreshSessionTokens({ clearOnFailure: false });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshSessionTokens]);

  const remoteApi = useMemo(
    () =>
      createMobileApiClient({
        baseUrl: apiBaseUrl,
        getAccessToken: () => session?.tokens.accessToken ?? null,
        getIdToken: () => session?.tokens.idToken ?? null,
        refreshAuthSession: () => refreshSessionTokens(),
        onUnauthorized: () => {
          void handleUnauthorized();
        }
      }),
    [apiBaseUrl, handleUnauthorized, refreshSessionTokens, session?.tokens.accessToken, session?.tokens.idToken]
  );
  const api = remoteApi;

  const setSession = async (value: AuthSession | null) => {
    try {
      if (value) {
        await persistSessionState(value);
      } else {
        await clearSessionState();
      }
    } catch {
      await clearSessionState();
    }
  };

  const logout = () => setSession(null);

  const refreshProfile = async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) {
      return;
    }

    const user = await api.getMe();
    await persistSessionState({
      ...currentSession,
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

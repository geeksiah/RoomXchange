import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const storedSession = await readStoredSession();
        if (!active || !storedSession) {
          return;
        }
        setSessionState(storedSession);
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
  }, []);

  const remoteApi = useMemo(
    () =>
      createMobileApiClient({
        baseUrl: apiBaseUrl,
        getAccessToken: () => session?.tokens.idToken ?? null,
        onUnauthorized: () => {
          setSessionState(null);
          void clearStoredSession();
        }
      }),
    [apiBaseUrl, session?.tokens.idToken]
  );
  const api = remoteApi;

  const setSession = async (value: AuthSession | null) => {
    setSessionState(value);
    try {
      if (value) {
        await writeStoredSession(value);
      } else {
        await clearStoredSession();
      }
    } catch {
      return;
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

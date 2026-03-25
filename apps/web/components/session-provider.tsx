"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createApiClient, roomXchangeConfig, type AuthSession } from "@roomxchange/shared";

type SessionContextValue = {
  session: AuthSession | null;
  api: ReturnType<typeof createApiClient>;
  adminLogin: (email: string, password: string) => Promise<void>;
  setSession: (session: AuthSession | null) => void;
  refreshProfile: () => Promise<void>;
  logout: () => void;
};

const storageKey = "roomxchange.web.session";
const localApiFallback = process.env.NODE_ENV === "development" ? "http://localhost:4000" : "";

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      setSessionState(JSON.parse(raw) as AuthSession);
    }
  }, []);

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: roomXchangeConfig.apiUrl || localApiFallback,
        getAccessToken: () => session?.tokens.accessToken ?? null
      }),
    [session?.tokens.accessToken]
  );

  const setSession = (value: AuthSession | null) => {
    setSessionState(value);
    if (value) {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } else {
      window.localStorage.removeItem(storageKey);
    }
  };

  const logout = () => setSession(null);

  const adminLogin = async (email: string, password: string) => {
    const nextSession = await api.adminLogin({ email, password });
    setSession(nextSession);
  };

  const refreshProfile = async () => {
    if (!session) {
      return;
    }

    const user = await api.getMe();
    setSession({
      ...session,
      user
    });
  };

  return <SessionContext.Provider value={{ session, api, adminLogin, setSession, refreshProfile, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside SessionProvider.");
  }

  return value;
}

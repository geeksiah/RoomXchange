import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createApiClient, type AuthSession } from "@roomxchange/shared";
import { demoSession, isDemoSession } from "./demo-data";
import { resetDemoStore, useDemoStore } from "./stores/demo-store";
import { useNotificationStore } from "./stores/notification-store";

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

  const api = useMemo(() => {
    const bootstrapDemo = async (input = { signIn: false }) => {
      try {
        return await remoteApi.bootstrapDemo(input);
      } catch {
        resetDemoStore();
        return {
          session: input.signIn ? demoSession : null,
          listingsCount: useDemoStore.getState().listings.length,
          testUserPhone: demoSession.user.phone
        };
      }
    };

    if (!isDemoSession(session)) {
      return {
        ...remoteApi,
        bootstrapDemo
      };
    }

    return {
      ...remoteApi,
      bootstrapDemo,
      async getMe() {
        return useDemoStore.getState().getMe();
      },
      async updateProfile(input: Parameters<typeof remoteApi.updateProfile>[0]) {
        return useDemoStore.getState().updateProfile(input);
      },
      async getFeed(query = {}) {
        return useDemoStore.getState().getFeed(query);
      },
      async getListing(listingId: string) {
        const listing = useDemoStore.getState().getListing(listingId);
        if (!listing) {
          throw new Error("Listing not found.");
        }
        return listing;
      },
      async getUserListings(userId: string) {
        return useDemoStore.getState().getUserListings(userId);
      },
      async createListing(input: Parameters<typeof remoteApi.createListing>[0]) {
        return useDemoStore.getState().createListing(session?.user.userId ?? demoSession.user.userId, input);
      },
      async updateListing(listingId: string, input: Parameters<typeof remoteApi.updateListing>[1]) {
        return useDemoStore.getState().updateListing(listingId, input);
      },
      async deleteListing(listingId: string) {
        useDemoStore.getState().deleteListing(listingId);
      },
      async getNotificationSettings() {
        return useNotificationStore.getState().settings;
      },
      async getNotifications() {
        return { items: useNotificationStore.getState().notifications };
      },
      async updateNotification(notificationId: string, input: { read: boolean }) {
        if (input.read) {
          useNotificationStore.getState().markAsRead(notificationId);
        }
        return useNotificationStore.getState().notifications.find((item) => item.id === notificationId)!;
      },
      async markAllNotificationsRead() {
        useNotificationStore.getState().markAllAsRead();
        return { success: true as const };
      },
      async deleteNotification(notificationId: string) {
        useNotificationStore.getState().deleteNotification(notificationId);
        return { success: true as const };
      },
      async clearNotifications() {
        useNotificationStore.getState().clearNotifications();
        return { success: true as const };
      },
      async getReminders() {
        return { items: useNotificationStore.getState().reminders };
      },
      async upsertReminder(input: Parameters<typeof remoteApi.upsertReminder>[0]) {
        useNotificationStore.getState().upsertReminder(input);
        const reminders = useNotificationStore.getState().reminders;
        return reminders.find((item) => item.id === input.id) ?? reminders[0]!;
      },
      async updateReminder(reminderId: string, input: Parameters<typeof remoteApi.updateReminder>[1]) {
        useNotificationStore.getState().upsertReminder({ ...input, id: reminderId });
        return useNotificationStore.getState().reminders.find((item) => item.id === reminderId)!;
      },
      async deleteReminder(reminderId: string) {
        useNotificationStore.getState().deleteReminder(reminderId);
        return { success: true as const };
      },
      async createReport(input: Parameters<typeof remoteApi.createReport>[0]) {
        return useDemoStore.getState().createReport(session?.user.userId ?? demoSession.user.userId, input);
      },
      async getMyReports() {
        return useDemoStore.getState().getMyReports();
      },
      async openConversation(input: Parameters<typeof remoteApi.openConversation>[0]) {
        return useDemoStore.getState().openConversation(input.listingId);
      },
      async getConversations() {
        return useDemoStore.getState().getConversations();
      },
      async markAllConversationsRead() {
        return useDemoStore.getState().markAllConversationsRead();
      },
      async deleteConversation(conversationId: string) {
        return useDemoStore.getState().deleteConversation(conversationId);
      },
      async getConversationMessages(conversationId: string, query = {}) {
        return useDemoStore.getState().getConversationMessages(conversationId, query);
      },
      async deleteConversationMessages(conversationId: string, input: { messageIds: string[] }) {
        return useDemoStore.getState().deleteConversationMessages(session?.user.userId ?? demoSession.user.userId, conversationId, input.messageIds);
      },
      async sendConversationMessage(conversationId: string, input: Parameters<typeof remoteApi.sendConversationMessage>[1]) {
        return useDemoStore.getState().sendConversationMessage(session?.user.userId ?? demoSession.user.userId, conversationId, input.body);
      }
    };
  }, [remoteApi, session]);

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

import { create } from "zustand";
import type {
  ListingSummary,
  NotificationRecord,
  NotificationSettings,
  ReminderPreference
} from "@roomxchange/shared";

type BannerNotification = {
  id: string;
  title: string;
  body: string;
  listingId?: string;
};

type NotificationState = {
  banners: BannerNotification[];
  notifications: NotificationRecord[];
  reminders: ReminderPreference[];
  permissionStatus: "unknown" | "granted" | "denied" | "unavailable";
  expoPushToken: string | null;
  pushConfigured: boolean;
  pushEnabled: boolean;
  settings: NotificationSettings;
  unreadCount: number;
  createNotification: (input: Omit<NotificationRecord, "id" | "createdAt" | "read">) => void;
  upsertNotification: (notification: NotificationRecord, showBanner?: boolean) => void;
  setNotifications: (notifications: NotificationRecord[]) => void;
  dismissBanner: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  upsertReminder: (reminder: Omit<ReminderPreference, "id" | "createdAt" | "updatedAt"> & { id?: string }) => void;
  setReminders: (reminders: ReminderPreference[]) => void;
  deleteReminder: (id: string) => void;
  toggleReminder: (id: string, enabled: boolean) => void;
  evaluateListingsAgainstReminders: (listings: ListingSummary[]) => void;
  setPermissionStatus: (value: NotificationState["permissionStatus"]) => void;
  setExpoPushToken: (value: string | null) => void;
  setPushConfigured: (value: boolean) => void;
  setPushEnabled: (value: boolean) => void;
  setRemoteSettings: (value: NotificationSettings) => void;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

function countUnread(notifications: NotificationRecord[]) {
  return notifications.filter((item) => !item.read).length;
}

function sortNotifications(notifications: NotificationRecord[]) {
  return [...notifications].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function addBanner(
  banners: BannerNotification[],
  notification: Pick<NotificationRecord, "id" | "title" | "body" | "listingId" | "read">
) {
  if (notification.read) {
    return banners;
  }

  return [
    { id: notification.id, title: notification.title, body: notification.body, listingId: notification.listingId },
    ...banners.filter((item) => item.id !== notification.id)
  ].slice(0, 3);
}

function matchesReminder(listing: ListingSummary, reminder: ReminderPreference) {
  if (!reminder.enabled) {
    return false;
  }

  if (reminder.location.trim() && !listing.location.toLowerCase().includes(reminder.location.trim().toLowerCase())) {
    return false;
  }

  if (reminder.propertyType !== "all" && listing.propertyType !== reminder.propertyType) {
    return false;
  }

  if (reminder.listingSubtypes.length && (!listing.listingSubtype || !reminder.listingSubtypes.includes(listing.listingSubtype))) {
    return false;
  }

  if (listing.price < reminder.minBudget || listing.price > reminder.maxBudget) {
    return false;
  }

  return true;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  banners: [],
  notifications: [],
  reminders: [],
  permissionStatus: "unknown",
  expoPushToken: null,
  pushConfigured: false,
  pushEnabled: true,
  settings: {
    pushEnabled: true,
    messageNotificationsEnabled: true,
    listingMatchNotificationsEnabled: true,
    donationProvider: "Paystack",
    donationUrl: null,
    donationPresetAmounts: [50, 100, 200, 500, 1000],
    updatedAt: new Date().toISOString()
  },
  unreadCount: 0,
  createNotification: (input) =>
    set((state) => {
      if (!state.settings.pushEnabled) {
        return {};
      }
      if (input.kind === "message" && !state.settings.messageNotificationsEnabled) {
        return {};
      }
      if (input.kind === "listing_match" && !state.settings.listingMatchNotificationsEnabled) {
        return {};
      }

      const notification: NotificationRecord = {
        id: createId("notification"),
        createdAt: new Date().toISOString(),
        read: false,
        ...input
      };
      const notifications = sortNotifications([notification, ...state.notifications]);
      return {
        banners: addBanner(state.banners, notification),
        notifications,
        unreadCount: countUnread(notifications)
      };
    }),
  upsertNotification: (notification, showBanner = true) =>
    set((state) => {
      const exists = state.notifications.some((item) => item.id === notification.id);
      const notifications = sortNotifications(
        exists
          ? state.notifications.map((item) => (item.id === notification.id ? notification : item))
          : [notification, ...state.notifications]
      );

      return {
        notifications,
        banners: showBanner && !exists ? addBanner(state.banners, notification) : state.banners,
        unreadCount: countUnread(notifications)
      };
    }),
  setNotifications: (notifications) =>
    set((state) => ({
      notifications: sortNotifications(notifications),
      banners: state.banners.filter((banner) => notifications.some((item) => item.id === banner.id && !item.read)),
      unreadCount: countUnread(notifications)
    })),
  dismissBanner: (id) =>
    set((state) => ({
      banners: state.banners.filter((item) => item.id !== id)
    })),
  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((item) => (item.id === id ? { ...item, read: true } : item));
      return {
        notifications,
        banners: state.banners.filter((item) => item.id !== id),
        unreadCount: countUnread(notifications)
      };
    }),
  markAllAsRead: () =>
    set((state) => {
      const notifications = state.notifications.map((item) => ({ ...item, read: true }));
      return {
        notifications,
        banners: [],
        unreadCount: 0
      };
    }),
  deleteNotification: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((item) => item.id !== id);
      return {
        notifications,
        banners: state.banners.filter((item) => item.id !== id),
        unreadCount: countUnread(notifications)
      };
    }),
  clearNotifications: () =>
    set({
      notifications: [],
      banners: [],
      unreadCount: 0
    }),
  upsertReminder: (reminder) =>
    set((state) => {
      const now = new Date().toISOString();
      const nextReminder: ReminderPreference = {
        id: reminder.id ?? createId("reminder"),
        createdAt: now,
        updatedAt: now,
        ...reminder
      };
      const reminders = state.reminders.some((item) => item.id === nextReminder.id)
        ? state.reminders.map((item) =>
            item.id === nextReminder.id
              ? { ...item, ...nextReminder, createdAt: item.createdAt, updatedAt: nextReminder.updatedAt }
              : item
          )
        : [nextReminder, ...state.reminders];
      return { reminders: reminders.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)) };
    }),
  setReminders: (reminders) =>
    set({
      reminders: [...reminders].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    }),
  deleteReminder: (id) =>
    set((state) => ({
      reminders: state.reminders.filter((item) => item.id !== id)
    })),
  toggleReminder: (id, enabled) =>
    set((state) => ({
      reminders: state.reminders.map((item) =>
        item.id === id ? { ...item, enabled, updatedAt: new Date().toISOString() } : item
      )
    })),
  evaluateListingsAgainstReminders: (listings) =>
    set((state) => {
      if (!state.settings.pushEnabled || !state.settings.listingMatchNotificationsEnabled) {
        return {};
      }

      const existingKeys = new Set(
        state.notifications
          .filter((item) => item.kind === "listing_match" && item.listingId)
          .map((item) => `${item.listingId}#${item.title}`)
      );

      const generated = state.reminders.flatMap((reminder) =>
        listings
          .filter((listing) => matchesReminder(listing, reminder))
          .filter((listing) => !existingKeys.has(`${listing.listingId}#New match in ${listing.location}`))
          .map<NotificationRecord>((listing) => ({
            id: createId("notification"),
            title: `New match in ${listing.location}`,
            body: `${listing.title} fits your saved alert.`,
            createdAt: new Date().toISOString(),
            listingId: listing.listingId,
            read: false,
            kind: "listing_match"
          }))
      );

      if (!generated.length) {
        return {};
      }

      const notifications = sortNotifications([...generated, ...state.notifications]);
      return {
        notifications,
        banners: generated.reduce((current, item) => addBanner(current, item), state.banners),
        unreadCount: countUnread(notifications)
      };
    }),
  setPermissionStatus: (value) => set({ permissionStatus: value }),
  setExpoPushToken: (value) => set({ expoPushToken: value }),
  setPushConfigured: (value) => set({ pushConfigured: value }),
  setPushEnabled: (value) => set({ pushEnabled: value }),
  setRemoteSettings: (value) => set({ settings: value })
}));

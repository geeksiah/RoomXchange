import { useEffect, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { Animated, AppState, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { ScaleButton } from "../components/scale-button";
import { useSession } from "../session-provider";
import { useNotificationStore } from "../stores/notification-store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { api, session } = useSession();
  const banners = useNotificationStore((state) => state.banners);
  const dismissBanner = useNotificationStore((state) => state.dismissBanner);
  const setPermissionStatus = useNotificationStore((state) => state.setPermissionStatus);
  const setExpoPushToken = useNotificationStore((state) => state.setExpoPushToken);
  const setPushConfigured = useNotificationStore((state) => state.setPushConfigured);
  const pushEnabled = useNotificationStore((state) => state.pushEnabled);
  const settings = useNotificationStore((state) => state.settings);
  const setRemoteSettings = useNotificationStore((state) => state.setRemoteSettings);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const setReminders = useNotificationStore((state) => state.setReminders);
  const createNotification = useNotificationStore((state) => state.createNotification);

  useEffect(() => {
    if (!session) {
      setNotifications([]);
      setReminders([]);
      return;
    }

    let active = true;
    let syncTimer: ReturnType<typeof setInterval> | null = null;
    const syncState = async () => {
      try {
        const [remoteSettings, notifications, reminders] = await Promise.all([
          api.getNotificationSettings(),
          api.getNotifications(),
          api.getReminders()
        ]);
        if (!active) {
          return;
        }

        setRemoteSettings(remoteSettings);
        setNotifications(notifications.items);
        setReminders(reminders.items);
      } catch {
        return;
      }
    };

    void syncState();
    syncTimer = setInterval(() => {
      void syncState();
    }, 25000);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncState();
      }
    });

    return () => {
      active = false;
      if (syncTimer) {
        clearInterval(syncTimer);
      }
      appStateSubscription.remove();
    };
  }, [api, session, setNotifications, setReminders, setRemoteSettings]);

  useEffect(() => {
    const projectId = process.env.EXPO_PUBLIC_ROOMXCHANGE_PUSH_PROJECT_ID ?? "";
    setPushConfigured(Boolean(projectId));

    const boot = async () => {
      if (!pushEnabled || !settings.pushEnabled) {
        setPermissionStatus("unknown");
        setExpoPushToken(null);
        return;
      }

      try {
        const existing = await Notifications.getPermissionsAsync();
        let status = existing.status;
        if (status !== "granted") {
          const requested = await Notifications.requestPermissionsAsync();
          status = requested.status;
        }

        setPermissionStatus(status === "granted" ? "granted" : "denied");
        if (status === "granted" && projectId) {
          const token = await Notifications.getExpoPushTokenAsync({ projectId });
          setExpoPushToken(token.data);
        }
      } catch {
        setPermissionStatus("unavailable");
      }
    };

    void boot();

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      createNotification({
        title: notification.request.content.title ?? "RoomXchange",
        body: notification.request.content.body ?? "You have a new update.",
        listingId: typeof notification.request.content.data?.listingId === "string" ? notification.request.content.data.listingId : undefined,
        kind: "system"
      });
    });

    return () => {
      subscription.remove();
    };
  }, [createNotification, pushEnabled, setExpoPushToken, setPermissionStatus, setPushConfigured, settings.pushEnabled]);

  useEffect(() => {
    if (!banners.length) {
      return;
    }

    const timer = setTimeout(() => {
      dismissBanner(banners[0].id);
    }, 3200);

    return () => clearTimeout(timer);
  }, [banners, dismissBanner]);

  return (
    <>
      {children}
      <View pointerEvents="box-none" className="absolute inset-x-0 top-0 z-50 px-4 pt-16">
        {banners.map((item, index) => (
          <ScaleButton
            key={item.id}
            onPress={() => {
              dismissBanner(item.id);
              if (item.listingId) {
                router.push(`/listings/${item.listingId}`);
              } else {
                router.push("/notifications");
              }
            }}
          >
            <Animated.View
              className="mb-3 rounded-3xl bg-white px-4 py-4"
              style={{
                transform: [{ translateY: index * 2 }],
                shadowColor: "#111111",
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8
              }}
            >
              <Text className="font-jakarta-bold text-sm text-rx-text">{item.title}</Text>
              <Text className="mt-1 font-jakarta text-sm text-rx-muted">{item.body}</Text>
            </Animated.View>
          </ScaleButton>
        ))}
      </View>
    </>
  );
}

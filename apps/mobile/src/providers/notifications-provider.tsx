import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "expo-router";
import { Animated, AppState, Text, View } from "react-native";
import { Platform } from "react-native";
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
  const pushPreferenceKey = "roomxchange.mobile.push-enabled";
  const router = useRouter();
  const { api, session } = useSession();
  const banners = useNotificationStore((state) => state.banners);
  const dismissBanner = useNotificationStore((state) => state.dismissBanner);
  const setPermissionStatus = useNotificationStore((state) => state.setPermissionStatus);
  const setExpoPushToken = useNotificationStore((state) => state.setExpoPushToken);
  const setPushConfigured = useNotificationStore((state) => state.setPushConfigured);
  const pushEnabled = useNotificationStore((state) => state.pushEnabled);
  const setPushEnabled = useNotificationStore((state) => state.setPushEnabled);
  const expoPushToken = useNotificationStore((state) => state.expoPushToken);
  const settings = useNotificationStore((state) => state.settings);
  const setRemoteSettings = useNotificationStore((state) => state.setRemoteSettings);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const setReminders = useNotificationStore((state) => state.setReminders);
  const createNotification = useNotificationStore((state) => state.createNotification);
  const registeredTokenRef = useRef<{ userId: string; token: string } | null>(null);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(pushPreferenceKey).then((value) => {
      if (!active || value == null) {
        return;
      }
      setPushEnabled(value === "true");
    });

    return () => {
      active = false;
    };
  }, [setPushEnabled]);

  useEffect(() => {
    void SecureStore.setItemAsync(pushPreferenceKey, String(pushEnabled));
  }, [pushEnabled]);

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
    let active = true;
    const syncPushToken = async () => {
      const shouldRegister = Boolean(session?.user.userId && expoPushToken && pushEnabled && settings.pushEnabled);
      const previousRegistration = registeredTokenRef.current;

      if (!shouldRegister) {
        if (previousRegistration && session?.user.userId === previousRegistration.userId) {
          try {
            await api.unregisterPushToken({ token: previousRegistration.token });
          } catch {
            return;
          } finally {
            if (active) {
              registeredTokenRef.current = null;
            }
          }
        }
        return;
      }

      const nextRegistration = {
        userId: session!.user.userId,
        token: expoPushToken!
      };

      if (previousRegistration?.userId === nextRegistration.userId && previousRegistration.token === nextRegistration.token) {
        return;
      }

      try {
        if (previousRegistration?.userId === nextRegistration.userId && previousRegistration.token !== nextRegistration.token) {
          await api.unregisterPushToken({ token: previousRegistration.token });
        }
        await api.registerPushToken({
          token: expoPushToken!,
          platform: Platform.OS === "ios" ? "ios" : "android"
        });
        if (active) {
          registeredTokenRef.current = nextRegistration;
        }
      } catch {
        return;
      }
    };

    void syncPushToken();

    return () => {
      active = false;
    };
  }, [api, expoPushToken, pushEnabled, session, settings.pushEnabled]);

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

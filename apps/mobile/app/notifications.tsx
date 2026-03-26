import { useRouter } from "expo-router";
import { FlatList, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackIconButton } from "../src/components/back-icon-button";
import { ScreenHeader } from "../src/components/screen-header";
import { ScaleButton } from "../src/components/scale-button";
import { formatConversationTimestamp } from "@roomxchange/shared/src/mobile";
import { useSession } from "../src/session-provider";
import { useNotificationStore } from "../src/stores/notification-store";

export default function NotificationsScreen() {
  const router = useRouter();
  const { api } = useSession();
  const notifications = useNotificationStore((state) => state.notifications);
  const pushEnabled = useNotificationStore((state) => state.pushEnabled);
  const setPushEnabled = useNotificationStore((state) => state.setPushEnabled);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const settings = useNotificationStore((state) => state.settings);

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <ScreenHeader
        title="Notifications"
        left={<BackIconButton fallbackPath="/" />}
        right={
          <ScaleButton
            onPress={async () => {
              markAllAsRead();
              try {
                await api.markAllNotificationsRead();
              } catch {
                const refreshed = await api.getNotifications().catch(() => null);
                if (refreshed) {
                  useNotificationStore.getState().setNotifications(refreshed.items);
                }
              }
            }}
            className="rounded-full bg-rx-background px-3 py-2"
          >
            <Text className="font-jakarta text-[11px] text-rx-text">Read all</Text>
          </ScaleButton>
        }
      />

      <View className="mx-4 mb-4 flex-row items-center justify-between rounded-3xl bg-white p-4">
        <View className="mr-4 flex-1">
          <Text className="font-jakarta-bold text-sm text-rx-text">Push notifications</Text>
          <Text className="mt-1 font-jakarta text-sm text-rx-muted">
            Turn device alerts on or off for new matches and messages.
          </Text>
        </View>
        <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ false: "#EAEAEA", true: "#FFB6C4" }} thumbColor={pushEnabled ? "#FF385C" : "#FFFFFF"} />
      </View>

      <View className="mx-4 mb-4 rounded-3xl bg-white p-4">
        <Text className="font-jakarta-bold text-sm text-rx-text">System notification status</Text>
        <Text className="mt-1 font-jakarta text-sm text-rx-muted">
          {settings.pushEnabled
            ? "Notifications are enabled by the app."
            : "Notifications are currently disabled by the app administrator."}
        </Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          notifications.length ? (
            <View className="mb-4 flex-row justify-end">
              <ScaleButton
                onPress={async () => {
                  clearNotifications();
                  try {
                    await api.clearNotifications();
                  } catch {
                    const refreshed = await api.getNotifications().catch(() => null);
                    if (refreshed) {
                      useNotificationStore.getState().setNotifications(refreshed.items);
                    }
                  }
                }}
                className="rounded-full bg-white px-4 py-2"
              >
                <Text className="font-jakarta text-xs text-rx-text">Clear all</Text>
              </ScaleButton>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ScaleButton
            onPress={async () => {
              markAsRead(item.id);
              void api.updateNotification(item.id, { read: true }).catch(async () => {
                const refreshed = await api.getNotifications().catch(() => null);
                if (refreshed) {
                  useNotificationStore.getState().setNotifications(refreshed.items);
                }
              });
              if (item.listingId) {
                router.push(`/listings/${item.listingId}`);
              }
            }}
            className={`mb-3 rounded-3xl px-4 py-4 ${item.read ? "bg-white" : "bg-rx-accentSoft"}`}
          >
            <View className="flex-row items-start justify-between">
              <View className="mr-4 flex-1">
                <Text className="font-jakarta-bold text-base text-rx-text">{item.title}</Text>
                <Text className="mt-1 font-jakarta text-sm leading-6 text-rx-muted">{item.body}</Text>
                <Text className="mt-2 font-jakarta text-xs text-rx-muted">{formatConversationTimestamp(item.createdAt)}</Text>
              </View>
              <ScaleButton
                onPress={async () => {
                  deleteNotification(item.id);
                  try {
                    await api.deleteNotification(item.id);
                  } catch {
                    const refreshed = await api.getNotifications().catch(() => null);
                    if (refreshed) {
                      useNotificationStore.getState().setNotifications(refreshed.items);
                    }
                  }
                }}
                className="rounded-full bg-white px-3 py-2"
              >
                <Text className="font-jakarta text-xs text-rx-text">Delete</Text>
              </ScaleButton>
            </View>
          </ScaleButton>
        )}
        ListEmptyComponent={<Text className="font-jakarta text-sm text-rx-muted">Nothing new right now.</Text>}
      />
    </SafeAreaView>
  );
}

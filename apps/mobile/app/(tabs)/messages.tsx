import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthRedirectCard } from "../../src/components/auth-redirect-card";
import { ConversationItem } from "../../src/components/conversation-item";
import { ScaleButton } from "../../src/components/scale-button";
import { useSession } from "../../src/session-provider";
import { useChatStore } from "../../src/stores/chat-store";

export default function MessagesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, api } = useSession();
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const syncUnreadCounts = useChatStore((state) => state.syncUnreadCounts);
  const clearAllUnread = useChatStore((state) => state.clearAllUnread);
  const removeConversation = useChatStore((state) => state.removeConversation);

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.getConversations(),
    enabled: Boolean(session)
  });

  useEffect(() => {
    if (conversationsQuery.data?.items) {
      syncUnreadCounts(conversationsQuery.data.items);
    }
  }, [conversationsQuery.data?.items, syncUnreadCounts]);

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllConversationsRead(),
    onSuccess: async () => {
      clearAllUnread();
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) => api.deleteConversation(conversationId),
    onSuccess: async (_, conversationId) => {
      removeConversation(conversationId);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-rx-background">
        <View className="flex-1 p-4">
          <AuthRedirectCard
            title="Sign in to open your messages"
            description="Use phone verification to continue conversations, contact owners, and keep your inbox synced."
            redirectTo="/messages"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <FlatList
        data={conversationsQuery.data?.items ?? []}
        keyExtractor={(item) => item.conversationId}
        contentContainerStyle={{ padding: 16, paddingBottom: 176 }}
        ListHeaderComponent={
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className="font-jakarta-bold text-3xl text-rx-text">Messages</Text>
              <Text className="mt-1 font-jakarta text-sm text-rx-muted">Your active conversations</Text>
            </View>
            {(conversationsQuery.data?.items ?? []).some((item) => (unreadCounts[item.conversationId] ?? item.unreadCount) > 0) ? (
              <ScaleButton onPress={() => markAllReadMutation.mutate()} className="rounded-full bg-white px-4 py-2.5">
                <Text className="font-jakarta-bold text-xs text-rx-text">
                  {markAllReadMutation.isPending ? "Updating..." : "Mark all read"}
                </Text>
              </ScaleButton>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            unreadCount={unreadCounts[item.conversationId] ?? item.unreadCount}
            onPress={() => router.push({ pathname: "/messages/[conversationId]", params: { conversationId: item.conversationId } } as never)}
            onDelete={() =>
              Alert.alert("Delete conversation", "This removes the conversation from your inbox.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteConversationMutation.mutate(item.conversationId)
                }
              ])
            }
          />
        )}
        ListEmptyComponent={<Text className="font-jakarta text-sm text-rx-muted">{conversationsQuery.isLoading ? "Loading conversations..." : "No conversations yet."}</Text>}
      />
    </SafeAreaView>
  );
}

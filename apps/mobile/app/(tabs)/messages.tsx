import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthRedirectCard } from "../../src/components/auth-redirect-card";
import { ConversationItem } from "../../src/components/conversation-item";
import { EmptyStateCard } from "../../src/components/empty-state-card";
import { ScaleButton } from "../../src/components/scale-button";
import { ScreenHeader } from "../../src/components/screen-header";
import { SessionLoadingCard } from "../../src/components/session-loading-card";
import { useSession } from "../../src/session-provider";
import { useChatStore } from "../../src/stores/chat-store";

export default function MessagesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, api, hydrated } = useSession();
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const syncUnreadCounts = useChatStore((state) => state.syncUnreadCounts);
  const clearAllUnread = useChatStore((state) => state.clearAllUnread);
  const removeConversation = useChatStore((state) => state.removeConversation);
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);

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

  const conversations = conversationsQuery.data?.items ?? [];
  const selecting = selectedConversationIds.length > 0;
  const hasUnread = useMemo(
    () => conversations.some((item) => (unreadCounts[item.conversationId] ?? item.unreadCount) > 0),
    [conversations, unreadCounts]
  );

  const toggleConversationSelection = (conversationId: string) => {
    setSelectedConversationIds((current) =>
      current.includes(conversationId) ? current.filter((item) => item !== conversationId) : [...current, conversationId]
    );
  };

  if (!hydrated) {
    return (
      <SafeAreaView className="flex-1 bg-rx-background">
        <View className="flex-1 p-4">
          <SessionLoadingCard description="We are restoring your inbox and account details." />
        </View>
      </SafeAreaView>
    );
  }

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
      <ScreenHeader
        title={selecting ? `${selectedConversationIds.length} selected` : "Messages"}
        right={
          selecting ? (
            <ScaleButton
              onPress={() =>
                Alert.alert("Delete selected conversations", "These conversations will be removed only from your inbox.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      const ids = [...selectedConversationIds];
                      setSelectedConversationIds([]);
                      await Promise.all(ids.map((id) => deleteConversationMutation.mutateAsync(id)));
                    }
                  }
                ])
              }
              className="rounded-full bg-rx-accent px-3 py-2"
            >
              <Text className="font-jakarta-bold text-[11px] text-white">
                {deleteConversationMutation.isPending ? "Deleting..." : "Delete"}
              </Text>
            </ScaleButton>
          ) : hasUnread ? (
            <ScaleButton onPress={() => markAllReadMutation.mutate()} className="rounded-full bg-rx-background px-3 py-2">
              <Text className="font-jakarta-bold text-[11px] text-rx-text">
                {markAllReadMutation.isPending ? "Updating..." : "Mark all read"}
              </Text>
            </ScaleButton>
          ) : undefined
        }
      />
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversationId}
        contentContainerStyle={{ padding: 16, paddingBottom: 176 }}
        ListHeaderComponent={<Text className="mb-4 font-jakarta text-sm text-rx-muted">{selecting ? "Choose conversations to delete from your inbox." : "Your active conversations"}</Text>}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            unreadCount={unreadCounts[item.conversationId] ?? item.unreadCount}
            selecting={selecting}
            selected={selectedConversationIds.includes(item.conversationId)}
            onLongPress={() => toggleConversationSelection(item.conversationId)}
            onPress={() => {
              if (selecting) {
                toggleConversationSelection(item.conversationId);
                return;
              }
              router.push({ pathname: "/messages/[conversationId]", params: { conversationId: item.conversationId } } as never);
            }}
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
        ListEmptyComponent={
          <EmptyStateCard
            icon="chatbubbles-outline"
            title={conversationsQuery.isLoading ? "Loading conversations" : "No conversations yet"}
            description={
              conversationsQuery.isLoading
                ? "We are syncing your latest chats now."
                : "When you contact an owner, your messages will show up here so you can keep the conversation going."
            }
            actionLabel={conversationsQuery.isLoading ? undefined : "Explore listings"}
            onActionPress={conversationsQuery.isLoading ? undefined : () => router.push("/explore")}
          />
        }
      />
    </SafeAreaView>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthRedirectCard } from "../../src/components/auth-redirect-card";
import { Avatar } from "../../src/components/avatar";
import { BackIconButton } from "../../src/components/back-icon-button";
import { DismissKeyboardView } from "../../src/components/dismiss-keyboard-view";
import { openPhoneCall, openWhatsApp } from "../../src/lib/contact-actions";
import { ScaleButton } from "../../src/components/scale-button";
import { SessionLoadingCard } from "../../src/components/session-loading-card";
import { useSession } from "../../src/session-provider";
import { useChatStore } from "../../src/stores/chat-store";

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { api, session, hydrated } = useSession();
  const [body, setBody] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const clearUnread = useChatStore((state) => state.clearUnread);

  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.getConversations(),
    enabled: Boolean(session)
  });

  const messagesQuery = useQuery({
    queryKey: ["conversation-messages", params.conversationId],
    queryFn: () => api.getConversationMessages(params.conversationId),
    enabled: Boolean(session)
  });

  const conversation = useMemo(
    () => conversationsQuery.data?.items.find((item) => item.conversationId === params.conversationId) ?? null,
    [conversationsQuery.data?.items, params.conversationId]
  );
  const listingQuery = useQuery({
    queryKey: ["conversation-listing", conversation?.listingId],
    queryFn: () => api.getListing(conversation!.listingId),
    enabled: Boolean(session && conversation?.listingId)
  });
  const participantPhone =
    listingQuery.data?.ownerId === conversation?.participant.userId ? (listingQuery.data?.ownerContact.phone ?? null) : null;

  useEffect(() => {
    setActiveConversationId(params.conversationId);
    clearUnread(params.conversationId);
    return () => setActiveConversationId(null);
  }, [clearUnread, params.conversationId, setActiveConversationId]);

  const sendMutation = useMutation({
    mutationFn: () => api.sendConversationMessage(params.conversationId, { body }),
    onSuccess: (message) => {
      setBody("");
      queryClient.setQueryData(["conversation-messages", params.conversationId], (current: any) => ({
        items: [...(current?.items ?? []), message],
        nextCursor: current?.nextCursor ?? null
      }));
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  const deleteMessagesMutation = useMutation({
    mutationFn: (messageIds: string[]) => api.deleteConversationMessages(params.conversationId, { messageIds }),
    onSuccess: async (_, messageIds) => {
      setSelectedMessageIds([]);
      queryClient.setQueryData(["conversation-messages", params.conversationId], (current: any) => ({
        items: (current?.items ?? []).filter((item: any) => !messageIds.includes(item.messageId)),
        nextCursor: current?.nextCursor ?? null
      }));
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  });

  const sendMessage = () => {
    if (!body.trim() || sendMutation.isPending) {
      return;
    }

    sendMutation.mutate();
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds((current) =>
      current.includes(messageId) ? current.filter((item) => item !== messageId) : [...current, messageId]
    );
  };

  const openParticipantProfile = () => {
    if (!conversation) {
      return;
    }

    router.push({
      pathname: "/publishers/[userId]",
      params: {
        userId: conversation.participant.userId,
        name: conversation.participant.name,
        avatar: conversation.participant.avatar ?? "",
        listingId: conversation.listingId
      }
    } as never);
  };

  if (!hydrated) {
    return (
      <SafeAreaView className="flex-1 bg-rx-background">
        <View className="flex-1 p-4">
          <SessionLoadingCard description="We are restoring your conversation and account details." />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-rx-background">
        <View className="flex-1 p-4">
          <AuthRedirectCard
            title="Sign in to view this conversation"
            description="Login with your phone number to reply, receive new messages, and keep your inbox saved."
            redirectTo={`/messages/${params.conversationId}`}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-rx-background" edges={["top", "bottom"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={12}>
        <DismissKeyboardView className="flex-1">
          <View className="flex-row items-center border-b border-rx-border bg-white px-4 py-4">
            <BackIconButton fallbackPath="/messages" />
            {selectedMessageIds.length > 0 ? (
              <>
                <View className="ml-3 flex-1">
                  <Text className="font-jakarta-bold text-base text-rx-text">
                    {selectedMessageIds.length} selected
                  </Text>
                  <Text className="font-jakarta text-xs text-rx-muted">Choose messages to remove from your view</Text>
                </View>
                <ScaleButton onPress={() => setSelectedMessageIds([])} className="mr-2 rounded-full bg-rx-background px-4 py-2.5">
                  <Text className="font-jakarta-bold text-xs text-rx-text">Cancel</Text>
                </ScaleButton>
                <ScaleButton
                  onPress={() =>
                    Alert.alert("Delete selected messages", "These messages will be removed only for you.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteMessagesMutation.mutate(selectedMessageIds)
                      }
                    ])
                  }
                  className="rounded-full bg-rx-accent px-4 py-2.5"
                >
                  <Text className="font-jakarta-bold text-xs text-white">
                    {deleteMessagesMutation.isPending ? "Deleting..." : "Delete"}
                  </Text>
                </ScaleButton>
              </>
            ) : (
              <ScaleButton onPress={openParticipantProfile} className="ml-3 flex-1 rounded-full">
                <View className="flex-row items-center">
                  {conversation ? <Avatar name={conversation.participant.name} avatar={conversation.participant.avatar} size={40} /> : null}
                  <View className="ml-3 flex-1">
                    <Text className="font-jakarta-bold text-base text-rx-text">{conversation?.participant.name ?? "Conversation"}</Text>
                    <Text className="font-jakarta text-xs text-rx-muted">{conversation?.listingTitle ?? "Marketplace chat"}</Text>
                    {participantPhone ? (
                      <View className="mt-1 flex-row items-center gap-2">
                        <ScaleButton onPress={() => openPhoneCall(participantPhone)} className="rounded-full">
                          <Text className="font-jakarta text-xs text-rx-accent">{participantPhone}</Text>
                        </ScaleButton>
                        <ScaleButton onPress={() => openWhatsApp(participantPhone)} className="rounded-full bg-rx-background px-2.5 py-1.5">
                          <Text className="font-jakarta-bold text-[11px] text-rx-text">WhatsApp</Text>
                        </ScaleButton>
                      </View>
                    ) : null}
                  </View>
                </View>
              </ScaleButton>
            )}
          </View>

          <FlatList
            data={messagesQuery.data?.items ?? []}
            keyExtractor={(item) => item.messageId}
            className="flex-1"
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            renderItem={({ item }) => {
              const mine = item.senderId === session.user.userId;
              const selected = selectedMessageIds.includes(item.messageId);
              const selecting = selectedMessageIds.length > 0;
              return (
                <View className={`mb-3 flex-row items-center ${mine ? "justify-end" : "justify-start"}`}>
                  {selecting ? (
                    <View className={`mr-3 h-6 w-6 items-center justify-center rounded-full border ${selected ? "border-rx-accent bg-rx-accent" : "border-rx-border bg-white"}`}>
                      {selected ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                    </View>
                  ) : null}
                  <ScaleButton
                    onPress={() => {
                      if (!selecting) {
                        return;
                      }
                      toggleMessageSelection(item.messageId);
                    }}
                    onLongPress={() => {
                      toggleMessageSelection(item.messageId);
                    }}
                    className={`max-w-[80%] rounded-3xl px-4 py-3 ${mine ? "bg-rx-accent" : "bg-white"}`}
                  >
                    <Text className={`font-jakarta text-sm ${mine ? "text-white" : "text-rx-text"}`}>{item.body}</Text>
                  </ScaleButton>
                </View>
              );
            }}
            ListEmptyComponent={<Text className="font-jakarta text-sm text-rx-muted">{messagesQuery.isLoading ? "Loading messages..." : "No messages yet."}</Text>}
          />

          <View className="border-t border-rx-border bg-white px-4 pb-6 pt-4">
            <View className="flex-row items-center">
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Write a message"
                placeholderTextColor="#6B7280"
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                className="mr-3 flex-1 rounded-full bg-rx-background px-5 py-4 font-jakarta text-base leading-6 text-rx-text"
              />
              <ScaleButton
                onPress={sendMessage}
                disabled={!body.trim() || sendMutation.isPending}
                className={`rounded-full px-5 py-4 ${!body.trim() || sendMutation.isPending ? "bg-rx-border" : "bg-rx-accent"}`}
              >
                <Text className="font-jakarta-bold text-sm text-white">Send</Text>
              </ScaleButton>
            </View>
          </View>
        </DismissKeyboardView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

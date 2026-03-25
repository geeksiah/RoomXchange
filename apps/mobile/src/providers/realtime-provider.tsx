import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import {
  buildRealtimeUrl,
  parseRealtimeEvent,
  type ConversationListResponse,
  type ConversationMessageListResponse
} from "@roomxchange/shared";
import { useSession } from "../session-provider";
import { useChatStore } from "../stores/chat-store";
import { useNotificationStore } from "../stores/notification-store";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { api, session } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session?.tokens.accessToken) {
      useChatStore.getState().setConnected(false);
      return;
    }

    const url = buildRealtimeUrl(session.tokens.accessToken);
    if (!url) {
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconcileTimer: ReturnType<typeof setInterval> | null = null;
    let retryCount = 0;
    let active = true;
    const reconcileConversations = async () => {
      try {
        const next = await api.getConversations();
        useChatStore.getState().syncUnreadCounts(next.items);
        queryClient.setQueryData<ConversationListResponse>(["conversations"], next);
      } catch {
        return;
      }
    };

    const connect = () => {
      socket = new WebSocket(url);

      socket.onopen = () => {
        retryCount = 0;
        useChatStore.getState().setConnected(true);
        void reconcileConversations();
      };

      socket.onclose = () => {
        useChatStore.getState().setConnected(false);
        if (!active) {
          return;
        }

        reconnectTimer = setTimeout(connect, Math.min(5000, 1000 * (retryCount + 1)));
        retryCount += 1;
      };

      socket.onmessage = (event) => {
        try {
          const parsed = parseRealtimeEvent(JSON.parse(String(event.data)));
          if (parsed.type === "notification.created") {
            useNotificationStore.getState().upsertNotification(parsed.notification, true);
            return;
          }

          if (parsed.type !== "message.sent") {
            return;
          }

          const activeConversationId = useChatStore.getState().activeConversationId;
          const isActive = activeConversationId === parsed.conversation.conversationId;
          useChatStore.getState().applyConversation(parsed.conversation, isActive);

          queryClient.setQueryData<ConversationListResponse>(["conversations"], (current) => {
            const items = current?.items ?? [];
            const next = [parsed.conversation, ...items.filter((item) => item.conversationId !== parsed.conversation.conversationId)]
              .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
            return { items: next };
          });

          if (isActive) {
            queryClient.setQueryData<ConversationMessageListResponse>(
              ["conversation-messages", parsed.conversation.conversationId],
              (current) => {
                const items = current?.items ?? [];
                if (items.some((item) => item.messageId === parsed.message.messageId)) {
                  return current;
                }

                return {
                  items: [...items, parsed.message],
                  nextCursor: current?.nextCursor ?? null
                };
              }
            );
          }
        } catch {
          return;
        }
      };
    };

    connect();
    reconcileTimer = setInterval(() => {
      void reconcileConversations();
    }, 20000);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void reconcileConversations();
      }
    });

    return () => {
      active = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (reconcileTimer) {
        clearInterval(reconcileTimer);
      }
      appStateSubscription.remove();
      useChatStore.getState().setConnected(false);
      socket?.close();
    };
  }, [api, queryClient, session?.tokens.accessToken]);

  return children;
}

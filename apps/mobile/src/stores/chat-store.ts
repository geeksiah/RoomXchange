import { create } from "zustand";
import type { ConversationSummary } from "@roomxchange/shared";

type ChatState = {
  activeConversationId: string | null;
  connected: boolean;
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;
  setConnected: (value: boolean) => void;
  setActiveConversationId: (value: string | null) => void;
  syncUnreadCounts: (items: ConversationSummary[]) => void;
  applyConversation: (conversation: ConversationSummary, isActive: boolean) => void;
  clearUnread: (conversationId: string) => void;
  clearAllUnread: () => void;
  removeConversation: (conversationId: string) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  connected: false,
  unreadCounts: {},
  totalUnreadCount: 0,
  setConnected: (value) => set({ connected: value }),
  setActiveConversationId: (value) => set({ activeConversationId: value }),
  syncUnreadCounts: (items) =>
    set(() => {
      const unreadCounts = Object.fromEntries(items.map((item) => [item.conversationId, item.unreadCount]));
      return {
        unreadCounts,
        totalUnreadCount: Object.values(unreadCounts).reduce((sum, value) => sum + value, 0)
      };
    }),
  applyConversation: (conversation, isActive) =>
    set((state) => {
      const unreadCounts = {
        ...state.unreadCounts,
        [conversation.conversationId]: isActive ? 0 : conversation.unreadCount
      };
      return {
        unreadCounts,
        totalUnreadCount: Object.values(unreadCounts).reduce((sum, value) => sum + value, 0)
      };
    }),
  clearUnread: (conversationId) =>
    set((state) => {
      const unreadCounts = {
        ...state.unreadCounts,
        [conversationId]: 0
      };
      return {
        unreadCounts,
        totalUnreadCount: Object.values(unreadCounts).reduce((sum, value) => sum + value, 0)
      };
    }),
  clearAllUnread: () =>
    set((state) => {
      const unreadCounts = Object.fromEntries(Object.keys(state.unreadCounts).map((conversationId) => [conversationId, 0]));
      return {
        unreadCounts,
        totalUnreadCount: 0
      };
    }),
  removeConversation: (conversationId) =>
    set((state) => {
      const unreadCounts = { ...state.unreadCounts };
      delete unreadCounts[conversationId];
      return {
        unreadCounts,
        totalUnreadCount: Object.values(unreadCounts).reduce((sum, value) => sum + value, 0)
      };
    })
}));

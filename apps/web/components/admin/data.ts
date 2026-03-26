"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdminConversationListQuery,
  AdminEventListQuery,
  AdminListingListQuery,
  AdminReportListQuery,
  AdminSubscriptionListQuery,
  AdminUserListQuery,
  AdminSubscriptionUpdateInput,
  AdminUserUpdateInput,
  ListingUpdateInput,
  NotificationSettings,
  ReportUpdateInput
} from "@roomxchange/shared";
import { useSession } from "../session-provider";

export const adminKeys = {
  analytics: ["admin-analytics"] as const,
  users: ["admin-users"] as const,
  listings: ["admin-listings"] as const,
  reports: ["admin-reports"] as const,
  conversations: ["admin-conversations"] as const,
  subscriptions: ["admin-subscriptions"] as const,
  events: ["admin-events"] as const,
  notificationSettings: ["admin-notification-settings"] as const
};

function useAdminEnabled() {
  const { session } = useSession();
  return Boolean(session && session.user.role !== "member");
}

export function useAdminAnalytics() {
  const { api } = useSession();
  const enabled = useAdminEnabled();

  return useQuery({
    queryKey: adminKeys.analytics,
    queryFn: () => api.getAdminAnalytics(),
    enabled,
    refetchInterval: 30_000
  });
}

export function useAdminUsers(query: Partial<AdminUserListQuery> = {}) {
  const { api } = useSession();
  const enabled = useAdminEnabled();

  return useQuery({
    queryKey: [...adminKeys.users, query],
    queryFn: () => api.getAdminUsers(query),
    enabled,
    refetchInterval: 45_000
  });
}

export function useAdminListings(query: Partial<AdminListingListQuery> = {}) {
  const { api } = useSession();
  const enabled = useAdminEnabled();

  return useQuery({
    queryKey: [...adminKeys.listings, query],
    queryFn: () => api.getAdminListings(query),
    enabled,
    refetchInterval: 20_000
  });
}

export function useAdminReports(query: Partial<AdminReportListQuery> = {}) {
  const { api } = useSession();
  const enabled = useAdminEnabled();

  return useQuery({
    queryKey: [...adminKeys.reports, query],
    queryFn: () => api.getAdminReports(query),
    enabled,
    refetchInterval: 15_000
  });
}

export function useAdminConversations(query: Partial<AdminConversationListQuery> = {}) {
  const { api } = useSession();
  const enabled = useAdminEnabled();

  return useQuery({
    queryKey: [...adminKeys.conversations, query],
    queryFn: () => api.getAdminConversations(query),
    enabled,
    refetchInterval: 15_000
  });
}

export function useAdminSubscriptions(query: Partial<AdminSubscriptionListQuery> = {}) {
  const { api } = useSession();
  const enabled = useAdminEnabled();

  return useQuery({
    queryKey: [...adminKeys.subscriptions, query],
    queryFn: () => api.getAdminSubscriptions(query),
    enabled,
    refetchInterval: 45_000
  });
}

export function useAdminEvents(query: Partial<AdminEventListQuery> = {}) {
  const { api } = useSession();
  const enabled = useAdminEnabled();

  return useQuery({
    queryKey: [...adminKeys.events, query],
    queryFn: () => api.getAdminEvents(query),
    enabled,
    refetchInterval: 15_000
  });
}

export function useAdminNotificationSettings() {
  const { api } = useSession();
  const enabled = useAdminEnabled();

  return useQuery({
    queryKey: adminKeys.notificationSettings,
    queryFn: () => api.getAdminNotificationSettings(),
    enabled,
    refetchInterval: 60_000
  });
}

export function useAdminUserMutation() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: AdminUserUpdateInput }) => api.updateAdminUser(userId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.users }),
        queryClient.invalidateQueries({ queryKey: adminKeys.analytics }),
        queryClient.invalidateQueries({ queryKey: adminKeys.subscriptions })
      ]);
    }
  });
}

export function useAdminListingMutation() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, input }: { listingId: string; input: ListingUpdateInput }) => api.updateAdminListing(listingId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.listings }),
        queryClient.invalidateQueries({ queryKey: adminKeys.analytics }),
        queryClient.invalidateQueries({ queryKey: adminKeys.reports })
      ]);
    }
  });
}

export function useAdminListingDeleteMutation() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listingId: string) => api.deleteAdminListing(listingId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.listings }),
        queryClient.invalidateQueries({ queryKey: adminKeys.analytics }),
        queryClient.invalidateQueries({ queryKey: adminKeys.reports })
      ]);
    }
  });
}

export function useAdminReportMutation() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, input }: { reportId: string; input: ReportUpdateInput }) => api.updateAdminReport(reportId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.reports }),
        queryClient.invalidateQueries({ queryKey: adminKeys.analytics })
      ]);
    }
  });
}

export function useAdminConversationDeleteMutation() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => api.deleteAdminConversation(conversationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.conversations }),
        queryClient.invalidateQueries({ queryKey: adminKeys.analytics })
      ]);
    }
  });
}

export function useAdminSubscriptionMutation() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: AdminSubscriptionUpdateInput }) => api.updateAdminSubscription(userId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.subscriptions }),
        queryClient.invalidateQueries({ queryKey: adminKeys.users }),
        queryClient.invalidateQueries({ queryKey: adminKeys.analytics })
      ]);
    }
  });
}

export function useAdminNotificationSettingsMutation() {
  const { api } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Partial<NotificationSettings>) => api.updateAdminNotificationSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.notificationSettings });
    }
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../../../components/session-provider";

const subscriptionStatuses = ["inactive", "active", "past_due", "expired", "cancelled"] as const;

export default function AdminSubscriptionsPage() {
  const { api, session } = useSession();
  const queryClient = useQueryClient();

  const subscriptionsQuery = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => api.getAdminSubscriptions(),
    enabled: Boolean(session && session.user.role !== "member")
  });

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      subscriptionStatus,
      isSubscribed
    }: {
      userId: string;
      subscriptionStatus: (typeof subscriptionStatuses)[number];
      isSubscribed: boolean;
    }) => api.updateAdminSubscription(userId, { subscriptionStatus, isSubscribed }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    }
  });

  const users = subscriptionsQuery.data ?? [];

  return (
    <section className="admin-workspace">
      <div className="admin-page-head">
        <div>
          <h1>Subscriptions</h1>
          <p>Access state and recovery controls.</p>
        </div>
      </div>

      <div className="grid">
        {users.length ? (
          users.map((user) => (
            <article key={user.userId} className="admin-record-card">
              <div className="admin-record-head">
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{user.name}</strong>
                  <span className="admin-record-meta">
                    {user.email ?? user.phone} · {user.subscriptionPlan ?? "No plan"}
                  </span>
                </div>
                <div className="admin-actions">
                  <span className="admin-tag">{user.subscriptionStatus}</span>
                  <span className="admin-tag">{user.isSubscribed ? "active access" : "blocked"}</span>
                </div>
              </div>

              <div className="admin-actions">
                <select
                  className="admin-select"
                  defaultValue={user.subscriptionStatus}
                  onChange={(event) =>
                    updateMutation.mutate({
                      userId: user.userId,
                      subscriptionStatus: event.target.value as (typeof subscriptionStatuses)[number],
                      isSubscribed: event.target.value === "active"
                    })
                  }
                >
                  {subscriptionStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  className="button secondary"
                  onClick={() => updateMutation.mutate({ userId: user.userId, subscriptionStatus: "active", isSubscribed: true })}
                >
                  Force active
                </button>
                <button
                  className="button"
                  onClick={() => updateMutation.mutate({ userId: user.userId, subscriptionStatus: "expired", isSubscribed: false })}
                >
                  Expire
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">{subscriptionsQuery.isLoading ? "Loading subscriptions..." : "No subscriptions."}</div>
        )}
      </div>
    </section>
  );
}

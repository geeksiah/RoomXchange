"use client";

import { useState } from "react";
import { useAdminSubscriptionMutation, useAdminSubscriptions } from "../../../../components/admin/data";
import { ActionDropdown, DataTable, EmptyState, PageHeader, PaginationControls, StatusBadge } from "../../../../components/admin/ui";

const subscriptionStatuses = ["inactive", "active", "past_due", "expired", "cancelled"] as const;

export default function AdminSubscriptionsPage() {
  const updateMutation = useAdminSubscriptionMutation();
  const [searchQuery, setSearchQuery] = useState("");
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack[cursorStack.length - 1];
  const subscriptionsQuery = useAdminSubscriptions({
    limit: 20,
    cursor: currentCursor,
    query: searchQuery || undefined
  });
  const users = subscriptionsQuery.data?.items ?? [];

  return (
    <section className="admin-workspace">
      <PageHeader title="Subscriptions" description="Access recovery and subscription-state control." />

      <article className="admin-panel">
        <div className="admin-inline-filters" style={{ marginBottom: 16 }}>
          <input
            className="admin-select"
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCursorStack([]);
            }}
            placeholder="Search subscriptions"
            value={searchQuery}
          />
        </div>
        <DataTable
          columns={[
            {
              key: "user",
              header: "User",
              cell: (user) => (
                <div className="admin-cell-stack">
                  <strong>{user.name}</strong>
                  <small>{user.email ?? user.phone}</small>
                </div>
              )
            },
            {
              key: "plan",
              header: "Plan",
              cell: (user) => user.subscriptionPlan ?? "No plan"
            },
            {
              key: "status",
              header: "Status",
              cell: (user) => <StatusBadge value={user.subscriptionStatus} />
            },
            {
              key: "access",
              header: "Access",
              cell: (user) => <StatusBadge value={user.isSubscribed ? "active access" : "blocked"} />
            },
            {
              key: "actions",
              header: "",
              className: "admin-cell-actions",
              cell: (user) => (
                <ActionDropdown
                  items={[
                    {
                      label: "Force active",
                      onSelect: () =>
                        updateMutation.mutate({ userId: user.userId, input: { subscriptionStatus: "active", isSubscribed: true } })
                    },
                    {
                      label: "Expire access",
                      onSelect: () =>
                        updateMutation.mutate({ userId: user.userId, input: { subscriptionStatus: "expired", isSubscribed: false } })
                    },
                    ...subscriptionStatuses.map((status) => ({
                      label: `Set ${status.replace(/_/g, " ")}`,
                      onSelect: () =>
                        updateMutation.mutate({
                          userId: user.userId,
                          input: { subscriptionStatus: status, isSubscribed: status === "active" }
                        })
                    }))
                  ]}
                />
              )
            }
          ]}
          empty={<EmptyState title="No subscription records" description="Subscription state will appear here once accounts begin subscribing." />}
          loading={subscriptionsQuery.isLoading}
          rowKey={(user) => user.userId}
          rows={users}
        />
        <PaginationControls
          canNext={Boolean(subscriptionsQuery.data?.nextCursor)}
          canPrevious={cursorStack.length > 0}
          currentCount={users.length}
          onNext={() => {
            if (subscriptionsQuery.data?.nextCursor) {
              setCursorStack((current) => [...current, subscriptionsQuery.data?.nextCursor as string]);
            }
          }}
          onPrevious={() => setCursorStack((current) => current.slice(0, -1))}
          total={subscriptionsQuery.data?.total ?? 0}
        />
      </article>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { getInitials } from "@roomxchange/shared";
import type { UserProfile } from "@roomxchange/shared";
import { useAdminAnalytics, useAdminUserMutation, useAdminUsers } from "../../../../components/admin/data";
import { ActionDropdown, DataTable, EmptyState, PageHeader, PaginationControls, SegmentTabs, StatCard, StatusBadge } from "../../../../components/admin/ui";

type ActivityFilter = "all" | "has-listings" | "no-listings" | "subscribed";

function readUserFilters() {
  if (typeof window === "undefined") {
    return { role: "all", status: "all", activity: "all", userId: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    role: params.get("role") ?? "all",
    status: params.get("status") ?? "all",
    activity: params.get("activity") ?? "all",
    userId: params.get("user") ?? ""
  };
}

export default function AdminUsersPage() {
  const analyticsQuery = useAdminAnalytics();
  const updateMutation = useAdminUserMutation();
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkPending, setBulkPending] = useState(false);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack[cursorStack.length - 1];

  useEffect(() => {
    const filters = readUserFilters();
    setRoleFilter(filters.role);
    setStatusFilter(filters.status);
    setActivityFilter(filters.activity as ActivityFilter);
    setSelectedUserId(filters.userId);
  }, []);

  const usersQuery = useAdminUsers({
    limit: 20,
    cursor: currentCursor,
    query: searchQuery || undefined,
    role: roleFilter === "all" ? undefined : (roleFilter as UserProfile["role"]),
    accountStatus: statusFilter === "all" ? undefined : (statusFilter as UserProfile["accountStatus"]),
    activity: activityFilter === "all" ? undefined : activityFilter === "has-listings" ? "has_listings" : activityFilter === "no-listings" ? "no_listings" : "subscribed"
  });

  const users = usersQuery.data?.items ?? [];
  const analytics = analyticsQuery.data;

  const selectedUser =
    users.find((user) => user.userId === selectedUserId) ??
    users[0] ??
    null;

  const handleUpdate = (userId: string, input: Partial<Pick<UserProfile, "role" | "accountStatus">>) => {
    updateMutation.mutate({ userId, input });
  };

  const allVisibleSelected = users.length > 0 && users.every((user) => selectedUserIds.includes(user.userId));

  const toggleSelectedUser = (userId: string) => {
    setSelectedUserIds((current) => (current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]));
  };

  const toggleAllVisibleUsers = () => {
    setSelectedUserIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !users.some((user) => user.userId === id));
      }

      return Array.from(new Set([...current, ...users.map((user) => user.userId)]));
    });
  };

  const runBulkUpdate = async (input: Partial<Pick<UserProfile, "role" | "accountStatus">>) => {
    if (!selectedUserIds.length) {
      return;
    }

    try {
      setBulkPending(true);
      await Promise.all(selectedUserIds.map((userId) => updateMutation.mutateAsync({ userId, input })));
      setSelectedUserIds([]);
    } finally {
      setBulkPending(false);
    }
  };

  return (
    <section className="admin-workspace">
      <PageHeader title="Users" description="Account access, role control, and immediate moderation state." />

      <div className="admin-stats">
        <StatCard label="All users" tone="accent" value={analytics?.totalUsers ?? 0} />
        <StatCard href="/dashboard/admin/users?status=active" label="Active" tone="success" value={analytics?.activeUsers ?? 0} />
        <StatCard href="/dashboard/admin/users?status=frozen" label="Frozen" tone="warning" value={analytics?.frozenUsers ?? 0} />
        <StatCard href="/dashboard/admin/users?role=admin" label="Admin seats" tone="info" value={analytics?.totalAdmins ?? 0} />
      </div>

      {selectedUser ? (
        <article className="admin-panel">
          <div className="admin-detail-head">
            <div className="admin-user-summary">
              <span className="admin-avatar admin-avatar-large">{getInitials(selectedUser.name)}</span>
              <div>
                <h3>{selectedUser.name}</h3>
                <p>{selectedUser.email ?? selectedUser.phone}</p>
              </div>
            </div>
            <div className="admin-actions">
              <StatusBadge value={selectedUser.role} />
              <StatusBadge value={selectedUser.accountStatus} />
              <StatusBadge value={selectedUser.subscriptionStatus} />
            </div>
          </div>
          <div className="admin-detail-grid">
            <div>
              <span className="admin-detail-label">Listings</span>
              <strong>{selectedUser.listingsCount}</strong>
            </div>
            <div>
              <span className="admin-detail-label">Successful listings</span>
              <strong>{selectedUser.successfulListings}</strong>
            </div>
            <div>
              <span className="admin-detail-label">Joined</span>
              <strong>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(selectedUser.createdAt))}</strong>
            </div>
            <div>
              <span className="admin-detail-label">Phone visibility</span>
              <strong>{selectedUser.phonePublic ? "Public" : "Private"}</strong>
            </div>
          </div>
          <div className="admin-actions">
            <Link className="button secondary" href={`/dashboard/admin/listings?owner=${selectedUser.userId}` as Route}>
              View listings
            </Link>
            <Link className="button secondary" href={`/dashboard/reports?user=${selectedUser.userId}` as Route}>
              View reports
            </Link>
          </div>
        </article>
      ) : null}

      <article className="admin-panel">
        <div className="admin-table-toolbar">
          <SegmentTabs
            onChange={(value) => {
              setStatusFilter(value);
              setCursorStack([]);
            }}
            options={[
              { label: "All statuses", value: "all" },
              { label: "Active", value: "active" },
              { label: "Frozen", value: "frozen" },
              { label: "Removed", value: "removed" }
            ]}
            value={statusFilter}
          />
          <div className="admin-inline-filters">
            <input
              className="admin-select"
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCursorStack([]);
              }}
              placeholder="Search users"
              value={searchQuery}
            />
            <select className="admin-select" onChange={(event) => {
              setRoleFilter(event.target.value);
              setCursorStack([]);
            }} value={roleFilter}>
              <option value="all">All roles</option>
              <option value="member">Member</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
            <select className="admin-select" onChange={(event) => {
              setActivityFilter(event.target.value as ActivityFilter);
              setCursorStack([]);
            }} value={activityFilter}>
              <option value="all">All activity</option>
              <option value="has-listings">Has listings</option>
              <option value="no-listings">No listings</option>
              <option value="subscribed">Subscribed</option>
            </select>
          </div>
        </div>

        {selectedUserIds.length ? (
          <div className="admin-bulk-bar">
            <strong>{selectedUserIds.length} selected</strong>
            <div className="admin-actions">
              <button className="button secondary" disabled={bulkPending} onClick={() => runBulkUpdate({ role: "moderator" })} type="button">
                Set moderator
              </button>
              <button className="button secondary" disabled={bulkPending} onClick={() => runBulkUpdate({ accountStatus: "active" })} type="button">
                Activate
              </button>
              <button className="button secondary" disabled={bulkPending} onClick={() => runBulkUpdate({ accountStatus: "frozen" })} type="button">
                Freeze
              </button>
              <button className="button secondary" disabled={bulkPending} onClick={() => setSelectedUserIds([])} type="button">
                Clear
              </button>
            </div>
          </div>
        ) : null}

        <DataTable
          columns={[
            {
              key: "select",
              header: "",
              className: "admin-cell-check",
              cell: (user) => (
                <input
                  aria-label={`Select ${user.name}`}
                  checked={selectedUserIds.includes(user.userId)}
                  onChange={() => toggleSelectedUser(user.userId)}
                  type="checkbox"
                />
              )
            },
            {
              key: "identity",
              header: "User",
              cell: (user) => (
                <button className="admin-table-identity" onClick={() => setSelectedUserId(user.userId)} type="button">
                  <span className="admin-avatar" style={{ background: "var(--rx-accent-soft)", color: "var(--rx-accent)" }}>
                    {getInitials(user.name)}
                  </span>
                  <span>
                    <strong>{user.name}</strong>
                    <small>{user.email ?? user.phone}</small>
                  </span>
                </button>
              )
            },
            {
              key: "role",
              header: "Role",
              cell: (user) => <StatusBadge value={user.role} />
            },
            {
              key: "status",
              header: "Status",
              cell: (user) => <StatusBadge value={user.accountStatus} />
            },
            {
              key: "activity",
              header: "Activity",
              cell: (user) => (
                <div className="admin-cell-stack">
                  <strong>{user.listingsCount} listings</strong>
                  <small>{user.isSubscribed ? "Subscribed" : user.subscriptionStatus.replace(/_/g, " ")}</small>
                </div>
              )
            },
            {
              key: "actions",
              header: "",
              className: "admin-cell-actions",
              cell: (user) => (
                <ActionDropdown
                  items={[
                    { label: "Set as moderator", onSelect: () => handleUpdate(user.userId, { role: "moderator" }) },
                    { label: "Set as admin", onSelect: () => handleUpdate(user.userId, { role: "admin" }) },
                    { label: "Activate account", onSelect: () => handleUpdate(user.userId, { accountStatus: "active" }) },
                    { label: "Freeze account", onSelect: () => handleUpdate(user.userId, { accountStatus: "frozen" }) },
                    { label: "Remove account", danger: true, onSelect: () => handleUpdate(user.userId, { accountStatus: "removed" }) }
                  ]}
                />
              )
            }
          ]}
          empty={<EmptyState title="No matching users" description="Adjust the current search or filters to widen the result set." />}
          loading={usersQuery.isLoading}
          rowKey={(user) => user.userId}
          rows={users}
        />
        {users.length ? (
          <div className="admin-table-select-row">
            <label>
              <input checked={allVisibleSelected} onChange={toggleAllVisibleUsers} type="checkbox" /> Select page
            </label>
          </div>
        ) : null}
        <PaginationControls
          canNext={Boolean(usersQuery.data?.nextCursor)}
          canPrevious={cursorStack.length > 0}
          currentCount={users.length}
          onNext={() => {
            if (usersQuery.data?.nextCursor) {
              setCursorStack((current) => [...current, usersQuery.data?.nextCursor as string]);
            }
          }}
          onPrevious={() => setCursorStack((current) => current.slice(0, -1))}
          total={usersQuery.data?.total ?? 0}
        />
      </article>
    </section>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../../../components/session-provider";

const roleOptions = ["member", "moderator", "admin", "super_admin"] as const;
const statusOptions = ["active", "frozen", "removed"] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AdminUsersPage() {
  const { api, session } = useSession();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.getAdminUsers(),
    enabled: Boolean(session && session.user.role !== "member")
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, role, accountStatus }: { userId: string; role?: (typeof roleOptions)[number]; accountStatus?: (typeof statusOptions)[number] }) =>
      api.updateAdminUser(userId, { role, accountStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    }
  });

  const users = usersQuery.data ?? [];
  const activeCount = users.filter((user) => user.accountStatus === "active").length;
  const frozenCount = users.filter((user) => user.accountStatus === "frozen").length;
  const adminCount = users.filter((user) => user.role !== "member").length;

  return (
    <section className="admin-workspace">
      <div className="admin-page-head">
        <div>
          <h1>Users</h1>
          <p>Accounts, access, and admin roles.</p>
        </div>
      </div>

      <div className="admin-stats">
        <article className="admin-stat-card soft-accent">
          <span className="admin-stat-label">Total</span>
          <strong className="admin-stat-value">{users.length}</strong>
        </article>
        <article className="admin-stat-card soft-success">
          <span className="admin-stat-label">Active</span>
          <strong className="admin-stat-value">{activeCount}</strong>
        </article>
        <article className="admin-stat-card soft-warning">
          <span className="admin-stat-label">Frozen</span>
          <strong className="admin-stat-value">{frozenCount}</strong>
        </article>
        <article className="admin-stat-card soft-info">
          <span className="admin-stat-label">Admin seats</span>
          <strong className="admin-stat-value">{adminCount}</strong>
        </article>
      </div>

      <div className="grid">
        {users.length ? (
          users.map((user) => (
            <article key={user.userId} className="admin-record-card">
              <div className="admin-record-head">
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span className="admin-avatar" style={{ background: "var(--rx-accent-soft)", color: "var(--rx-accent)" }}>
                    {getInitials(user.name)}
                  </span>
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong>{user.name}</strong>
                    <span className="admin-record-meta">
                      {user.email ?? user.phone} · {user.listingsCount} listings
                    </span>
                  </div>
                </div>
                <div className="admin-actions">
                  <span className="admin-tag">{user.role}</span>
                  <span className="admin-tag">{user.accountStatus}</span>
                </div>
              </div>

              <div className="admin-actions">
                <select
                  className="admin-select"
                  defaultValue={user.role}
                  onChange={(event) => updateMutation.mutate({ userId: user.userId, role: event.target.value as (typeof roleOptions)[number] })}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  className="admin-select"
                  defaultValue={user.accountStatus}
                  onChange={(event) =>
                    updateMutation.mutate({ userId: user.userId, accountStatus: event.target.value as (typeof statusOptions)[number] })
                  }
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">{usersQuery.isLoading ? "Loading users..." : "No users."}</div>
        )}
      </div>
    </section>
  );
}

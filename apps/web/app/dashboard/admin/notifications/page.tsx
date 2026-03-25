"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../../../components/session-provider";

export default function AdminNotificationsPage() {
  const { api, session } = useSession();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["admin-notification-settings"],
    queryFn: () => api.getAdminNotificationSettings(),
    enabled: Boolean(session && session.user.role !== "member")
  });

  const updateMutation = useMutation({
    mutationFn: api.updateAdminNotificationSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-notification-settings"] });
    }
  });

  const settings = settingsQuery.data;
  const notificationRows: Array<{
    key: "pushEnabled" | "messageNotificationsEnabled" | "listingMatchNotificationsEnabled";
    title: string;
    note: string;
  }> = [
    { key: "pushEnabled", title: "Push notifications", note: "Master device delivery" },
    { key: "messageNotificationsEnabled", title: "Message alerts", note: "Conversation events" },
    { key: "listingMatchNotificationsEnabled", title: "Listing match alerts", note: "Saved alert matches" }
  ];

  return (
    <section className="admin-workspace">
      <div className="admin-page-head">
        <div>
          <h1>Notifications</h1>
          <p>Global delivery switches.</p>
        </div>
      </div>

      <article className="admin-panel">
        {notificationRows.map((row) => (
          <label className="admin-toggle-row" key={row.key}>
            <div style={{ display: "grid", gap: 4 }}>
              <strong>{row.title}</strong>
              <span className="admin-record-meta">{row.note}</span>
            </div>
            <input
              checked={Boolean(settings?.[row.key])}
              onChange={(event) => updateMutation.mutate({ [row.key]: event.target.checked })}
              type="checkbox"
            />
          </label>
        ))}
      </article>
    </section>
  );
}

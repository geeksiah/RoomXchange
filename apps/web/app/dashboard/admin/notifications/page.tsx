"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../../../../components/session-provider";

export default function AdminNotificationsPage() {
  const { api, session } = useSession();
  const queryClient = useQueryClient();
  const [donationProvider, setDonationProvider] = useState("Paystack");
  const [donationUrl, setDonationUrl] = useState("");
  const [donationAmounts, setDonationAmounts] = useState("50, 100, 200, 500, 1000");

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
  useEffect(() => {
    if (!settings) {
      return;
    }

    setDonationProvider(settings.donationProvider ?? "Paystack");
    setDonationUrl(settings.donationUrl ?? "");
    setDonationAmounts(settings.donationPresetAmounts.join(", "));
  }, [settings]);
  const notificationRows: Array<{
    key: "pushEnabled" | "messageNotificationsEnabled" | "listingMatchNotificationsEnabled";
    title: string;
    note: string;
  }> = [
    { key: "pushEnabled", title: "Push notifications", note: "Master device delivery" },
    { key: "messageNotificationsEnabled", title: "Message alerts", note: "Conversation events" },
    { key: "listingMatchNotificationsEnabled", title: "Listing match alerts", note: "Saved alert matches" }
  ];

  const saveDonationSettings = () => {
    const presetAmounts = donationAmounts
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0)
      .slice(0, 5);

    updateMutation.mutate({
      donationProvider: donationProvider.trim() || null,
      donationUrl: donationUrl.trim() || null,
      donationPresetAmounts: presetAmounts.length ? presetAmounts : [50, 100, 200, 500, 1000]
    });
  };

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

      <article className="admin-panel" style={{ display: "grid", gap: 18 }}>
        <div className="admin-panel-head">
          <div>
            <h3>Donation settings</h3>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Landing-page donation method and checkout link.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label className="admin-field">
            <span>Provider label</span>
            <input value={donationProvider} onChange={(event) => setDonationProvider(event.target.value)} placeholder="Paystack" />
          </label>
          <label className="admin-field">
            <span>Checkout URL</span>
            <input
              value={donationUrl}
              onChange={(event) => setDonationUrl(event.target.value)}
              placeholder="https://paystack.com/pay/roomxchange-support"
            />
          </label>
          <label className="admin-field full">
            <span>Preset amounts</span>
            <input
              value={donationAmounts}
              onChange={(event) => setDonationAmounts(event.target.value)}
              placeholder="50, 100, 200, 500, 1000"
            />
          </label>
        </div>

        <div className="admin-actions">
          <button className="button" disabled={updateMutation.isPending} onClick={saveDonationSettings} type="button">
            {updateMutation.isPending ? "Saving..." : "Save donation settings"}
          </button>
        </div>
      </article>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAdminAnalytics, useAdminEvents, useAdminNotificationSettings, useAdminNotificationSettingsMutation } from "../../../../components/admin/data";
import { EmptyState, LoadingState, PageHeader, StatusBadge } from "../../../../components/admin/ui";

export default function AdminNotificationsPage() {
  const settingsQuery = useAdminNotificationSettings();
  const analyticsQuery = useAdminAnalytics();
  const eventsQuery = useAdminEvents({ limit: 8 });
  const updateMutation = useAdminNotificationSettingsMutation();
  const [donationProvider, setDonationProvider] = useState("Paystack");
  const [donationUrl, setDonationUrl] = useState("");
  const [donationAmounts, setDonationAmounts] = useState("50, 100, 200, 500, 1000");

  const settings = settingsQuery.data;
  const analytics = analyticsQuery.data;
  const events = eventsQuery.data?.items ?? [];

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
    { key: "pushEnabled", title: "Push delivery", note: "Master switch for device delivery" },
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
      donationProvider: donationProvider === "none" ? null : donationProvider.trim() || null,
      donationUrl: donationProvider === "none" ? null : donationUrl.trim() || null,
      donationPresetAmounts: presetAmounts.length ? presetAmounts : [50, 100, 200, 500, 1000]
    });
  };

  return (
    <section className="admin-workspace">
      <PageHeader title="Notifications" description="System switches and public donation checkout settings." />

      <div className="admin-two-column">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Delivery controls</h3>
              <p className="admin-panel-copy">Every switch is bound to backend notification settings.</p>
            </div>
          </div>
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

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Recent control activity</h3>
              <p className="admin-panel-copy">Latest backend-backed settings and moderation actions.</p>
            </div>
          </div>
          {eventsQuery.isLoading ? (
            <LoadingState rows={4} />
          ) : events.length ? (
            <div className="admin-stack">
              {events.map((event) => (
                <div className="admin-compact-row" key={event.id}>
                  <div>
                    <strong>{event.action.replace(/\./g, " ")}</strong>
                    <p>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(event.createdAt))}</p>
                  </div>
                  <StatusBadge value={event.status ?? event.accountStatus ?? event.subscriptionStatus ?? "logged"} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No admin events yet"
              description="This feed populates when admins update users, reports, subscriptions, listings, or notification settings."
            />
          )}
        </article>
      </div>

      <div className="admin-two-column">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Current signals</h3>
              <p className="admin-panel-copy">Live counts that influence downstream notification pressure.</p>
            </div>
          </div>
          {analytics ? (
            <div className="admin-kpi-grid">
              <div className="admin-kpi-tile">
                <span>Open reports</span>
                <strong>{analytics.openReports}</strong>
              </div>
              <div className="admin-kpi-tile">
                <span>Reviewing reports</span>
                <strong>{analytics.reviewingReports}</strong>
              </div>
              <div className="admin-kpi-tile">
                <span>Published listings</span>
                <strong>{analytics.publishedListings}</strong>
              </div>
              <div className="admin-kpi-tile">
                <span>Active users</span>
                <strong>{analytics.activeUsers}</strong>
              </div>
            </div>
          ) : (
            <EmptyState title="Signals unavailable" description="Operational counts will render here when analytics responds." />
          )}
        </article>

        <article className="admin-panel" style={{ display: "grid", gap: 18 }}>
          <div className="admin-panel-head">
            <div>
              <h3>Donation checkout</h3>
              <p className="admin-panel-copy">This controls the landing-page provider, payment link, and amount presets.</p>
            </div>
            {settings?.donationProvider ? <StatusBadge value={settings.donationProvider} /> : <StatusBadge value="hidden" />}
          </div>

          <div className="form-grid">
            <label className="admin-field">
              <span>Active provider</span>
              <select onChange={(event) => setDonationProvider(event.target.value)} value={donationProvider || "none"}>
                <option value="none">Hide donations</option>
                <option value="Paystack">Paystack</option>
                <option value="Hubtel">Hubtel</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Checkout URL</span>
              <input
                onChange={(event) => setDonationUrl(event.target.value)}
                placeholder="https://paystack.com/pay/roomxchange-support"
                value={donationUrl}
              />
            </label>
            <label className="admin-field full">
              <span>Preset amounts</span>
              <input onChange={(event) => setDonationAmounts(event.target.value)} placeholder="50, 100, 200, 500, 1000" value={donationAmounts} />
            </label>
          </div>

          <div className="admin-actions">
            <button className="button" disabled={updateMutation.isPending} onClick={saveDonationSettings} type="button">
              {updateMutation.isPending ? "Saving..." : "Save settings"}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

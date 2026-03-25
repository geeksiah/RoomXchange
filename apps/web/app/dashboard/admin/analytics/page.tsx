"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../../../components/session-provider";

export default function AdminAnalyticsPage() {
  const { api, session } = useSession();
  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.getAdminAnalytics(),
    enabled: Boolean(session && session.user.role !== "member")
  });

  const analytics = analyticsQuery.data;

  return (
    <section className="admin-workspace">
      <div className="admin-page-head">
        <div>
          <h1>Analytics</h1>
          <p>Core counts across users, listings, and moderation.</p>
        </div>
      </div>

      <div className="admin-stats">
        {[
          ["Total users", analytics?.totalUsers ?? 0, "soft-accent"],
          ["Active users", analytics?.activeUsers ?? 0, "soft-success"],
          ["Published listings", analytics?.publishedListings ?? 0, "soft-info"],
          ["Open reports", analytics?.openReports ?? 0, "soft-warning"]
        ].map(([label, value, tone]) => (
          <article className={`admin-stat-card ${tone}`} key={label}>
            <span className="admin-stat-label">{label}</span>
            <strong className="admin-stat-value">{value}</strong>
          </article>
        ))}
      </div>

      <div className="admin-panels">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <h3>Accounts</h3>
          </div>
          <div className="admin-list">
            <div className="admin-list-row">
              <span>Frozen</span>
              <span className="admin-tag">{analytics?.frozenUsers ?? 0}</span>
            </div>
            <div className="admin-list-row">
              <span>Removed</span>
              <span className="admin-tag">{analytics?.removedUsers ?? 0}</span>
            </div>
            <div className="admin-list-row">
              <span>Admins</span>
              <span className="admin-tag">{analytics?.totalAdmins ?? 0}</span>
            </div>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <h3>Listings and reports</h3>
          </div>
          <div className="admin-list">
            <div className="admin-list-row">
              <span>Archived listings</span>
              <span className="admin-tag">{analytics?.archivedListings ?? 0}</span>
            </div>
            <div className="admin-list-row">
              <span>Reviewing reports</span>
              <span className="admin-tag">{analytics?.reviewingReports ?? 0}</span>
            </div>
            <div className="admin-list-row">
              <span>Resolved reports</span>
              <span className="admin-tag">{analytics?.resolvedReports ?? 0}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

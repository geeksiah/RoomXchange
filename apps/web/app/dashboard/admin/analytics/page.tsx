"use client";

import { useAdminAnalytics } from "../../../../components/admin/data";
import { EmptyState, PageHeader, StatCard } from "../../../../components/admin/ui";

export default function AdminAnalyticsPage() {
  const analyticsQuery = useAdminAnalytics();
  const analytics = analyticsQuery.data;

  return (
    <section className="admin-workspace">
      <PageHeader title="Analytics" description="Operational totals only. No decorative charts." />

      <div className="admin-stats">
        <StatCard label="Total users" tone="accent" value={analytics?.totalUsers ?? 0} />
        <StatCard label="Active users" tone="success" value={analytics?.activeUsers ?? 0} />
        <StatCard label="Published listings" tone="info" value={analytics?.publishedListings ?? 0} />
        <StatCard label="Open reports" tone="warning" value={analytics?.openReports ?? 0} />
      </div>

      {analytics ? (
        <div className="admin-three-column">
          <article className="admin-panel">
            <div className="admin-panel-head">
              <h3>Accounts</h3>
            </div>
            <div className="admin-kpi-grid">
              <div className="admin-kpi-tile">
                <span>Frozen</span>
                <strong>{analytics.frozenUsers}</strong>
              </div>
              <div className="admin-kpi-tile">
                <span>Removed</span>
                <strong>{analytics.removedUsers}</strong>
              </div>
              <div className="admin-kpi-tile">
                <span>Admins</span>
                <strong>{analytics.totalAdmins}</strong>
              </div>
            </div>
          </article>

          <article className="admin-panel">
            <div className="admin-panel-head">
              <h3>Listings</h3>
            </div>
            <div className="admin-kpi-grid">
              <div className="admin-kpi-tile">
                <span>Total</span>
                <strong>{analytics.totalListings}</strong>
              </div>
              <div className="admin-kpi-tile">
                <span>Published</span>
                <strong>{analytics.publishedListings}</strong>
              </div>
              <div className="admin-kpi-tile">
                <span>Archived</span>
                <strong>{analytics.archivedListings}</strong>
              </div>
            </div>
          </article>

          <article className="admin-panel">
            <div className="admin-panel-head">
              <h3>Moderation</h3>
            </div>
            <div className="admin-kpi-grid">
              <div className="admin-kpi-tile">
                <span>Open</span>
                <strong>{analytics.openReports}</strong>
              </div>
              <div className="admin-kpi-tile">
                <span>Reviewing</span>
                <strong>{analytics.reviewingReports}</strong>
              </div>
              <div className="admin-kpi-tile">
                <span>Resolved</span>
                <strong>{analytics.resolvedReports}</strong>
              </div>
            </div>
          </article>
        </div>
      ) : (
        <EmptyState title="Analytics unavailable" description="Real metrics will render here once the analytics endpoint responds." />
      )}
    </section>
  );
}

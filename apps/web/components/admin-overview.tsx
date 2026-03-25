"use client";

import Link from "next/link";
import type { Route } from "next";
import { useQuery } from "@tanstack/react-query";
import { formatMonthlyPrice } from "@roomxchange/shared";
import { useSession } from "./session-provider";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function buildLine(values: number[], width: number, height: number, padding: number) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const step = (width - padding * 2) / Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function AdminOverview() {
  const { api, session } = useSession();
  const enabled = Boolean(session && session.user.role !== "member");

  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.getAdminAnalytics(),
    enabled
  });

  const listingsQuery = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => api.getAdminListings(),
    enabled
  });

  const reportsQuery = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => api.getAdminReports(),
    enabled
  });

  const conversationsQuery = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: () => api.getAdminConversations(),
    enabled
  });

  const analytics = analyticsQuery.data;
  const metricCards = [
    { label: "Live users", value: analytics?.activeUsers ?? 0, tone: "soft-accent", note: `${analytics?.totalUsers ?? 0} total accounts` },
    { label: "Published listings", value: analytics?.publishedListings ?? 0, tone: "soft-success", note: `${analytics?.totalListings ?? 0} total listings` },
    { label: "Open reports", value: analytics?.openReports ?? 0, tone: "soft-warning", note: `${analytics?.reviewingReports ?? 0} under review` },
    { label: "Admin seats", value: analytics?.totalAdmins ?? 0, tone: "soft-info", note: `${analytics?.frozenUsers ?? 0} frozen users` }
  ];

  const primaryLine = buildLine(
    [
      analytics?.activeUsers ?? 0,
      analytics?.publishedListings ?? 0,
      analytics?.totalUsers ?? 0,
      analytics?.openReports ?? 0,
      analytics?.totalAdmins ?? 0,
      analytics?.publishedListings ?? 0
    ],
    760,
    260,
    28
  );

  const secondaryLine = buildLine(
    [
      analytics?.frozenUsers ?? 0,
      analytics?.archivedListings ?? 0,
      analytics?.reviewingReports ?? 0,
      analytics?.removedUsers ?? 0,
      analytics?.openReports ?? 0,
      analytics?.activeUsers ?? 0
    ],
    760,
    260,
    28
  );

  const recentListings = (listingsQuery.data ?? []).slice(0, 4);
  const recentReports = (reportsQuery.data ?? []).slice(0, 4);
  const recentConversations = (conversationsQuery.data ?? []).slice(0, 4);

  return (
    <section className="admin-workspace">
      <div className="admin-page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Clear view of users, listings, reports, and activity.</p>
        </div>
        <div className="admin-actions">
          <Link className="button secondary" href={"/dashboard/admin/users" as Route}>
            Users
          </Link>
          <Link className="button" href={"/dashboard/reports" as Route}>
            Reports
          </Link>
        </div>
      </div>

      <div className="admin-stats">
        {metricCards.map((card) => (
          <article key={card.label} className={`admin-stat-card ${card.tone}`}>
            <span className="admin-stat-label">{card.label}</span>
            <strong className="admin-stat-value">{card.value}</strong>
            <span className="muted" style={{ fontSize: "0.88rem" }}>
              {card.note}
            </span>
          </article>
        ))}
      </div>

      <div className="admin-panels">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Platform pulse</h3>
              <span className="muted" style={{ fontSize: "0.88rem" }}>
                Live system mix
              </span>
            </div>
            <span className="admin-tag">Realtime snapshot</span>
          </div>
          <div className="admin-chart">
            <svg viewBox="0 0 760 260" width="100%" height="100%" preserveAspectRatio="none">
              <line x1="28" y1="224" x2="732" y2="224" stroke="#E5E7EB" strokeWidth="1.2" />
              <line x1="28" y1="160" x2="732" y2="160" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="28" y1="96" x2="732" y2="96" stroke="#F1F5F9" strokeWidth="1" />
              <polyline fill="none" stroke="#FF385C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={primaryLine} />
              <polyline fill="none" stroke="#27C46A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={secondaryLine} />
            </svg>
          </div>
          <div className="admin-actions" style={{ marginTop: 14 }}>
            <span className="admin-tag">Core volume</span>
            <span className="admin-tag">Moderation pressure</span>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Review queue</h3>
              <span className="muted" style={{ fontSize: "0.88rem" }}>
                Latest moderation work
              </span>
            </div>
          </div>
          <div className="admin-list">
            {recentReports.length ? (
              recentReports.map((report) => (
                <div className="admin-list-row" key={report.reportId}>
                  <div>
                    <strong>{report.reason}</strong>
                    <div className="admin-record-meta">
                      Listing {report.listingId.slice(0, 8)} · {formatDate(report.createdAt)}
                    </div>
                  </div>
                  <span className="admin-tag">{report.status}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">No reports.</div>
            )}
          </div>
        </article>
      </div>

      <div className="admin-panels">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Newest listings</h3>
              <span className="muted" style={{ fontSize: "0.88rem" }}>
                Recent supply
              </span>
            </div>
            <Link href={"/dashboard/admin/listings" as Route} className="admin-tag">
              View all
            </Link>
          </div>
          <div className="admin-list">
            {recentListings.length ? (
              recentListings.map((listing) => (
                <div className="admin-list-row" key={listing.listingId}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <img
                      alt={listing.title}
                      src={listing.previewImage}
                      style={{ width: 56, height: 56, borderRadius: 16, objectFit: "cover", background: "#f3f4f6" }}
                    />
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{listing.title}</strong>
                      <span className="admin-record-meta">
                        {listing.location} · {formatMonthlyPrice(listing.price)}
                      </span>
                    </div>
                  </div>
                  <span className="admin-tag">{listing.status}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">{listingsQuery.isLoading ? "Loading..." : "No listings."}</div>
            )}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Conversations</h3>
              <span className="muted" style={{ fontSize: "0.88rem" }}>
                Most recent threads
              </span>
            </div>
            <Link href={"/dashboard/admin/conversations" as Route} className="admin-tag">
              Open
            </Link>
          </div>
          <div className="admin-list">
            {recentConversations.length ? (
              recentConversations.map((conversation) => (
                <div className="admin-list-row" key={conversation.conversationId}>
                  <div>
                    <strong>{conversation.listingTitle}</strong>
                    <div className="admin-record-meta">
                      {conversation.buyer.name} · {conversation.owner.name}
                    </div>
                  </div>
                  <span className="admin-tag">{conversation.messageCount} msgs</span>
                </div>
              ))
            ) : (
              <div className="empty-state">{conversationsQuery.isLoading ? "Loading..." : "No conversations."}</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import type { Route } from "next";
import { formatMonthlyPrice } from "@roomxchange/shared";
import { useAdminAnalytics, useAdminConversations, useAdminEvents, useAdminListings, useAdminReports, useAdminSubscriptions, useAdminUsers } from "./admin/data";
import { EmptyState, LoadingState, PageHeader, StatCard, StatusBadge } from "./admin/ui";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function AdminOverview() {
  const analyticsQuery = useAdminAnalytics();
  const usersQuery = useAdminUsers({ limit: 5 });
  const listingsQuery = useAdminListings({ limit: 5 });
  const reportsQuery = useAdminReports({ limit: 5 });
  const conversationsQuery = useAdminConversations({ limit: 5 });
  const subscriptionsQuery = useAdminSubscriptions({ limit: 20 });
  const eventsQuery = useAdminEvents({ limit: 5 });

  const analytics = analyticsQuery.data;
  const users = usersQuery.data?.items ?? [];
  const listings = listingsQuery.data?.items ?? [];
  const reports = reportsQuery.data?.items ?? [];
  const conversations = conversationsQuery.data?.items ?? [];
  const subscriptions = subscriptionsQuery.data?.items ?? [];
  const events = eventsQuery.data?.items ?? [];

  const frozenUsers = users.filter((user) => user.accountStatus === "frozen");
  const openReports = reports.filter((report) => report.status === "open");
  const reviewingReports = reports.filter((report) => report.status === "reviewing");
  const accessRisk = subscriptions.filter((user) => user.subscriptionStatus === "past_due" || user.subscriptionStatus === "expired");
  const recentListings = listings.slice(0, 5);
  const recentConversations = conversations.slice(0, 5);

  return (
    <section className="admin-workspace">
      <PageHeader
        title="Dashboard"
        description="Current system load, moderation pressure, and what needs action now."
        actions={
          <>
            <Link className="button secondary" href={"/dashboard/admin/users" as Route}>
              Users
            </Link>
            <Link className="button" href={"/dashboard/reports" as Route}>
              Reports
            </Link>
          </>
        }
      />

      <div className="admin-stats">
        <StatCard
          href="/dashboard/admin/users?status=active"
          label="Active users"
          note={`${analytics?.totalUsers ?? 0} total accounts`}
          tone="accent"
          value={analytics?.activeUsers ?? 0}
        />
        <StatCard
          href="/dashboard/admin/listings?status=published"
          label="Published listings"
          note={`${analytics?.archivedListings ?? 0} archived`}
          tone="success"
          value={analytics?.publishedListings ?? 0}
        />
        <StatCard
          href="/dashboard/reports?status=open"
          label="Open reports"
          note={`${analytics?.reviewingReports ?? 0} under review`}
          tone="warning"
          value={analytics?.openReports ?? 0}
        />
        <StatCard
          href="/dashboard/admin/conversations"
          label="Active threads"
          note={`${conversations.length} current threads`}
          tone="info"
          value={conversations.length}
        />
      </div>

      <div className="admin-two-column">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Needs attention</h3>
              <p className="admin-panel-copy">The shortest path to the next admin action.</p>
            </div>
          </div>

          {analyticsQuery.isLoading || usersQuery.isLoading || reportsQuery.isLoading || subscriptionsQuery.isLoading ? (
            <LoadingState rows={4} />
          ) : (
            <div className="admin-stack">
              <Link className="admin-attention-row" href={"/dashboard/reports?status=open" as Route}>
                <div>
                  <strong>Pending reports</strong>
                  <p>New reports waiting for first review.</p>
                </div>
                <StatusBadge value={`${openReports.length} open`} />
              </Link>
              <Link className="admin-attention-row" href={"/dashboard/reports?status=reviewing" as Route}>
                <div>
                  <strong>Under review</strong>
                  <p>Cases already in moderation and still unresolved.</p>
                </div>
                <StatusBadge value={`${reviewingReports.length} reviewing`} />
              </Link>
              <Link className="admin-attention-row" href={"/dashboard/admin/users?status=frozen" as Route}>
                <div>
                  <strong>Restricted users</strong>
                  <p>Accounts currently frozen by moderation.</p>
                </div>
                <StatusBadge value={`${frozenUsers.length} frozen`} />
              </Link>
              <Link className="admin-attention-row" href={"/dashboard/admin/subscriptions" as Route}>
                <div>
                  <strong>Subscription exceptions</strong>
                  <p>Accounts with past-due or expired access state.</p>
                </div>
                <StatusBadge value={`${accessRisk.length} at risk`} />
              </Link>
            </div>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Recent admin actions</h3>
              <p className="admin-panel-copy">Actual control activity from the admin event log.</p>
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
                    <p>{formatDate(event.createdAt)}</p>
                  </div>
                  <StatusBadge value={event.status ?? event.accountStatus ?? event.subscriptionStatus ?? "logged"} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No admin actions yet" description="The event log will populate when admins change users, listings, reports, subscriptions, or settings." />
          )}
        </article>
      </div>

      <div className="admin-two-column">
        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Recent reports</h3>
              <p className="admin-panel-copy">Fast access to the newest moderation items.</p>
            </div>
            <Link className="admin-inline-link" href={"/dashboard/reports" as Route}>
              Open queue
            </Link>
          </div>
          {reportsQuery.isLoading ? (
            <LoadingState rows={4} />
          ) : reports.length ? (
            <div className="admin-stack">
              {reports.slice(0, 5).map((report) => (
                <Link className="admin-compact-row" href={`/dashboard/reports?status=${report.status}` as Route} key={report.reportId}>
                  <div>
                    <strong>{report.reason}</strong>
                    <p>
                      Listing {report.listingId.slice(0, 8)} - {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <StatusBadge value={report.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No reports yet" description="New moderation cases will appear here as soon as users report listings or publishers." />
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Recent conversations</h3>
              <p className="admin-panel-copy">Latest buyer and owner threads.</p>
            </div>
            <Link className="admin-inline-link" href={"/dashboard/admin/conversations" as Route}>
              Open threads
            </Link>
          </div>
          {conversationsQuery.isLoading ? (
            <LoadingState rows={4} />
          ) : recentConversations.length ? (
            <div className="admin-stack">
              {recentConversations.map((conversation) => (
                <Link
                  className="admin-compact-row"
                  href={`/dashboard/admin/conversations?conversation=${conversation.conversationId}` as Route}
                  key={conversation.conversationId}
                >
                  <div>
                    <strong>{conversation.listingTitle}</strong>
                    <p>
                      {conversation.buyer.name} • {conversation.owner.name}
                    </p>
                  </div>
                  <StatusBadge value={`${conversation.messageCount} messages`} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No active threads" description="Conversation moderation becomes available once buyers start contacting publishers." />
          )}
        </article>
      </div>

      <article className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h3>New supply</h3>
            <p className="admin-panel-copy">Latest listings entering the marketplace.</p>
          </div>
          <Link className="admin-inline-link" href={"/dashboard/admin/listings" as Route}>
            View listings
          </Link>
        </div>
        {listingsQuery.isLoading ? (
          <LoadingState rows={5} />
        ) : recentListings.length ? (
          <div className="admin-stack">
            {recentListings.map((listing) => (
              <Link
                className="admin-supply-row"
                href={`/dashboard/admin/listings?owner=${listing.ownerId}` as Route}
                key={listing.listingId}
              >
                <div className="admin-supply-meta">
                  <img alt={listing.title} src={listing.previewImage} />
                  <div>
                    <strong>{listing.title}</strong>
                    <p>
                      {listing.ownerContact.name} • {listing.location}
                    </p>
                  </div>
                </div>
                <div className="admin-supply-side">
                  <StatusBadge value={listing.status} />
                  <span className="admin-supply-price">{formatMonthlyPrice(listing.price)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No listings yet" description="Listings will appear here as soon as publishers post inventory." />
        )}
      </article>
    </section>
  );
}

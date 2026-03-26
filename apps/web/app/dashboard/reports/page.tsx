"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { Report } from "@roomxchange/shared";
import { useAdminAnalytics, useAdminReportMutation, useAdminReports } from "../../../components/admin/data";
import { ActionDropdown, DataTable, EmptyState, PageHeader, PaginationControls, SegmentTabs, StatCard, StatusBadge } from "../../../components/admin/ui";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function readReportFilters() {
  if (typeof window === "undefined") {
    return { status: "all", listing: "", user: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    status: params.get("status") ?? "all",
    listing: params.get("listing") ?? "",
    user: params.get("user") ?? ""
  };
}

export default function ReportsPage() {
  const analyticsQuery = useAdminAnalytics();
  const totalsQuery = useAdminReports({ limit: 1 });
  const updateMutation = useAdminReportMutation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [listingFilter, setListingFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack[cursorStack.length - 1];

  useEffect(() => {
    const filters = readReportFilters();
    setStatusFilter(filters.status);
    setListingFilter(filters.listing);
    setUserFilter(filters.user);
  }, []);

  const reportsQuery = useAdminReports({
    limit: 20,
    cursor: currentCursor,
    query: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as "open" | "reviewing" | "resolved" | "dismissed"),
    listingId: listingFilter || undefined,
    targetUserId: userFilter || undefined
  });

  const analytics = analyticsQuery.data;
  const reports = reportsQuery.data?.items ?? [];
  const totalReports = totalsQuery.data?.total ?? 0;

  const selectedReport =
    reports.find((report) => report.reportId === selectedReportId) ??
    reports[0] ??
    null;

  const queueSummary = {
    open: analytics?.openReports ?? 0,
    reviewing: analytics?.reviewingReports ?? 0,
    resolved: analytics?.resolvedReports ?? 0,
    dismissed: Math.max(totalReports - (analytics?.openReports ?? 0) - (analytics?.reviewingReports ?? 0) - (analytics?.resolvedReports ?? 0), 0)
  };

  const updateReport = (report: Report, status: "reviewing" | "resolved" | "dismissed") => {
    updateMutation.mutate({
      reportId: report.reportId,
      input: {
        status,
        resolutionNote: `Updated to ${status}.`
      }
    });
  };

  return (
    <section className="admin-workspace">
      <PageHeader title="Reports" description="The active moderation queue, ordered for fast review." />

      <div className="admin-stats">
        <StatCard href="/dashboard/reports?status=open" label="Pending" tone="warning" value={queueSummary.open} />
        <StatCard href="/dashboard/reports?status=reviewing" label="Under review" tone="accent" value={queueSummary.reviewing} />
        <StatCard href="/dashboard/reports?status=resolved" label="Resolved" tone="success" value={queueSummary.resolved} />
        <StatCard href="/dashboard/reports?status=dismissed" label="Dismissed" tone="info" value={queueSummary.dismissed} />
      </div>

      {selectedReport ? (
        <article className="admin-panel">
          <div className="admin-detail-head">
            <div>
              <h3>{selectedReport.reason}</h3>
              <p className="admin-record-meta">Created {formatDate(selectedReport.createdAt)}</p>
            </div>
            <StatusBadge value={selectedReport.status} />
          </div>
          <div className="admin-detail-grid">
            <div>
              <span className="admin-detail-label">Listing</span>
              <strong>{selectedReport.listingId}</strong>
            </div>
            <div>
              <span className="admin-detail-label">Target user</span>
              <strong>{selectedReport.targetUserId}</strong>
            </div>
            <div>
              <span className="admin-detail-label">Reporter</span>
              <strong>{selectedReport.reporterId}</strong>
            </div>
            <div>
              <span className="admin-detail-label">Resolution note</span>
              <strong>{selectedReport.resolutionNote ?? "None yet"}</strong>
            </div>
          </div>
          <div className="admin-actions">
            <button className="button secondary" onClick={() => updateReport(selectedReport, "reviewing")} type="button">
              Start review
            </button>
            <button className="button" onClick={() => updateReport(selectedReport, "resolved")} type="button">
              Resolve
            </button>
            <button className="button secondary" onClick={() => updateReport(selectedReport, "dismissed")} type="button">
              Dismiss
            </button>
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
              { label: "All", value: "all" },
              { label: "Pending", value: "open" },
              { label: "Under review", value: "reviewing" },
              { label: "Resolved", value: "resolved" },
              { label: "Dismissed", value: "dismissed" }
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
              placeholder="Search reports"
              value={searchQuery}
            />
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: "reason",
              header: "Reason",
              cell: (report) => (
                <button className="admin-table-identity admin-table-report" onClick={() => setSelectedReportId(report.reportId)} type="button">
                  <span>
                    <strong>{report.reason}</strong>
                    <small>{formatDate(report.createdAt)}</small>
                  </span>
                </button>
              )
            },
            {
              key: "entity",
              header: "Linked entity",
              cell: (report) => (
                <div className="admin-cell-stack">
                  <Link className="admin-inline-link" href={`/dashboard/reports?listing=${report.listingId}` as Route}>
                    Listing {report.listingId.slice(0, 8)}
                  </Link>
                  <Link className="admin-inline-link" href={`/dashboard/reports?user=${report.targetUserId}` as Route}>
                    User {report.targetUserId.slice(0, 8)}
                  </Link>
                </div>
              )
            },
            {
              key: "status",
              header: "Status",
              cell: (report) => <StatusBadge value={report.status} />
            },
            {
              key: "actions",
              header: "",
              className: "admin-cell-actions",
              cell: (report) => (
                <ActionDropdown
                  items={[
                    { label: "Start review", onSelect: () => updateReport(report, "reviewing") },
                    { label: "Resolve", onSelect: () => updateReport(report, "resolved") },
                    { label: "Dismiss", onSelect: () => updateReport(report, "dismissed"), danger: true }
                  ]}
                />
              )
            }
          ]}
          empty={<EmptyState title="No reports in this queue" description="When reports match the current filters they will appear here for moderation." />}
          loading={reportsQuery.isLoading}
          rowKey={(report) => report.reportId}
          rows={reports}
        />
        <PaginationControls
          canNext={Boolean(reportsQuery.data?.nextCursor)}
          canPrevious={cursorStack.length > 0}
          currentCount={reports.length}
          onNext={() => {
            if (reportsQuery.data?.nextCursor) {
              setCursorStack((current) => [...current, reportsQuery.data?.nextCursor as string]);
            }
          }}
          onPrevious={() => setCursorStack((current) => current.slice(0, -1))}
          total={reportsQuery.data?.total ?? 0}
        />
      </article>
    </section>
  );
}

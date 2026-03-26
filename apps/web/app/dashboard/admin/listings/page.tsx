"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { formatMonthlyPrice, type Listing } from "@roomxchange/shared";
import { useAdminAnalytics, useAdminListingDeleteMutation, useAdminListingMutation, useAdminListings, useAdminReports } from "../../../../components/admin/data";
import { ActionDropdown, DataTable, EmptyState, Modal, PageHeader, PaginationControls, SegmentTabs, StatCard, StatusBadge } from "../../../../components/admin/ui";

function readListingFilters() {
  if (typeof window === "undefined") {
    return { status: "all", view: "table", owner: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    status: params.get("status") ?? "all",
    view: params.get("view") ?? "table",
    owner: params.get("owner") ?? ""
  };
}

export default function AdminListingsPage() {
  const analyticsQuery = useAdminAnalytics();
  const updateMutation = useAdminListingMutation();
  const deleteMutation = useAdminListingDeleteMutation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Listing | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const currentCursor = cursorStack[cursorStack.length - 1];

  useEffect(() => {
    const filters = readListingFilters();
    setStatusFilter(filters.status);
    setViewMode(filters.view === "grid" ? "grid" : "table");
    setOwnerFilter(filters.owner);
  }, []);

  const listingsQuery = useAdminListings({
    limit: 20,
    cursor: currentCursor,
    query: searchQuery || undefined,
    status: statusFilter === "all" ? undefined : (statusFilter as "published" | "archived"),
    ownerId: ownerFilter || undefined
  });
  const reportsQuery = useAdminReports({ limit: 100 });

  const listings = listingsQuery.data?.items ?? [];
  const reports = reportsQuery.data?.items ?? [];
  const analytics = analyticsQuery.data;

  const countReportsForListing = (listingId: string) => reports.filter((report) => report.listingId === listingId).length;

  return (
    <section className="admin-workspace">
      <PageHeader title="Listings" description="Inventory control, owner context, and direct moderation actions." />

      <div className="admin-stats">
        <StatCard label="All listings" tone="accent" value={analytics?.totalListings ?? 0} />
        <StatCard href="/dashboard/admin/listings?status=published" label="Published" tone="success" value={analytics?.publishedListings ?? 0} />
        <StatCard href="/dashboard/admin/listings?status=archived" label="Archived" tone="warning" value={analytics?.archivedListings ?? 0} />
        <StatCard label="VR ready" tone="info" value={listings.filter((listing) => Boolean(listing.vrUrl)).length} note="Current page matches" />
      </div>

      <article className="admin-panel">
        <div className="admin-table-toolbar">
          <SegmentTabs
            onChange={(value) => {
              setStatusFilter(value);
              setCursorStack([]);
            }}
            options={[
              { label: "All", value: "all" },
              { label: "Published", value: "published" },
              { label: "Archived", value: "archived" }
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
              placeholder="Search listings"
              value={searchQuery}
            />
            <button className={`button secondary ${viewMode === "table" ? "active-view" : ""}`} onClick={() => setViewMode("table")} type="button">
              Table
            </button>
            <button className={`button secondary ${viewMode === "grid" ? "active-view" : ""}`} onClick={() => setViewMode("grid")} type="button">
              Grid
            </button>
          </div>
        </div>

        {viewMode === "grid" ? (
          listings.length ? (
            <div className="admin-card-grid">
              {listings.map((listing) => (
                <article className="admin-record-card" key={listing.listingId}>
                  <img alt={listing.title} className="admin-card-media" src={listing.previewImage} />
                  <div className="admin-record-head">
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong>{listing.title}</strong>
                      <span className="admin-record-meta">{listing.ownerContact.name}</span>
                      <span className="admin-record-meta">{listing.location}</span>
                    </div>
                    <StatusBadge value={listing.status} />
                  </div>
                  <div className="admin-inline-meta">
                    <strong>{formatMonthlyPrice(listing.price)}</strong>
                    <span>{countReportsForListing(listing.listingId)} reports</span>
                  </div>
                  <div className="admin-actions">
                    <Link className="button secondary" href={`/dashboard/reports?listing=${listing.listingId}` as Route}>
                      Review reports
                    </Link>
                    <ActionDropdown
                      items={[
                        { label: "Publish", onSelect: () => updateMutation.mutate({ listingId: listing.listingId, input: { status: "published" } }) },
                        { label: "Archive", onSelect: () => updateMutation.mutate({ listingId: listing.listingId, input: { status: "archived" } }) },
                        { label: "Remove listing", danger: true, onSelect: () => setPendingDelete(listing) }
                      ]}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No listings in this view" description="Change the current search or filters to inspect a different part of the inventory." />
          )
        ) : (
          <DataTable
            columns={[
              {
                key: "listing",
                header: "Listing",
                cell: (listing) => (
                  <div className="admin-table-listing">
                    <img alt={listing.title} src={listing.previewImage} />
                    <span>
                      <strong>{listing.title}</strong>
                      <small>
                        {listing.ownerContact.name} - {listing.location}
                      </small>
                    </span>
                  </div>
                )
              },
              {
                key: "status",
                header: "Status",
                cell: (listing) => <StatusBadge value={listing.status} />
              },
              {
                key: "price",
                header: "Price",
                cell: (listing) => formatMonthlyPrice(listing.price)
              },
              {
                key: "reports",
                header: "Reports",
                cell: (listing) => (
                  <Link className="admin-inline-link" href={`/dashboard/reports?listing=${listing.listingId}` as Route}>
                    {countReportsForListing(listing.listingId)} linked
                  </Link>
                )
              },
              {
                key: "actions",
                header: "",
                className: "admin-cell-actions",
                cell: (listing) => (
                  <ActionDropdown
                    items={[
                      { label: "Publish", onSelect: () => updateMutation.mutate({ listingId: listing.listingId, input: { status: "published" } }) },
                      { label: "Archive", onSelect: () => updateMutation.mutate({ listingId: listing.listingId, input: { status: "archived" } }) },
                      { label: "Remove listing", danger: true, onSelect: () => setPendingDelete(listing) }
                    ]}
                  />
                )
              }
            ]}
            empty={<EmptyState title="No listings in this view" description="Change the current search or status filter to inspect a different part of the inventory." />}
            loading={listingsQuery.isLoading || reportsQuery.isLoading}
            rowKey={(listing) => listing.listingId}
            rows={listings}
          />
        )}
        <PaginationControls
          canNext={Boolean(listingsQuery.data?.nextCursor)}
          canPrevious={cursorStack.length > 0}
          currentCount={listings.length}
          onNext={() => {
            if (listingsQuery.data?.nextCursor) {
              setCursorStack((current) => [...current, listingsQuery.data?.nextCursor as string]);
            }
          }}
          onPrevious={() => setCursorStack((current) => current.slice(0, -1))}
          total={listingsQuery.data?.total ?? 0}
        />
      </article>

      <Modal
        description="This permanently removes the listing through the existing admin delete endpoint."
        onClose={() => setPendingDelete(null)}
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Remove "${pendingDelete.title}"?` : "Remove listing"}
      >
        <div className="admin-actions">
          <button className="button secondary" onClick={() => setPendingDelete(null)} type="button">
            Cancel
          </button>
          <button
            className="button"
            onClick={() => {
              if (!pendingDelete) {
                return;
              }
              deleteMutation.mutate(pendingDelete.listingId, {
                onSuccess: () => setPendingDelete(null)
              });
            }}
            type="button"
          >
            Remove listing
          </button>
        </div>
      </Modal>
    </section>
  );
}

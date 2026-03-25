"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMonthlyPrice } from "@roomxchange/shared";
import { useSession } from "../../../../components/session-provider";

export default function AdminListingsPage() {
  const { api, session } = useSession();
  const queryClient = useQueryClient();

  const listingsQuery = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => api.getAdminListings(),
    enabled: Boolean(session && session.user.role !== "member")
  });

  const updateMutation = useMutation({
    mutationFn: ({ listingId, status }: { listingId: string; status: "published" | "archived" }) =>
      api.updateAdminListing(listingId, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (listingId: string) => api.deleteAdminListing(listingId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-listings"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    }
  });

  const listings = listingsQuery.data ?? [];

  return (
    <section className="admin-workspace">
      <div className="admin-page-head">
        <div>
          <h1>Listings</h1>
          <p>Moderate the full property inventory.</p>
        </div>
      </div>

      <div className="admin-stats">
        <article className="admin-stat-card soft-accent">
          <span className="admin-stat-label">Total</span>
          <strong className="admin-stat-value">{listings.length}</strong>
        </article>
        <article className="admin-stat-card soft-success">
          <span className="admin-stat-label">Published</span>
          <strong className="admin-stat-value">{listings.filter((listing) => listing.status === "published").length}</strong>
        </article>
        <article className="admin-stat-card soft-warning">
          <span className="admin-stat-label">Archived</span>
          <strong className="admin-stat-value">{listings.filter((listing) => listing.status === "archived").length}</strong>
        </article>
        <article className="admin-stat-card soft-info">
          <span className="admin-stat-label">VR ready</span>
          <strong className="admin-stat-value">{listings.filter((listing) => Boolean(listing.vrUrl)).length}</strong>
        </article>
      </div>

      <div className="grid">
        {listings.length ? (
          listings.map((listing) => (
            <article key={listing.listingId} className="admin-record-card">
              <div className="admin-record-head">
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <img
                    alt={listing.title}
                    src={listing.previewImage}
                    style={{ width: 72, height: 72, borderRadius: 18, objectFit: "cover", background: "#f3f4f6" }}
                  />
                  <div style={{ display: "grid", gap: 4 }}>
                    <strong>{listing.title}</strong>
                    <span className="admin-record-meta">
                      {listing.location} · {formatMonthlyPrice(listing.price)}
                    </span>
                    <span className="admin-record-meta">
                      {listing.propertyType} · {listing.listingSubtype ?? "not set"}
                    </span>
                  </div>
                </div>
                <span className="admin-tag">{listing.status}</span>
              </div>

              <div className="admin-actions">
                <button className="button secondary" onClick={() => updateMutation.mutate({ listingId: listing.listingId, status: "published" })}>
                  Publish
                </button>
                <button className="button secondary" onClick={() => updateMutation.mutate({ listingId: listing.listingId, status: "archived" })}>
                  Archive
                </button>
                <button className="button" onClick={() => deleteMutation.mutate(listing.listingId)}>
                  Remove
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">{listingsQuery.isLoading ? "Loading listings..." : "No listings."}</div>
        )}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PropertyCard } from "../../../components/property-card";
import { useSession } from "../../../components/session-provider";

export default function ListingsPage() {
  const { api, session } = useSession();
  const queryClient = useQueryClient();

  const listingsQuery = useQuery({
    queryKey: ["dashboard-listings", session?.user.userId],
    queryFn: () => api.getUserListings(session!.user.userId),
    enabled: Boolean(session)
  });

  const archiveMutation = useMutation({
    mutationFn: (listingId: string) => api.deleteListing(listingId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard-listings"] });
    }
  });

  return (
    <section className="grid">
      <div className="section-title">
        <div>
          <h2 style={{ marginBottom: 6 }}>Your listings</h2>
          <p className="muted" style={{ margin: 0 }}>
            Publish, refine, and archive from the same dashboard.
          </p>
        </div>
        <Link className="button" href="/dashboard/listings/new">
          New listing
        </Link>
      </div>

      {listingsQuery.data?.length ? (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {listingsQuery.data.map((listing) => (
            <div key={listing.listingId} style={{ display: "grid", gap: 10 }}>
              <PropertyCard listing={listing} href={`/dashboard/listings/${listing.listingId}`} />
              <div style={{ display: "flex", gap: 10 }}>
                <Link className="button secondary" href={`/dashboard/listings/${listing.listingId}`}>
                  Edit
                </Link>
                <button className="button" onClick={() => archiveMutation.mutate(listing.listingId)}>
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No listings yet. Publish the first one to populate the live feed.</div>
      )}
    </section>
  );
}

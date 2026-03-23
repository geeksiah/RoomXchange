"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ListingForm } from "../../../../components/listing-form";
import { useSession } from "../../../../components/session-provider";

export default function EditListingPage() {
  const params = useParams<{ listingId: string }>();
  const { api } = useSession();
  const listingQuery = useQuery({
    queryKey: ["listing", params.listingId],
    queryFn: () => api.getListing(params.listingId)
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => api.updateListing(params.listingId, values)
  });

  if (!listingQuery.data) {
    return <div className="empty-state">{listingQuery.isLoading ? "Loading listing..." : "Listing not found."}</div>;
  }

  return (
    <section className="grid">
      <div>
        <h2 style={{ marginBottom: 6 }}>Edit listing</h2>
        <p className="muted" style={{ margin: 0 }}>
          Keep the feed, lookup records, and owner visibility in sync.
        </p>
      </div>
      <ListingForm
        defaultValues={listingQuery.data}
        submitLabel={updateMutation.isPending ? "Saving..." : "Save changes"}
        onSubmit={updateMutation.mutateAsync}
      />
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { ListingForm } from "../../../../components/listing-form";
import { useSession } from "../../../../components/session-provider";

export default function NewListingPage() {
  const { api } = useSession();
  const router = useRouter();
  const createMutation = useMutation({
    mutationFn: api.createListing,
    onSuccess: (listing) => {
      router.push(`/dashboard/listings/${listing.listingId}`);
    }
  });

  return (
    <section className="grid">
      <div>
        <h2 style={{ marginBottom: 6 }}>Create listing</h2>
        <p className="muted" style={{ margin: 0 }}>
          S3 uploads, Mapbox-powered location lookup, and optional VR links are all live here.
        </p>
      </div>
      <ListingForm
        submitLabel={createMutation.isPending ? "Publishing..." : "Publish listing"}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </section>
  );
}

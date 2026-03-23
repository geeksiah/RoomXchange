"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "../../components/session-provider";

export default function DashboardHomePage() {
  const { api, session } = useSession();
  const listingsQuery = useQuery({
    queryKey: ["dashboard-listings", session?.user.userId],
    queryFn: () => api.getUserListings(session!.user.userId),
    enabled: Boolean(session)
  });
  const subscriptionQuery = useQuery({
    queryKey: ["dashboard-subscription", session?.user.userId],
    queryFn: () => api.getSubscriptionStatus(),
    enabled: Boolean(session)
  });

  return (
    <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
      <article className="stat">
        <h3 style={{ marginTop: 0 }}>Listings</h3>
        <strong style={{ fontSize: 32 }}>{listingsQuery.data?.length ?? 0}</strong>
      </article>
      <article className="stat">
        <h3 style={{ marginTop: 0 }}>Subscription</h3>
        <strong style={{ fontSize: 32 }}>{subscriptionQuery.data?.isSubscribed ? "Active" : "Inactive"}</strong>
      </article>
      <article className="stat">
        <h3 style={{ marginTop: 0 }}>Contact path</h3>
        <strong style={{ fontSize: 32 }}>Web only</strong>
      </article>
      <article className="card" style={{ padding: 24, gridColumn: "1 / -1" }}>
        <h2 style={{ marginTop: 0 }}>Next actions</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="button" href="/dashboard/listings/new">
            Publish a listing
          </Link>
          <Link className="button secondary" href="/dashboard/subscription">
            Review subscription
          </Link>
          <Link className="button secondary" href="/dashboard/profile">
            Update profile
          </Link>
        </div>
      </article>
    </section>
  );
}

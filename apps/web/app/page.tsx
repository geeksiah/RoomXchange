"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, DoorOpen, Image as ImageIcon, PhoneForwarded, ShieldCheck } from "lucide-react";
import { PropertyCard } from "../components/property-card";
import { useSession } from "../components/session-provider";

const highlights = [
  {
    title: "List for free",
    copy: "Owners publish image-first listings with VR links and presigned media uploads."
  },
  {
    title: "Pay on web only",
    copy: "Mobile contact flows always leave the app for a single external checkout route."
  },
  {
    title: "Contact after subscription",
    copy: "Phone reveal is protected until Paystack activates access on the backend."
  }
];

export default function HomePage() {
  const { api, session } = useSession();
  const feedQuery = useQuery({
    queryKey: ["public-feed"],
    queryFn: () => api.getFeed({ limit: 6 })
  });

  return (
    <main className="shell" style={{ padding: "24px 0 80px", display: "grid", gap: 32 }}>
      <section
        className="card"
        style={{
          padding: "28px clamp(24px, 6vw, 64px)",
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 28,
          alignItems: "center"
        }}
      >
        <div style={{ display: "grid", gap: 18 }}>
          <div className="pill" style={{ width: "fit-content" }}>
            <ShieldCheck size={16} />
            Apple-safe monetization locked
          </div>
          <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 5.2rem)", lineHeight: 0.95, margin: 0 }}>
            Trade access to exceptional rooms without clutter or in-app checkout.
          </h1>
          <p className="muted" style={{ fontSize: 18, maxWidth: 620, margin: 0 }}>
            RoomXchange is a premium peer-to-peer property marketplace with image-first discovery, VR-ready listings,
            and a single web-only subscription flow to contact owners.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="button" href={session ? "/dashboard/listings/new" : "/subscribe"}>
              {session ? "Create listing" : "Get access"}
            </Link>
            <Link className="button secondary" href="/dashboard">
              Open dashboard
            </Link>
          </div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {highlights.map((item) => (
            <article key={item.title} className="stat">
              <h3 style={{ marginTop: 0 }}>{item.title}</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                {item.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <article className="card" style={{ padding: 24 }}>
          <DoorOpen size={28} color="var(--rx-accent)" />
          <h3>Free owner listings</h3>
          <p className="muted">Owners publish as many spaces as they need with rich descriptions, amenities, and VR links.</p>
        </article>
        <article className="card" style={{ padding: 24 }}>
          <ImageIcon size={28} color="var(--rx-accent)" />
          <h3>Image-first discovery</h3>
          <p className="muted">Warm, premium layouts put photography first across web and mobile without resorting to clutter.</p>
        </article>
        <article className="card" style={{ padding: 24 }}>
          <PhoneForwarded size={28} color="var(--rx-accent)" />
          <h3>Contact locked behind web checkout</h3>
          <p className="muted">The app never processes payments and never shows multiple payment links. One route, one compliance story.</p>
        </article>
      </section>

      <section>
        <div className="section-title">
          <div>
            <h2 style={{ marginBottom: 6 }}>Fresh listings</h2>
            <p className="muted" style={{ margin: 0 }}>
              Live feed from the backend. No placeholders.
            </p>
          </div>
          <Link href="/subscribe" className="button secondary">
            Subscribe
            <ArrowRight size={16} />
          </Link>
        </div>
        {feedQuery.data?.items.length ? (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {feedQuery.data.items.map((listing) => (
              <PropertyCard key={listing.listingId} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {feedQuery.isLoading ? "Loading the live feed..." : "No listings are live yet. Publish the first property from the dashboard."}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 28, display: "grid", gap: 12 }}>
        <div className="pill" style={{ width: "fit-content" }}>
          <CheckCircle2 size={16} />
          Compliance snapshot
        </div>
        <strong>No in-app purchase. No embedded Stripe or Paystack checkout. One external web checkout path only.</strong>
        <p className="muted" style={{ margin: 0 }}>
          That keeps the mobile app free while the subscription workflow stays entirely on the web.
        </p>
      </section>
    </main>
  );
}

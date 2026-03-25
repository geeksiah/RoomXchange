"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles
} from "lucide-react";
import { PropertyCard } from "../components/property-card";
import { useSession } from "../components/session-provider";

const features = [
  { icon: Search, title: "Search fast", copy: "Live locations, saved filters, clean map discovery." },
  { icon: MessageCircle, title: "Chat directly", copy: "Message owners and keep conversations in one place." },
  { icon: Sparkles, title: "List clearly", copy: "Owners publish bright, image-first listings without clutter." }
];

const supportAmounts = ["GHS 20", "GHS 50", "GHS 100", "GHS 200"];
const supportMethods = ["Paystack", "Hubtel"];

export default function HomePage() {
  const { api, session } = useSession();
  const supportUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_SUPPORT_URL ?? "").trim();
  const playStoreUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_PLAYSTORE_URL ?? "").trim();
  const appStoreUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_APPSTORE_URL ?? "").trim();
  const feedQuery = useQuery({
    queryKey: ["public-feed"],
    queryFn: () => api.getFeed({ limit: 6 })
  });

  return (
    <main className="landing-page shell">
      <section className="landing-hero card">
        <div className="landing-copy">
          <div className="pill landing-pill">
            <ShieldCheck size={16} />
            Mobile-first room marketplace
          </div>
          <h1>Find real rooms faster.</h1>
          <p className="muted landing-lead">
            Search, save, message, and manage listings from one clean mobile experience. Support and downloads stay on the web.
          </p>
          <div className="landing-cta-row">
            <Link className="button" href={session ? "/dashboard/listings/new" : "/subscribe"}>
              {session ? "Create listing" : "Get access"}
            </Link>
            <a className="button secondary" href="#downloads">
              Download app
            </a>
            <a className="button secondary" href="#support">
              Support RoomXchange
            </a>
          </div>
          <div className="landing-mini-proof">
            <span className="landing-metric">
              <strong>{feedQuery.data?.items.length ?? 0}</strong>
              Live listings
            </span>
            <span className="landing-metric">
              <strong>iOS</strong>
              + Android
            </span>
            <span className="landing-metric">
              <strong>Web</strong>
              Support page
            </span>
          </div>
        </div>

        <div className="landing-visual">
          <div className="landing-phone">
            <div className="landing-phone-top">
              <span>9:41</span>
              <span>RoomXchange</span>
            </div>
            <div className="landing-phone-media" />
            <div className="landing-phone-panel">
              <div className="landing-phone-row">
                <strong>Spintex studio</strong>
                <span className="landing-price">GHS 850</span>
              </div>
              <p className="muted">Accra • Private bath • 4 amenities</p>
              <div className="landing-chip-row">
                <span className="pill">Verified</span>
                <span className="pill">Realtime map</span>
                <span className="pill">Chat ready</span>
              </div>
            </div>
          </div>
          <div className="landing-float-card">
            <p className="landing-float-label">Support on web</p>
            <strong>Simple external checkout</strong>
            <span className="muted">Paystack or Hubtel</span>
          </div>
        </div>
      </section>

      <section className="landing-feature-grid">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article key={feature.title} className="card landing-feature-card">
              <div className="landing-feature-icon">
                <Icon size={20} />
              </div>
              <h3>{feature.title}</h3>
              <p className="muted">{feature.copy}</p>
            </article>
          );
        })}
      </section>

      <section id="downloads" className="card landing-downloads">
        <div className="landing-section-copy">
          <div className="pill landing-pill">
            <Smartphone size={16} />
            Direct downloads
          </div>
          <h2>Install the app.</h2>
          <p className="muted">
            Install the app, sign in once, and continue across listings, alerts, conversations, and profile tools.
          </p>
        </div>
        <div className="landing-store-grid">
          {playStoreUrl ? (
            <a className="button" href={playStoreUrl} target="_blank" rel="noreferrer">
              Google Play
            </a>
          ) : (
            <span className="button secondary landing-disabled-button">
              Google Play soon
            </span>
          )}
          {appStoreUrl ? (
            <a className="button secondary" href={appStoreUrl} target="_blank" rel="noreferrer">
              App Store
            </a>
          ) : (
            <span className="button secondary landing-disabled-button">
              App Store soon
            </span>
          )}
        </div>
      </section>

      <section className="landing-feed">
        <div className="section-title">
          <div>
            <h2 style={{ marginBottom: 6 }}>Latest listings</h2>
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
          <div className="landing-feed-grid">
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

      <section id="support" className="landing-support card">
        <div className="landing-support-dark">
          <div className="pill landing-dark-pill">
            <HeartHandshake size={16} />
            Support RoomXchange
          </div>
          <h2>Keep the app free.</h2>
          <p className="landing-dark-copy">
            Support hosting, moderation, and product updates from a simple external payment page.
          </p>
          <div className="landing-amount-grid">
            {supportAmounts.map((amount) => (
              <div key={amount} className="landing-amount-chip">
                {amount}
              </div>
            ))}
          </div>
        </div>

        <div className="landing-support-side">
          <div className="stat landing-support-card">
            <h3>Choose a method</h3>
            <div className="landing-method-grid">
              {supportMethods.map((method, index) => (
                <div key={method} className={`landing-method-row ${index === 0 ? "active" : ""}`}>
                  <div>
                    <strong>{method}</strong>
                    <p className="muted">External checkout</p>
                  </div>
                  <CheckCircle2 size={18} color={index === 0 ? "var(--rx-accent)" : "var(--rx-text-muted)"} />
                </div>
              ))}
            </div>
            {supportUrl ? (
              <a className="button" href={supportUrl} target="_blank" rel="noreferrer">
                Continue to support page
              </a>
            ) : (
              <span className="button secondary landing-disabled-button">
                Support link unavailable
              </span>
            )}
          </div>
          <div className="stat landing-note-card">
            <div className="pill landing-pill">
              <CheckCircle2 size={16} />
              Web-only support
            </div>
            <strong>Clean app. Separate support page.</strong>
            <p className="muted">
              It keeps the mobile experience focused and avoids mixing support payments into app functionality.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

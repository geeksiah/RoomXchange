"use client";

import {
  Bell,
  CheckCircle2,
  Download,
  HeartHandshake,
  MapPinned,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone
} from "lucide-react";

const appSignals = [
  { icon: Search, label: "Search" },
  { icon: MapPinned, label: "Map" },
  { icon: MessageCircle, label: "Chat" },
  { icon: Bell, label: "Alerts" }
];

const supportAmounts = ["GHS 20", "GHS 50", "GHS 100", "GHS 200"];
const supportMethods = ["Paystack", "Hubtel"];

export default function HomePage() {
  const supportUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_SUPPORT_URL ?? "").trim();
  const playStoreUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_PLAYSTORE_URL ?? "").trim();
  const appStoreUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_APPSTORE_URL ?? "").trim();

  return (
    <main className="landing-page shell landing-single">
      <section className="landing-topbar">
        <div className="landing-brand">
          <span className="landing-brand-mark">R</span>
          <div>
            <strong>RoomXchange</strong>
            <span>App + support</span>
          </div>
        </div>
        <div className="landing-topbar-links">
          <a href="#downloads">Download</a>
          <a href="#support">Support</a>
        </div>
      </section>

      <section className="card landing-minimal-hero">
        <div className="landing-copy">
          <div className="pill landing-pill">
            <ShieldCheck size={16} />
            Real rooms. Clean experience.
          </div>
          <h1>Find rooms. Chat owners. Move faster.</h1>
          <p className="muted landing-lead">
            One mobile app for discovery, saved alerts, conversations, and listing management.
          </p>

          <div id="downloads" className="landing-store-grid">
            {playStoreUrl ? (
              <a className="button" href={playStoreUrl} target="_blank" rel="noreferrer">
                <Download size={16} />
                Google Play
              </a>
            ) : (
              <span className="button secondary landing-disabled-button">Google Play soon</span>
            )}
            {appStoreUrl ? (
              <a className="button secondary" href={appStoreUrl} target="_blank" rel="noreferrer">
                <Smartphone size={16} />
                App Store
              </a>
            ) : (
              <span className="button secondary landing-disabled-button">App Store soon</span>
            )}
          </div>

          <div className="landing-signal-row">
            {appSignals.map(({ icon: Icon, label }) => (
              <span key={label} className="landing-signal-pill">
                <Icon size={15} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="landing-device-stack">
          <div className="landing-phone landing-phone-primary">
            <div className="landing-phone-top">
              <span>9:41</span>
              <span>Discover</span>
            </div>
            <div className="landing-phone-media" />
            <div className="landing-phone-panel">
              <div className="landing-phone-row">
                <strong>East Legon studio</strong>
                <span className="landing-price">GHS 950</span>
              </div>
              <p className="muted">Fast search • Live map • Direct chat</p>
            </div>
          </div>

          <div className="landing-phone landing-phone-secondary">
            <div className="landing-phone-top">
              <span>9:41</span>
              <span>Messages</span>
            </div>
            <div className="landing-chat-card">
              <div className="landing-chat-bubble owner">Hi, the room is still available.</div>
              <div className="landing-chat-bubble user">Great. Can I view it tomorrow?</div>
              <div className="landing-chat-bubble owner">Yes. 10am works.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="support" className="card landing-support-minimal">
        <div className="landing-support-dark">
          <div className="pill landing-dark-pill">
            <HeartHandshake size={16} />
            Support the project
          </div>
          <h2>Keep RoomXchange free.</h2>
          <p className="landing-dark-copy">Support hosting, updates, and moderation from one simple web checkout.</p>
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
            <div className="landing-method-grid">
              {supportMethods.map((method, index) => (
                <div key={method} className={`landing-method-row ${index === 0 ? "active" : ""}`}>
                  <div>
                    <strong>{method}</strong>
                    <p className="muted">External web checkout</p>
                  </div>
                  <CheckCircle2 size={18} color={index === 0 ? "var(--rx-accent)" : "var(--rx-text-muted)"} />
                </div>
              ))}
            </div>
            {supportUrl ? (
              <a className="button" href={supportUrl} target="_blank" rel="noreferrer">
                Continue to support
              </a>
            ) : (
              <span className="button secondary landing-disabled-button">Support link unavailable</span>
            )}
          </div>
          <div className="landing-note-inline">
            <ShieldCheck size={16} />
            Web-only support keeps the app clean and easy to review.
          </div>
        </div>
      </section>
    </main>
  );
}

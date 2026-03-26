"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Apple,
  ArrowDown,
  ChevronLeft,
  CircleX,
  Facebook,
  House,
  Instagram,
  Linkedin,
  Music2,
  Play,
  Twitter
} from "lucide-react";
import { createApiClient, roomXchangeConfig, type NotificationSettings } from "@roomxchange/shared";
import heroImage from "./assets/hero-image.png";
import desktopDonationImage from "./assets/desktop-donation-image.png";
import desktopFooterImage from "./assets/desktop-footer-image.png";
import donationSuccessIcon from "./assets/donation-success-icon.png";

const fallbackSupportAmounts = [50, 100, 200, 500, 1000];
const socialLinks = [
  { label: "Facebook", icon: Facebook, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_FACEBOOK_URL?.trim() || "#" },
  { label: "Instagram", icon: Instagram, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_INSTAGRAM_URL?.trim() || "#" },
  { label: "LinkedIn", icon: Linkedin, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_LINKEDIN_URL?.trim() || "#" },
  { label: "X", icon: Twitter, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_X_URL?.trim() || "#" },
  { label: "TikTok", icon: Music2, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_TIKTOK_URL?.trim() || "#" }
];

function StoreButton({
  href,
  icon: Icon,
  eyebrow,
  label,
  tone = "dark"
}: {
  href: string | null;
  icon: typeof Play | typeof Apple;
  eyebrow: string;
  label: string;
  tone?: "dark" | "light";
}) {
  const className = tone === "light" ? "landing-store-button light" : "landing-store-button";
  const content = (
    <>
      <span className="landing-store-icon">
        <Icon size={22} />
      </span>
      <span>
        <small>{eyebrow}</small>
        <strong>{label}</strong>
      </span>
    </>
  );

  if (!href) {
    return <span className={`${className} disabled`}>{content}</span>;
  }

  return (
    <a className={className} href={href} rel="noreferrer" target="_blank">
      {content}
    </a>
  );
}

function SocialRow() {
  return (
    <div className="landing-social-row">
      {socialLinks.map(({ label, icon: Icon, href }) => (
        <a
          aria-label={label}
          className="landing-social-link"
          href={href}
          key={label}
          rel="noreferrer"
          target={href === "#" ? undefined : "_blank"}
        >
          <Icon size={18} />
        </a>
      ))}
    </div>
  );
}

function LandingPageContent() {
  const searchParams = useSearchParams();
  const playStoreUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_PLAYSTORE_URL ?? "").trim() || null;
  const appStoreUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_APPSTORE_URL ?? "").trim() || null;
  const envSupportUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_SUPPORT_URL ?? "").trim() || null;
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    messageNotificationsEnabled: true,
    listingMatchNotificationsEnabled: true,
    donationProvider: "Paystack",
    donationUrl: envSupportUrl,
    donationPresetAmounts: fallbackSupportAmounts,
    updatedAt: new Date().toISOString()
  });
  const [selectedAmount, setSelectedAmount] = useState<number>(200);
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    const api = createApiClient({
      baseUrl: roomXchangeConfig.apiUrl || process.env.NEXT_PUBLIC_ROOMXCHANGE_API_URL || ""
    });
    let active = true;

    api
      .getNotificationSettings()
      .then((nextSettings) => {
        if (!active) {
          return;
        }

        setSettings({
          ...nextSettings,
          donationUrl: nextSettings.donationUrl ?? envSupportUrl
        });
        if (!customAmount && nextSettings.donationPresetAmounts.length) {
          setSelectedAmount(nextSettings.donationPresetAmounts[0] ?? 200);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [customAmount, envSupportUrl]);

  const donationSuccess = searchParams.get("donation") === "success";
  const supportAmounts = settings.donationPresetAmounts.length ? settings.donationPresetAmounts : fallbackSupportAmounts;
  const displayAmount = customAmount || String(selectedAmount);
  const numericAmount = Number(displayAmount.replace(/[^\d]/g, ""));
  const donateUrl = useMemo(() => {
    const base = settings.donationUrl ?? envSupportUrl;
    if (!base) {
      return null;
    }

    try {
      const url = new URL(base);
      if (numericAmount > 0) {
        url.searchParams.set("amount", String(numericAmount));
      }
      if (settings.donationProvider) {
        url.searchParams.set("method", settings.donationProvider);
      }
      url.searchParams.set("source", "landing-page");
      return url.toString();
    } catch {
      return base;
    }
  }, [envSupportUrl, numericAmount, settings.donationProvider, settings.donationUrl]);

  const keypadDigits = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "delete"]
  ];

  const applyQuickAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleDigitPress = (value: string) => {
    if (value === "delete") {
      setCustomAmount((current) => current.slice(0, -1));
      return;
    }

    if (!value) {
      return;
    }

    setCustomAmount((current) => `${current}${value}`.replace(/^0+(?=\d)/, ""));
  };

  return (
    <main className="landing-fullpage">
      <section className="landing-section landing-hero-section" id="hero">
        <div className="landing-hero-backdrop" />
        <div className="landing-hero-shell shell">
          <header className="landing-main-nav">
            <a className="landing-logo" href="#hero">
              <span className="landing-logo-mark">
                <House size={22} strokeWidth={2.4} />
              </span>
              <span>RoomXchange</span>
            </a>
            <a className="landing-donate-pill" href="#support">
              Donate
            </a>
          </header>

          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <h1>
                Find rooms.
                <br />
                No agent fees.
              </h1>
              <p>Find rooms directly from owners and ex-tenants.</p>
              <p className="landing-subcopy">
                RoomXchange connects you directly to people with available spaces, so you can list or find a room faster,
                without the hassle.
              </p>

              <div className="landing-store-row">
                <StoreButton href={playStoreUrl} icon={Play} eyebrow="GET IT ON" label="Google Play" />
                <StoreButton href={appStoreUrl} icon={Apple} eyebrow="Download on the" label="App Store" />
              </div>
            </div>

            <div className="landing-hero-visual">
              <Image alt="RoomXchange mobile app preview" className="landing-hero-image" priority src={heroImage} />
              <a className="landing-mobile-donate" href="#support">
                Donate
              </a>
            </div>
          </div>
        </div>

        <div className="landing-disclaimer-bar">
          <div className="shell">
            <span>Disclaimer!</span> This is a free platform to support prospective tenants who feel stranded searching for rooms.
          </div>
        </div>

        <a className="landing-scroll-cue" href="#support">
          <span>scroll down to donate</span>
          <ArrowDown size={30} />
        </a>
      </section>

      <section className="landing-section landing-donation-section" id="support">
        <div className="shell landing-donation-shell">
          <div className="landing-donation-head">
            <h2>
              Help us keep RoomXchange <span>free forever</span>
            </h2>
            <p>Your support helps us run servers, power essential services, and keep RoomXchange free for everyone.</p>
          </div>

          <div className="landing-donation-grid">
            <div className="landing-donation-art desktop-only">
              <Image alt="RoomXchange donation preview" src={desktopDonationImage} />
            </div>

            <div className="landing-donation-panel">
              <div className="landing-method-chip">{settings.donationProvider ?? "External checkout"}</div>

              <div className="landing-desktop-donation">
                <div className="landing-amount-chooser">
                  <span>Select amount</span>
                  <div className="landing-amount-row">
                    {supportAmounts.map((amount) => (
                      <button
                        className={`landing-amount-button ${!customAmount && selectedAmount === amount ? "active" : ""}`}
                        key={amount}
                        onClick={() => applyQuickAmount(amount)}
                        type="button"
                      >
                        GHS {amount}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="landing-desktop-input">
                  <span>Enter custom amount</span>
                  <input
                    inputMode="numeric"
                    onChange={(event) => setCustomAmount(event.target.value.replace(/[^\d]/g, ""))}
                    placeholder="GHS 2000"
                    value={customAmount}
                  />
                </label>

                {donateUrl ? (
                  <a className="landing-primary-cta" href={donateUrl} rel="noreferrer" target="_blank">
                    Donate now
                  </a>
                ) : (
                  <span className="landing-primary-cta disabled">Donation method unavailable</span>
                )}
              </div>

              <div className="landing-mobile-donation">
                <a className="landing-round-icon" href="#hero">
                  <ChevronLeft size={22} />
                </a>

                <div className="landing-mobile-amount-display">
                  <span>Enter custom amount</span>
                  <strong>GHS {displayAmount || "0"}</strong>
                </div>

                <div className="landing-mobile-chip-row">
                  {supportAmounts.map((amount) => (
                    <button
                      className={`landing-amount-button ${!customAmount && selectedAmount === amount ? "active" : ""}`}
                      key={amount}
                      onClick={() => applyQuickAmount(amount)}
                      type="button"
                    >
                      GHS {amount}
                    </button>
                  ))}
                </div>

                <div className="landing-keypad">
                  {keypadDigits.flat().map((keyValue, index) => (
                    <button
                      className={`landing-keypad-key ${keyValue === "delete" ? "delete" : ""} ${!keyValue ? "empty" : ""}`}
                      key={`${keyValue}-${index}`}
                      onClick={() => handleDigitPress(keyValue)}
                      type="button"
                    >
                      {keyValue === "delete" ? <CircleX size={24} /> : keyValue}
                    </button>
                  ))}
                </div>

                {donateUrl ? (
                  <a className="landing-primary-cta" href={donateUrl} rel="noreferrer" target="_blank">
                    Donate now
                  </a>
                ) : (
                  <span className="landing-primary-cta disabled">Donation method unavailable</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-success-section" id="success">
        <div className="shell landing-success-shell">
          <a className="landing-round-icon" href="#support">
            <CircleX size={22} />
          </a>
          <div className="landing-success-card">
            <Image alt="Donation success icon" className="landing-success-icon" src={donationSuccessIcon} />
            <h3>{donationSuccess ? "Your donation is successful" : "Every donation keeps RoomXchange free"}</h3>
            <p>
              {donationSuccess
                ? "Thank you for sending in your support."
                : "Support helps us run servers, power essential services, and keep RoomXchange free for everyone."}
            </p>
            <p className="landing-success-copy">
              {donationSuccess
                ? "Your support helps us run servers, power essential services, and keep RoomXchange free for everyone."
                : "Use the button below whenever you want to support the project again."}
            </p>
            <div className="landing-follow-label">Follow us on our socials:</div>
            <SocialRow />
            {donateUrl ? (
              <a className="landing-primary-cta" href={donateUrl} rel="noreferrer" target="_blank">
                {donationSuccess ? "Donate again" : "Support RoomXchange"}
              </a>
            ) : (
              <span className="landing-primary-cta disabled">Donation method unavailable</span>
            )}
          </div>
        </div>
      </section>

      <section className="landing-section landing-footer-section" id="downloads">
        <div className="shell landing-footer-shell">
          <div className="landing-footer-copy">
            <h2>
              Find rooms.
              <br />
              No agent fees.
            </h2>
            <p>Find rooms directly from owners and ex-tenants.</p>
            <p className="landing-subcopy">
              RoomXchange connects you directly to people with available spaces, so you can list or find a room faster,
              without the hassle.
            </p>

            <div className="landing-store-row">
              <StoreButton href={playStoreUrl} icon={Play} eyebrow="GET IT ON" label="Google Play" tone="light" />
              <StoreButton href={appStoreUrl} icon={Apple} eyebrow="Download on the" label="App Store" tone="light" />
            </div>

            <SocialRow />
          </div>

          <div className="landing-footer-visual">
            <Image alt="RoomXchange saved alerts preview" src={desktopFooterImage} />
          </div>
        </div>
      </section>
    </main>
  );
}

function LandingPageFallback() {
  return (
    <main className="landing-fullpage">
      <section className="landing-section landing-hero-section">
        <div className="landing-hero-backdrop" />
        <div className="landing-hero-shell shell" style={{ justifyItems: "start" }}>
          <div className="landing-hero-copy" style={{ paddingTop: 120 }}>
            <h1>
              Find rooms.
              <br />
              No agent fees.
            </h1>
            <p>Loading RoomXchange...</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LandingPageFallback />}>
      <LandingPageContent />
    </Suspense>
  );
}

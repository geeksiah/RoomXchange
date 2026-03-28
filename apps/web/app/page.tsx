"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Apple, ArrowRight, Facebook, House, Instagram, Linkedin, Music2, Play, Twitter } from "lucide-react";
import { createApiClient, roomXchangeConfig, type NotificationSettings } from "@roomxchange/shared";
import heroImage from "./assets/hero-image.png";
import desktopDonationImage from "./assets/desktop-donation-image.png";
import desktopFooterImage from "./assets/desktop-footer-image.png";
import donationSuccessIcon from "./assets/donation-success-icon.png";

const fallbackSupportAmounts = [50, 100, 200, 500, 1000];

const socialLinks = [
  { label: "Facebook", icon: Facebook, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_FACEBOOK_URL?.trim() || "" },
  { label: "Instagram", icon: Instagram, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_INSTAGRAM_URL?.trim() || "" },
  { label: "LinkedIn", icon: Linkedin, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_LINKEDIN_URL?.trim() || "" },
  { label: "X", icon: Twitter, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_X_URL?.trim() || "" },
  { label: "TikTok", icon: Music2, href: process.env.NEXT_PUBLIC_ROOMXCHANGE_TIKTOK_URL?.trim() || "" }
].filter((item) => item.href);

function StoreButton({
  href,
  icon: Icon,
  eyebrow,
  label
}: {
  href: string | null;
  icon: typeof Play | typeof Apple;
  eyebrow: string;
  label: string;
}) {
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
    return <span className="landing-store-button disabled">{content}</span>;
  }

  return (
    <a className="landing-store-button" href={href} rel="noreferrer" target="_blank">
      {content}
    </a>
  );
}

function SocialLinks() {
  if (!socialLinks.length) {
    return null;
  }

  return (
    <div className="landing-socials">
      {socialLinks.map(({ label, icon: Icon, href }) => (
        <a aria-label={label} className="landing-social" href={href} key={label} rel="noreferrer" target="_blank">
          <Icon size={18} />
        </a>
      ))}
    </div>
  );
}

function LandingPageContent() {
  const searchParams = useSearchParams();
  const apiBaseUrl = roomXchangeConfig.apiUrl || process.env.NEXT_PUBLIC_ROOMXCHANGE_API_URL || "";
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
  const [selectedAmount, setSelectedAmount] = useState(200);
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    if (!apiBaseUrl) {
      return;
    }

    const api = createApiClient({ baseUrl: apiBaseUrl });
    let active = true;

    api
      .getNotificationSettings()
      .then((nextSettings) => {
        if (!active) {
          return;
        }

        const presetAmounts = Array.isArray(nextSettings.donationPresetAmounts)
          ? nextSettings.donationPresetAmounts.filter((amount) => Number.isFinite(amount) && amount > 0)
          : [];
        const normalizedPresetAmounts = presetAmounts.length ? presetAmounts : fallbackSupportAmounts;

        setSettings({
          ...nextSettings,
          donationPresetAmounts: normalizedPresetAmounts,
          donationUrl: nextSettings.donationUrl ?? envSupportUrl
        });
        if (!customAmount) {
          setSelectedAmount(normalizedPresetAmounts[0] ?? 200);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [apiBaseUrl, envSupportUrl]);

  const donationSuccess = searchParams.get("donation") === "success";
  const supportAmounts = (Array.isArray(settings.donationPresetAmounts) ? settings.donationPresetAmounts : fallbackSupportAmounts).filter((amount) =>
    Number.isFinite(amount) && amount > 0
  );
  const normalizedSupportAmounts = supportAmounts.length ? supportAmounts : fallbackSupportAmounts;
  const displayAmount = customAmount || String(selectedAmount);
  const numericAmount = Number(displayAmount.replace(/[^\d]/g, ""));
  const donationProvider = settings.donationProvider?.trim() || null;
  const donationBaseUrl = settings.donationUrl?.trim() || envSupportUrl;
  const donationEnabled = Boolean(donationProvider && donationBaseUrl);

  const donateUrl = useMemo(() => {
    if (!donationEnabled || !donationBaseUrl) {
      return null;
    }

    try {
      const url = new URL(donationBaseUrl);
      if (numericAmount > 0) {
        url.searchParams.set("amount", String(numericAmount));
      }
      if (donationProvider) {
        url.searchParams.set("method", donationProvider);
      }
      url.searchParams.set("source", "landing-page");
      return url.toString();
    } catch {
      return donationBaseUrl;
    }
  }, [donationBaseUrl, donationEnabled, donationProvider, numericAmount]);

  const quickAmounts = normalizedSupportAmounts.slice(0, 5);

  return (
    <main className="landing-page">
      <section className="landing-hero" id="hero">
        <div className="landing-section-shell shell">
          <header className="landing-nav">
            <a className="landing-brand" href="#hero">
              <span className="landing-brand-mark">
                <House size={20} strokeWidth={2.4} />
              </span>
              <span>RoomXchange</span>
            </a>
            {donationEnabled ? (
              <a className="landing-nav-cta" href="#support">
                Donate
              </a>
            ) : null}
          </header>

          <div className="landing-hero-strip">
            <strong>Disclaimer!</strong>
            <span>This platform stays free by design and depends on community support.</span>
          </div>

          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <h1>
                Find rooms.
                <br />
                No agent fees.
              </h1>
              <p>Find rooms directly from owners and ex-tenants.</p>
              <div className="landing-store-row">
                <StoreButton href={playStoreUrl} icon={Play} eyebrow="GET IT ON" label="Google Play" />
                <StoreButton href={appStoreUrl} icon={Apple} eyebrow="Download on the" label="App Store" />
              </div>
            </div>

            <div className="landing-hero-visual">
              <Image alt="RoomXchange explore experience" className="landing-hero-phone" priority src={heroImage} />
            </div>
          </div>
        </div>
      </section>

      {donationEnabled ? (
        <section className="landing-donation" id="support">
          <div className="landing-section-shell shell landing-donation-grid">
            <div className="landing-donation-visual">
              <div className="landing-donation-stage">
                <Image alt="RoomXchange donation preview" className="landing-donation-phone-primary" src={desktopDonationImage} />
                <Image alt="RoomXchange alert creation preview" className="landing-donation-phone-secondary" src={desktopFooterImage} />
              </div>
            </div>

            <div className="landing-donation-copy">
              <div className="landing-donation-copy-block">
                <h2>Keep RoomXchange free.</h2>
                <p>Your support keeps the product online, stable, and free to use.</p>
              </div>

              {donationSuccess ? (
                <div className="landing-donation-panel landing-success-panel">
                  <Image alt="Donation success" className="landing-success-icon" src={donationSuccessIcon} />
                  <div className="landing-success-copy">
                    <h3>Your donation is successful</h3>
                    <p>Thank you for sending in your support.</p>
                  </div>
                  <SocialLinks />
                  {donateUrl ? (
                    <a className="landing-panel-cta" href={donateUrl} rel="noreferrer" target="_blank">
                      Donate again
                    </a>
                  ) : null}
                </div>
              ) : (
                <div className="landing-donation-panel">
                  <div className="landing-provider-line">
                    <span>Donation method</span>
                    <strong>{donationProvider}</strong>
                  </div>

                  <div className="landing-amount-block">
                    <span>Select amount</span>
                    <div className="landing-amount-grid">
                      {quickAmounts.map((amount) => (
                        <button
                          className={`landing-amount-option ${!customAmount && selectedAmount === amount ? "active" : ""}`}
                          key={amount}
                          onClick={() => {
                            setSelectedAmount(amount);
                            setCustomAmount("");
                          }}
                          type="button"
                        >
                          GHS {amount}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="landing-amount-input">
                    <span>Enter custom amount</span>
                    <input
                      inputMode="numeric"
                      onChange={(event) => setCustomAmount(event.target.value.replace(/[^\d]/g, ""))}
                      placeholder="GHS 2000"
                      value={customAmount}
                    />
                  </label>

                  <a className="landing-panel-cta" href={donateUrl ?? "#hero"} rel="noreferrer" target={donateUrl ? "_blank" : undefined}>
                    Donate now
                    <ArrowRight size={18} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function LandingPageFallback() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-section-shell shell">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <h1>
                Find rooms.
                <br />
                No agent fees.
              </h1>
              <p>Loading RoomXchange...</p>
            </div>
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

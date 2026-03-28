"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import desktopDonationImage from "../../app/assets/desktop-donation-image.png";
import desktopFooterImage from "../../app/assets/desktop-footer-image.png";
import donationSuccessIcon from "../../app/assets/donation-success-icon.png";
import heroImage from "../../app/assets/hero-image.png";
import { useDesktopMotion } from "./hooks";
import { AmountPills, BrandLogo, DisclaimerTicker, ScrollIndicator, SocialLinks, StoreButton, type SocialLink } from "./landing-shared";
import styles from "./landing.module.css";

type CopyBlock = {
  donationSupport: string;
  eyebrow: string;
  paragraph: string;
  successImpact: string;
  successThankYou: string;
};

type LandingDesktopProps = {
  appStoreUrl: string | null;
  copy: CopyBlock;
  customAmount: string;
  desktopTier: "compact" | "medium" | "wide";
  disclaimerText: string;
  donateUrl: string | null;
  donationEnabled: boolean;
  donationSuccess: boolean;
  onCustomAmountChange: (value: string) => void;
  onPresetAmount: (amount: number) => void;
  playStoreUrl: string | null;
  prefersReducedMotion: boolean;
  selectedAmount: number | null;
  socialLinks: SocialLink[];
  supportAmounts: number[];
};

function PrimaryDonateButton({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return <span className={`${styles.primaryCta} ${styles.primaryCtaDisabled}`}>{label}</span>;
  }

  return (
    <a className={styles.primaryCta} href={href}>
      <span>{label}</span>
      <ArrowRight size={18} strokeWidth={2.5} />
    </a>
  );
}

function DonationCard({
  customAmount,
  donateUrl,
  onCustomAmountChange,
  onPresetAmount,
  selectedAmount,
  supportAmounts
}: {
  customAmount: string;
  donateUrl: string | null;
  onCustomAmountChange: (value: string) => void;
  onPresetAmount: (amount: number) => void;
  selectedAmount: number | null;
  supportAmounts: number[];
}) {
  return (
    <div className={styles.desktopDonationCard}>
      <div className={styles.desktopDonationBlock}>
        <span className={styles.desktopDonationLabel}>Select amount</span>
        <AmountPills amounts={supportAmounts.slice(0, 5)} onSelect={onPresetAmount} selectedAmount={selectedAmount} />
      </div>

      <label className={styles.desktopDonationBlock}>
        <span className={styles.desktopDonationLabel}>Enter custom amount</span>
        <span className={styles.desktopAmountField}>
          <span className={styles.desktopAmountPrefix}>GHS</span>
          <input
            className={styles.desktopAmountInput}
            inputMode="numeric"
            onChange={(event) => onCustomAmountChange(event.target.value.replace(/[^\d]/g, "").slice(0, 6))}
            placeholder="2000"
            value={customAmount}
          />
        </span>
      </label>

      <PrimaryDonateButton href={donateUrl} label="Donate now" />
    </div>
  );
}

function DesktopSuccessCard({ donateUrl, socialLinks, copy }: { donateUrl: string | null; socialLinks: SocialLink[]; copy: CopyBlock }) {
  return (
    <div className={`${styles.desktopDonationCard} ${styles.desktopSuccessCard}`}>
      <Image alt="Donation success" className={styles.desktopSuccessIcon} src={donationSuccessIcon} />
      <div className={styles.desktopSuccessCopy}>
        <h3>Your donation is successful</h3>
        <p>{copy.successThankYou}</p>
        <p>{copy.successImpact}</p>
      </div>
      <SocialLinks links={socialLinks} />
      <PrimaryDonateButton href={donateUrl} label="Donate again" />
    </div>
  );
}

export function LandingDesktop({
  appStoreUrl,
  copy,
  customAmount,
  desktopTier,
  disclaimerText,
  donateUrl,
  donationEnabled,
  donationSuccess,
  onCustomAmountChange,
  onPresetAmount,
  playStoreUrl,
  prefersReducedMotion,
  selectedAmount,
  socialLinks,
  supportAmounts
}: LandingDesktopProps) {
  const motionRef = useDesktopMotion(prefersReducedMotion);
  const donationSectionRef = useRef<HTMLElement | null>(null);

  const handleScrollToDonation = useCallback(() => {
    donationSectionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start"
    });
  }, [prefersReducedMotion]);

  return (
    <main className={styles.desktopRoot} data-tier={desktopTier} ref={motionRef}>
      <section className={styles.heroSection} id="hero">
        <header className={styles.heroHeader}>
          <BrandLogo />
          <button className={styles.heroDonateButton} onClick={handleScrollToDonation} type="button">
            Donate
          </button>
        </header>

        <div className={styles.heroShell}>
          <div className={styles.heroGrid}>
            <div className={`${styles.heroCopyBlock} ${styles.revealItem}`} data-parallax-speed="0.14" data-reveal>
              <h1 className={styles.heroTitle}>
                Find rooms.
                <br />
                <span className={styles.titleNoWrap}>No agent fees.</span>
              </h1>
              <div className={styles.heroParagraphs}>
                <p>{copy.eyebrow}</p>
                <p>{copy.paragraph}</p>
              </div>
              <div className={styles.desktopStoreRow}>
                <StoreButton href={playStoreUrl} store="play" tone="dark" />
                <StoreButton href={appStoreUrl} store="app" tone="dark" />
              </div>
            </div>

            <div className={`${styles.heroVisualWrap} ${styles.revealItem}`} data-parallax-speed="0.24" data-reveal>
              <Image alt="RoomXchange app preview in hand" className={styles.heroImage} priority src={heroImage} />
            </div>
          </div>
        </div>

        <div className={styles.scrollBadgeDock}>
          <ScrollIndicator onClick={handleScrollToDonation} />
        </div>
      </section>

      <DisclaimerTicker text={disclaimerText} />

      <section className={styles.donationSection} id="support" ref={donationSectionRef}>
        <div className={styles.donationShell}>
          <div className={`${styles.donationHeading} ${styles.revealItem}`} data-reveal>
            <h2 className={styles.donationTitle}>
              Help us keep RoomXchange <span>free forever</span>
            </h2>
            <p>{copy.donationSupport}</p>
          </div>

          <div className={styles.donationGrid}>
            <div className={`${styles.donationDeviceWrap} ${styles.revealItem}`} data-parallax-speed="0.18" data-reveal>
              <Image alt="RoomXchange explore screen" className={styles.donationDeviceImage} src={desktopDonationImage} />
            </div>

            <div className={`${styles.donationCardColumn} ${styles.revealItem}`} data-parallax-speed="0.08" data-reveal>
              {donationSuccess ? (
                <DesktopSuccessCard copy={copy} donateUrl={donateUrl} socialLinks={socialLinks} />
              ) : (
                <DonationCard
                  customAmount={customAmount}
                  donateUrl={donateUrl}
                  onCustomAmountChange={onCustomAmountChange}
                  onPresetAmount={onPresetAmount}
                  selectedAmount={selectedAmount}
                  supportAmounts={supportAmounts}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.footerSection}>
        <div className={styles.footerShell}>
          <div className={`${styles.footerPanel} ${styles.revealItem}`} data-parallax-speed="0.08" data-reveal>
            <div className={styles.footerPanelInner}>
              <h2 className={styles.footerTitle}>
                Find rooms.
                <br />
                <span className={styles.titleNoWrap}>No agent fees.</span>
              </h2>
              <div className={styles.footerParagraphs}>
                <p>{copy.eyebrow}</p>
                <p>{copy.paragraph}</p>
              </div>
              <div className={styles.footerStoreRow}>
                <StoreButton href={playStoreUrl} store="play" tone="light" />
                <StoreButton href={appStoreUrl} store="app" tone="light" />
              </div>
              <SocialLinks inverted links={socialLinks} />
            </div>
          </div>

          <div className={`${styles.footerVisualWrap} ${styles.revealItem}`} data-parallax-speed="0.16" data-reveal>
            <Image alt="RoomXchange alert creation phone preview" className={styles.footerDeviceImage} src={desktopFooterImage} />
          </div>
        </div>
      </section>
    </main>
  );
}

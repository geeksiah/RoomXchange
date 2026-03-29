"use client";

import Image from "next/image";
import { ArrowLeft, X } from "lucide-react";
import donationSuccessIcon from "../../app/assets/donation-success-icon.png";
import heroImage from "../../app/assets/hero-image.png";
import { AmountPills, BrandLogo, DisclaimerTicker, NumericKeypad, SocialLinks, StoreButton, type SocialLink } from "./landing-shared";
import styles from "./landing.module.css";

export type MobileScreenState = "landing" | "entry" | "success";

type CopyBlock = {
  donationSupport: string;
  eyebrow: string;
  paragraph: string;
  successImpact: string;
  successThankYou: string;
};

type LandingMobileProps = {
  appStoreUrl: string | null;
  copy: CopyBlock;
  disclaimerText: string;
  donationEnabled: boolean;
  mobileAmountDigits: string;
  mobileQuickAmounts: number[];
  onCloseEntry: () => void;
  onCloseSuccess: () => void;
  onDeleteDigit: () => void;
  onDonateAgain: () => void;
  onDonateNow: () => void;
  onOpenEntry: () => void;
  onPresetAmount: (amount: number) => void;
  onPressDigit: (digit: string) => void;
  playStoreUrl: string | null;
  prefersReducedMotion: boolean;
  screen: MobileScreenState;
  socialLinks: SocialLink[];
};

function MobileDonateButton({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button className={`${styles.mobilePrimaryCta} ${!enabled ? styles.primaryCtaDisabled : ""}`} disabled={!enabled} onClick={onClick} type="button">
      Donate now
    </button>
  );
}

export function LandingMobile({
  appStoreUrl,
  copy,
  disclaimerText,
  donationEnabled,
  mobileAmountDigits,
  mobileQuickAmounts,
  onCloseEntry,
  onCloseSuccess,
  onDeleteDigit,
  onDonateAgain,
  onDonateNow,
  onOpenEntry,
  onPresetAmount,
  onPressDigit,
  playStoreUrl,
  prefersReducedMotion,
  screen,
  socialLinks
}: LandingMobileProps) {
  const selectedQuickAmount = mobileQuickAmounts.includes(Number(mobileAmountDigits)) ? Number(mobileAmountDigits) : null;

  return (
    <main className={styles.mobileRoot}>
      <div className={styles.mobileSafeTop} />
      <DisclaimerTicker compact text={disclaimerText} />

      <section className={styles.mobileHeroSection}>
        <div className={styles.mobileHeroInner}>
          <BrandLogo />

          <div className={styles.mobileHeroCopy}>
            <h1 className={styles.mobileHeroTitle}>
              Find rooms.
              <br />
              <span className={styles.titleNoWrap}>No agent fees.</span>
            </h1>
            <div className={styles.mobileHeroParagraphs}>
              <p>{copy.eyebrow}</p>
              <p>{copy.paragraph}</p>
            </div>
          </div>

          <div className={styles.mobileStoreColumn}>
            <StoreButton href={playStoreUrl} stacked store="play" tone="dark" />
            <StoreButton href={appStoreUrl} stacked store="app" tone="dark" />
          </div>

          <div className={styles.mobileHeroVisual}>
            <Image alt="RoomXchange app preview in hand" className={styles.mobileHeroImage} priority src={heroImage} />
            <button className={styles.mobileFloatingDonate} onClick={onOpenEntry} type="button">
              Donate
            </button>
          </div>
        </div>
      </section>

      {screen === "entry" ? (
        <div className={`${styles.mobileOverlay} ${prefersReducedMotion ? styles.mobileOverlayNoMotion : ""}`} role="dialog" aria-modal="true">
          <div className={styles.mobileOverlayInner}>
            <button aria-label="Back" className={styles.mobileIconButton} onClick={onCloseEntry} type="button">
              <ArrowLeft size={26} strokeWidth={2.5} />
            </button>

            <div className={styles.mobileAmountHeader}>
              <h2>Enter custom amount</h2>
              <div className={styles.mobileAmountDisplay}>
                <span className={styles.mobileAmountCurrency}>GHS</span>
                <span>{mobileAmountDigits}</span>
              </div>
              <span className={styles.mobileAmountUnderline} />
            </div>

            <AmountPills amounts={mobileQuickAmounts} compact onSelect={onPresetAmount} selectedAmount={selectedQuickAmount} />

            <NumericKeypad onDelete={onDeleteDigit} onDigit={onPressDigit} />

            <div className={styles.mobileOverlayFooter}>
              <MobileDonateButton enabled={donationEnabled} onClick={onDonateNow} />
            </div>
          </div>
        </div>
      ) : null}

      {screen === "success" ? (
        <div className={`${styles.mobileOverlay} ${prefersReducedMotion ? styles.mobileOverlayNoMotion : ""}`} role="dialog" aria-modal="true">
          <div className={`${styles.mobileOverlayInner} ${styles.mobileSuccessInner}`}>
            <button aria-label="Close success message" className={styles.mobileIconButton} onClick={onCloseSuccess} type="button">
              <X size={24} strokeWidth={2.6} />
            </button>

            <div className={styles.mobileSuccessBody}>
              <Image alt="Donation success" className={styles.mobileSuccessIcon} src={donationSuccessIcon} />
              <div className={styles.mobileSuccessCopy}>
                <h2>Your donation is successful</h2>
                <p>{copy.successThankYou}</p>
                <p>{copy.successImpact}</p>
              </div>
              <div className={styles.mobileSocialBlock}>
                <span>Follow us on our socials:</span>
                <SocialLinks links={socialLinks} />
              </div>
            </div>

            <div className={styles.mobileOverlayFooter}>
              <button className={styles.mobilePrimaryCta} onClick={onDonateAgain} type="button">
                Donate again
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

"use client";

import Image from "next/image";
import { Apple, ArrowDown, Delete, Facebook, Instagram, Linkedin, Music2 } from "lucide-react";
import appStoreIcon from "../../app/assets/Apple.svg";
import logoAsset from "../../app/assets/logo.svg";
import playStoreIcon from "../../app/assets/Playstore.svg";
import styles from "./landing.module.css";

export type SocialLink = {
  href: string | null;
  label: string;
};

type StoreButtonProps = {
  href: string | null;
  tone: "dark" | "light";
  store: "play" | "app";
  stacked?: boolean;
};

const storeMeta = {
  play: {
    eyebrow: "GET IT ON",
    icon: playStoreIcon,
    label: "Google Play"
  },
  app: {
    eyebrow: "Download on the",
    icon: appStoreIcon,
    label: "App Store"
  }
} as const;

const socialGlyphMap = {
  Facebook,
  Instagram,
  LinkedIn: Linkedin,
  TikTok: Music2
} as const;

export function BrandLogo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className={`${styles.brandLockup} ${inverted ? styles.brandLockupInverted : ""}`}>
      <Image alt="RoomXchange" className={styles.brandLogoImage} priority src={logoAsset} />
    </span>
  );
}

export function StoreButton({ href, tone, store, stacked = false }: StoreButtonProps) {
  const meta = storeMeta[store];
  const className = `${styles.storeButton} ${tone === "light" ? styles.storeButtonLight : styles.storeButtonDark} ${
    stacked ? styles.storeButtonStacked : ""
  }`;
  const content = (
    <>
      <span className={styles.storeIconWrap}>
        <Image alt="" aria-hidden className={styles.storeIcon} src={meta.icon} />
      </span>
      <span className={styles.storeCopy}>
        <small>{meta.eyebrow}</small>
        <strong>{meta.label}</strong>
      </span>
    </>
  );

  if (!href) {
    return (
      <span aria-disabled="true" className={`${className} ${styles.storeButtonDisabled}`}>
        {content}
      </span>
    );
  }

  return (
    <a className={className} href={href} rel="noreferrer" target="_blank">
      {content}
    </a>
  );
}

export function DisclaimerTicker({ text, compact = false }: { text: string; compact?: boolean }) {
  const entry = (
    <span className={styles.tickerEntry}>
      <strong>Disclaimer!</strong>
      <span>{text}</span>
    </span>
  );

  return (
    <div className={`${styles.ticker} ${compact ? styles.tickerCompact : ""}`} role="note">
      <div className={styles.tickerViewport}>
        <div className={styles.tickerTrack}>
          {entry}
          {entry}
          {entry}
        </div>
        <div aria-hidden className={styles.tickerTrack}>
          {entry}
          {entry}
          {entry}
        </div>
      </div>
    </div>
  );
}

export function ScrollIndicator({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label="Scroll to donation section" className={styles.scrollIndicator} onClick={onClick} type="button">
      <svg aria-hidden className={styles.scrollIndicatorRing} viewBox="0 0 160 160">
        <defs>
          <path
            d="M 80,80 m -50,0 a 50,50 0 1,1 100,0 a 50,50 0 1,1 -100,0"
            id="landing-scroll-ring"
          />
        </defs>
        <text>
          <textPath href="#landing-scroll-ring" startOffset="0%">
            scroll down to donate / scroll down to donate /
          </textPath>
        </text>
      </svg>
      <span className={styles.scrollIndicatorCenter}>
        <ArrowDown size={38} strokeWidth={2.8} />
      </span>
    </button>
  );
}

export function SocialLinks({
  links,
  inverted = false
}: {
  links: SocialLink[];
  inverted?: boolean;
}) {
  return (
    <div className={`${styles.socialRow} ${inverted ? styles.socialRowInverted : ""}`}>
      {links.map((item) => {
        if (item.label === "X") {
          const content = <span className={styles.socialX}>X</span>;
          return item.href ? (
            <a
              aria-label={item.label}
              className={styles.socialLink}
              href={item.href}
              key={item.label}
              rel="noreferrer"
              target="_blank"
            >
              {content}
            </a>
          ) : (
            <span aria-hidden className={styles.socialLink} key={item.label}>
              {content}
            </span>
          );
        }

        const Icon = socialGlyphMap[item.label as keyof typeof socialGlyphMap];
        const content = <Icon size={18} strokeWidth={2.2} />;

        return item.href ? (
          <a
            aria-label={item.label}
            className={styles.socialLink}
            href={item.href}
            key={item.label}
            rel="noreferrer"
            target="_blank"
          >
            {content}
          </a>
        ) : (
          <span aria-hidden className={styles.socialLink} key={item.label}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function AmountPills({
  amounts,
  selectedAmount,
  onSelect,
  compact = false
}: {
  amounts: number[];
  selectedAmount: number | null;
  onSelect: (amount: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.amountPills} ${compact ? styles.amountPillsCompact : ""}`}>
      {amounts.map((amount) => (
        <button
          className={`${styles.amountPill} ${selectedAmount === amount ? styles.amountPillActive : ""}`}
          key={amount}
          onClick={() => onSelect(amount)}
          type="button"
        >
          GHS {amount}
        </button>
      ))}
    </div>
  );
}

export function NumericKeypad({
  onDelete,
  onDigit
}: {
  onDelete: () => void;
  onDigit: (digit: string) => void;
}) {
  return (
    <div className={styles.numericKeypad}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <button className={styles.keypadKey} key={digit} onClick={() => onDigit(digit)} type="button">
          {digit}
        </button>
      ))}
      <div className={styles.keypadSpacer} />
      <button className={styles.keypadKey} onClick={() => onDigit("0")} type="button">
        0
      </button>
      <button aria-label="Delete digit" className={`${styles.keypadKey} ${styles.keypadDelete}`} onClick={onDelete} type="button">
        <Delete size={28} strokeWidth={2.3} />
      </button>
    </div>
  );
}

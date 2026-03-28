"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createApiClient, roomXchangeConfig, type NotificationSettings } from "@roomxchange/shared";
import { LandingDesktop } from "./landing-desktop";
import { LandingMobile, type MobileScreenState } from "./landing-mobile";
import { type SocialLink } from "./landing-shared";
import { useAdaptiveMode, useBodyScrollLock, useReducedMotionSafe } from "./hooks";
import styles from "./landing.module.css";

const fallbackSupportAmounts = [50, 100, 200, 500, 1000];
const mobileQuickAmounts = [50, 100, 200, 500];

const marketingCopy = {
  eyebrow: "Find rooms directly from owners and ex-tenants.",
  paragraph:
    "RoomXchange connects you directly to people with available spaces, so you can list or find a room faster, without the hassle.",
  donationSupport:
    "Your support helps us run servers, power essential services, and keep RoomXchange free for everyone.",
  successThankYou: "Thank you for sending in your support.",
  successImpact:
    "Your support helps us run servers, power essential services, and keep RoomXchange free for everyone."
} as const;

const disclaimerText =
  "This is a free platform to support prospective tenants who feel stranded searching for accommodation...This does not seek to eradicate nor look down on the work of property agents. Thank you!";

function buildDonationUrl(baseUrl: string | null, provider: string | null, amount: number) {
  if (!baseUrl || !provider) {
    return null;
  }

  try {
    const url = new URL(baseUrl);
    if (amount > 0) {
      url.searchParams.set("amount", String(amount));
    }
    url.searchParams.set("method", provider);
    url.searchParams.set("source", "landing-page");
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function LandingPageContent() {
  const { isMobile, desktopTier } = useAdaptiveMode();
  const prefersReducedMotion = useReducedMotionSafe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const apiBaseUrl = roomXchangeConfig.apiUrl || process.env.NEXT_PUBLIC_ROOMXCHANGE_API_URL || "";
  const playStoreUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_PLAYSTORE_URL ?? "").trim() || null;
  const appStoreUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_APPSTORE_URL ?? "").trim() || null;
  const envSupportUrl = (process.env.NEXT_PUBLIC_ROOMXCHANGE_SUPPORT_URL ?? "").trim() || null;
  const donationSuccess = searchParams.get("donation") === "success";
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    messageNotificationsEnabled: true,
    listingMatchNotificationsEnabled: true,
    donationProvider: "Paystack",
    donationUrl: envSupportUrl,
    donationPresetAmounts: fallbackSupportAmounts,
    updatedAt: new Date().toISOString()
  });
  const [desktopSelectedAmount, setDesktopSelectedAmount] = useState(200);
  const [desktopCustomAmount, setDesktopCustomAmount] = useState("");
  const [mobileAmountDigits, setMobileAmountDigits] = useState("2000");
  const [mobileScreen, setMobileScreen] = useState<MobileScreenState>("landing");

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
        if (!desktopCustomAmount) {
          setDesktopSelectedAmount(normalizedPresetAmounts.includes(200) ? 200 : normalizedPresetAmounts[0] ?? 200);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [apiBaseUrl, desktopCustomAmount, envSupportUrl]);

  useEffect(() => {
    if (isMobile && donationSuccess) {
      setMobileScreen("success");
    }
  }, [donationSuccess, isMobile]);

  useBodyScrollLock(isMobile && mobileScreen !== "landing");

  const socialLinks = useMemo<SocialLink[]>(
    () => [
      { label: "Facebook", href: (process.env.NEXT_PUBLIC_ROOMXCHANGE_FACEBOOK_URL ?? "").trim() || null },
      { label: "Instagram", href: (process.env.NEXT_PUBLIC_ROOMXCHANGE_INSTAGRAM_URL ?? "").trim() || null },
      { label: "LinkedIn", href: (process.env.NEXT_PUBLIC_ROOMXCHANGE_LINKEDIN_URL ?? "").trim() || null },
      { label: "X", href: (process.env.NEXT_PUBLIC_ROOMXCHANGE_X_URL ?? "").trim() || null },
      { label: "TikTok", href: (process.env.NEXT_PUBLIC_ROOMXCHANGE_TIKTOK_URL ?? "").trim() || null }
    ],
    []
  );

  const supportAmounts = (Array.isArray(settings.donationPresetAmounts) ? settings.donationPresetAmounts : fallbackSupportAmounts).filter((amount) =>
    Number.isFinite(amount) && amount > 0
  );
  const normalizedSupportAmounts = supportAmounts.length ? supportAmounts : fallbackSupportAmounts;
  const donationProvider = settings.donationProvider?.trim() || null;
  const donationBaseUrl = settings.donationUrl?.trim() || envSupportUrl;
  const donationEnabled = true;
  const desktopNumericAmount = Number((desktopCustomAmount || String(desktopSelectedAmount)).replace(/[^\d]/g, "")) || 0;
  const mobileNumericAmount = Number(mobileAmountDigits.replace(/[^\d]/g, "")) || 0;
  const desktopDonateUrl = buildDonationUrl(donationBaseUrl, donationProvider, desktopNumericAmount);
  const mobileDonateUrl = buildDonationUrl(donationBaseUrl, donationProvider, mobileNumericAmount);

  const clearSuccessQuery = useCallback(() => {
    if (searchParams.get("donation") === "success") {
      router.replace(pathname as Route, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  const handleOpenMobileEntry = useCallback(() => {
    setMobileScreen("entry");
  }, []);

  const handleCloseMobileEntry = useCallback(() => {
    setMobileScreen("landing");
  }, []);

  const handleCloseMobileSuccess = useCallback(() => {
    clearSuccessQuery();
    setMobileScreen("landing");
  }, [clearSuccessQuery]);

  const handleDonateAgain = useCallback(() => {
    clearSuccessQuery();
    setMobileScreen("entry");
  }, [clearSuccessQuery]);

  const handleMobilePreset = useCallback((amount: number) => {
    setMobileAmountDigits(String(amount));
  }, []);

  const handleMobileDigit = useCallback((digit: string) => {
    setMobileAmountDigits((current) => {
      const next = current === "0" ? digit : `${current}${digit}`;
      return next.replace(/^0+(?=\d)/, "") || "0";
    });
  }, []);

  const handleMobileDelete = useCallback(() => {
    setMobileAmountDigits((current) => {
      const next = current.slice(0, -1);
      return next.length ? next : "0";
    });
  }, []);

  if (isMobile) {
    return (
      <LandingMobile
        appStoreUrl={appStoreUrl}
        copy={marketingCopy}
        disclaimerText={disclaimerText}
        donateUrl={mobileDonateUrl}
        donationEnabled={donationEnabled}
        mobileAmountDigits={mobileAmountDigits}
        mobileQuickAmounts={mobileQuickAmounts}
        onCloseEntry={handleCloseMobileEntry}
        onCloseSuccess={handleCloseMobileSuccess}
        onDeleteDigit={handleMobileDelete}
        onDonateAgain={handleDonateAgain}
        onOpenEntry={handleOpenMobileEntry}
        onPresetAmount={handleMobilePreset}
        onPressDigit={handleMobileDigit}
        playStoreUrl={playStoreUrl}
        prefersReducedMotion={prefersReducedMotion}
        screen={mobileScreen}
        socialLinks={socialLinks}
      />
    );
  }

  return (
    <LandingDesktop
      appStoreUrl={appStoreUrl}
      copy={marketingCopy}
      customAmount={desktopCustomAmount}
      desktopTier={desktopTier}
      disclaimerText={disclaimerText}
      donateUrl={desktopDonateUrl}
      donationEnabled={donationEnabled}
      donationSuccess={donationSuccess}
      onCustomAmountChange={setDesktopCustomAmount}
      onPresetAmount={(amount) => {
        setDesktopSelectedAmount(amount);
        setDesktopCustomAmount("");
      }}
      playStoreUrl={playStoreUrl}
      prefersReducedMotion={prefersReducedMotion}
      selectedAmount={desktopCustomAmount ? null : desktopSelectedAmount}
      socialLinks={socialLinks}
      supportAmounts={normalizedSupportAmounts}
    />
  );
}

export function LandingPageFallback() {
  return (
    <main className={styles.loadingShell}>
      <div className={styles.loadingPanel}>
        <div className={styles.loadingBadge} />
        <div className={styles.loadingHeadline} />
        <div className={styles.loadingCopy} />
      </div>
    </main>
  );
}

export function LandingPageController() {
  return (
    <Suspense fallback={<LandingPageFallback />}>
      <LandingPageContent />
    </Suspense>
  );
}

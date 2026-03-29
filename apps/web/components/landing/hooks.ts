"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

function subscribeViewport(onStoreChange: () => void) {
  window.addEventListener("resize", onStoreChange, { passive: true });
  return () => window.removeEventListener("resize", onStoreChange);
}

function getViewportSnapshot() {
  return window.innerWidth;
}

function getViewportServerSnapshot() {
  return 1280;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function useAdaptiveMode() {
  const width = useSyncExternalStore(subscribeViewport, getViewportSnapshot, getViewportServerSnapshot);
  const isMobile = width < 768;
  const desktopTier: "compact" | "medium" | "wide" = width < 1024 ? "compact" : width < 1280 ? "medium" : "wide";

  return { width, isMobile, desktopTier };
}

export function useReducedMotionSafe() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [locked]);
}

export function useDesktopMotion(disabled: boolean) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const revealNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const parallaxNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax-speed]"));

    if (disabled) {
      revealNodes.forEach((node) => node.setAttribute("data-visible", "true"));
      parallaxNodes.forEach((node) => node.style.setProperty("--landing-parallax-y", "0px"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-visible", "true");
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    revealNodes.forEach((node) => observer.observe(node));

    let frame = 0;

    const updateParallax = () => {
      frame = 0;
      const viewportCenter = window.innerHeight / 2;

      parallaxNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const nodeCenter = rect.top + rect.height / 2;
        const distanceFromCenter = nodeCenter - viewportCenter;
        const speed = Number(node.dataset.parallaxSpeed ?? 0);
        const offset = distanceFromCenter * speed * -0.12;
        node.style.setProperty("--landing-parallax-y", `${offset.toFixed(2)}px`);
      });
    };

    const requestUpdate = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(updateParallax);
      }
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    requestUpdate();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [disabled]);

  return rootRef;
}

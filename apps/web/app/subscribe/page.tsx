"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Globe, LockKeyhole, WalletCards } from "lucide-react";
import { AuthPanel } from "../../components/auth-panel";
import { useSession } from "../../components/session-provider";

export default function SubscribePage() {
  const { api, session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const subscriptionQuery = useQuery({
    queryKey: ["subscription-status", session?.user.userId],
    queryFn: () => api.getSubscriptionStatus(),
    enabled: Boolean(session)
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const result = await api.createCheckoutLink({
        successUrl: `${window.location.origin}/success`
      });
      window.location.href = result.authorizationUrl;
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Unable to start checkout.");
    }
  });

  return (
    <main className="shell" style={{ padding: "32px 0 80px", display: "grid", gap: 28 }}>
      <section className="card" style={{ padding: 28, display: "grid", gap: 18 }}>
        <div className="pill" style={{ width: "fit-content" }}>
          <Globe size={16} />
          Web checkout only
        </div>
        <h1 style={{ margin: 0, fontSize: "clamp(2.2rem, 5vw, 4rem)" }}>Subscribe once, then unlock owner contact details everywhere.</h1>
        <p className="muted" style={{ maxWidth: 760, margin: 0 }}>
          This page is the only payment path in the product. Mobile sends users here, Paystack completes the subscription,
          and the backend syncs access back to both apps.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 0.9fr", gap: 22 }}>
        <article className="card" style={{ padding: 28, display: "grid", gap: 18 }}>
          <div className="pill" style={{ width: "fit-content", background: "var(--rx-accent-soft)" }}>
            <WalletCards size={16} />
            Monthly access
          </div>
          <div>
            <h2 style={{ marginBottom: 6 }}>$50 / month</h2>
            <p className="muted" style={{ margin: 0 }}>
              One subscription unlocks phone reveal, dashboard management, and cross-device status sync.
            </p>
          </div>
          <div className="grid">
            {["Contact owners after web payment", "Manage listings on web and mobile", "Keep Apple-compliant mobile UX"].map((item) => (
              <div key={item} className="pill">
                <LockKeyhole size={14} />
                {item}
              </div>
            ))}
          </div>
          {session ? (
            <>
              <button className="button" onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending}>
                {checkoutMutation.isPending ? "Redirecting..." : "Continue to Paystack"}
                <ArrowRight size={16} />
              </button>
              {subscriptionQuery.data?.isSubscribed ? (
                <p className="muted" style={{ margin: 0 }}>
                  Your account already has active access until {subscriptionQuery.data.subscriptionExpiresAt ?? "the current billing end"}.
                </p>
              ) : null}
            </>
          ) : (
            <div className="empty-state">Sign in first to tie checkout to your RoomXchange account.</div>
          )}
          {error ? <p style={{ margin: 0, color: "var(--rx-danger)" }}>{error}</p> : null}
        </article>

        <AuthPanel title="Sign in before checkout" />
      </section>
    </main>
  );
}

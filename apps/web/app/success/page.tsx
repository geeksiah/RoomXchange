"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useSession } from "../../components/session-provider";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const { api, refreshProfile } = useSession();

  const verifyMutation = useMutation({
    mutationFn: async (paymentReference: string) => api.verifySubscription({ reference: paymentReference, source: "manual" }),
    onSuccess: async () => {
      await refreshProfile();
    }
  });

  useEffect(() => {
    if (reference && !verifyMutation.isPending && !verifyMutation.data) {
      verifyMutation.mutate(reference);
    }
  }, [reference, verifyMutation]);

  return (
    <main className="shell" style={{ padding: "48px 0 80px" }}>
      <section className="card" style={{ padding: 32, display: "grid", gap: 18, maxWidth: 760 }}>
        <div className="pill" style={{ width: "fit-content", background: "var(--rx-accent-soft)" }}>
          <CheckCircle2 size={16} />
          Subscription sync
        </div>
        <h1 style={{ margin: 0 }}>Finishing your RoomXchange access…</h1>
        <p className="muted" style={{ margin: 0 }}>
          We are verifying your Paystack payment and updating your mobile and web access.
        </p>
        <div className="empty-state">
          {verifyMutation.isPending && "Verifying payment reference with the backend..."}
          {verifyMutation.data && `Subscription active${verifyMutation.data.subscriptionExpiresAt ? ` until ${verifyMutation.data.subscriptionExpiresAt}` : "."}`}
          {verifyMutation.isError && "We could not verify this payment yet. Re-open the page in a moment or contact support."}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="button" href="/dashboard/subscription">
            Open subscription status
          </Link>
          <Link className="button secondary" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

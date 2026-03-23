"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession } from "../../../components/session-provider";

export default function SubscriptionPage() {
  const { api, session } = useSession();
  const statusQuery = useQuery({
    queryKey: ["subscription-status", session?.user.userId],
    queryFn: () => api.getSubscriptionStatus(),
    enabled: Boolean(session)
  });

  const checkoutMutation = useMutation({
    mutationFn: () => api.createCheckoutLink(),
    onSuccess: (result) => {
      window.location.href = result.authorizationUrl;
    }
  });

  return (
    <section className="grid">
      <article className="card" style={{ padding: 24, display: "grid", gap: 16 }}>
        <div className="pill" style={{ width: "fit-content" }}>
          {statusQuery.data?.isSubscribed ? "Access active" : "Access inactive"}
        </div>
        <h2 style={{ margin: 0 }}>Subscription status</h2>
        <p className="muted" style={{ margin: 0 }}>
          {statusQuery.data?.isSubscribed
            ? `Your owner-contact access is active${statusQuery.data.subscriptionExpiresAt ? ` until ${statusQuery.data.subscriptionExpiresAt}` : "."}`
            : "You need an active web subscription before owner phone numbers are revealed in the apps."}
        </p>
        <button className="button" onClick={() => checkoutMutation.mutate()}>
          {checkoutMutation.isPending ? "Redirecting..." : "Open Paystack checkout"}
        </button>
      </article>
    </section>
  );
}

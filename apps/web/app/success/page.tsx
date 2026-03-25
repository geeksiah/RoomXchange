import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
import { SuccessSyncContent } from "./success-content";

export const dynamic = "force-dynamic";

function SuccessFallback() {
  return (
    <main className="shell" style={{ padding: "48px 0 80px" }}>
      <section className="card" style={{ padding: 32, display: "grid", gap: 18, maxWidth: 760 }}>
        <div className="pill" style={{ width: "fit-content", background: "var(--rx-accent-soft)" }}>
          <CheckCircle2 size={16} />
          Subscription sync
        </div>
        <h1 style={{ margin: 0 }}>Finishing your RoomXchange access...</h1>
        <p className="muted" style={{ margin: 0 }}>
          Loading payment details...
        </p>
      </section>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessFallback />}>
      <SuccessSyncContent />
    </Suspense>
  );
}

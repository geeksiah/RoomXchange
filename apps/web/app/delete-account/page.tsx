import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account | RoomXchange",
  description: "Request deletion of your RoomXchange account and learn what data may be retained."
};

const lastUpdated = "March 31, 2026";
const deletionMailto =
  "mailto:support@roomxchange.com?subject=RoomXchange%20Account%20Deletion%20Request&body=Please%20delete%20my%20RoomXchange%20account.%0A%0ARegistered%20phone%20number%20or%20email:%20%0AFull%20name:%20%0AAdditional%20notes:%20";

const deletedItems = [
  "Account profile details, such as your display name, optional email address, profile photo, and public profile visibility settings.",
  "Saved alerts, reminder preferences, and registered push notification tokens connected to your account.",
  "Listings and other account-linked marketplace content that can be removed or deactivated as part of account closure."
];

const retainedItems = [
  "Payment, subscription, fraud-prevention, dispute-resolution, legal-compliance, and security records that we are required or permitted to retain.",
  "Limited backup or log data that may persist for a short period before routine deletion or rotation."
];

export default function DeleteAccountPage() {
  return (
    <main className="shell" style={{ padding: "48px 0 80px" }}>
      <section className="card" style={{ width: "min(100%, 920px)", margin: "0 auto", padding: 32, display: "grid", gap: 24 }}>
        <header style={{ display: "grid", gap: 14 }}>
          <span className="pill" style={{ width: "fit-content" }}>
            Account Deletion
          </span>
          <div style={{ display: "grid", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(2.2rem, 5vw, 3.6rem)", lineHeight: 0.98 }}>Delete your RoomXchange account</h1>
            <p className="muted" style={{ margin: 0 }}>
              Last updated {lastUpdated}
            </p>
          </div>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            You can request deletion of your RoomXchange account at any time. The fastest path is to use the link in the mobile app at{" "}
            <strong>Profile &gt; About app &gt; Open account deletion page</strong> or send your request through the button below.
          </p>
        </header>

        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.18rem" }}>How to request deletion</h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10, lineHeight: 1.65 }}>
            <li>Open the email request below.</li>
            <li>Include the phone number or email address connected to your RoomXchange account.</li>
            <li>Send the request from a reachable email address in case we need to verify ownership before processing deletion.</li>
          </ol>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.18rem" }}>Data we aim to delete or deactivate</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10, lineHeight: 1.65 }}>
            {deletedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: "1.18rem" }}>Data we may retain</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10, lineHeight: 1.65 }}>
            {retainedItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: "1.18rem" }}>Questions</h2>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            If you have questions about deletion, privacy, or data retention, contact{" "}
            <a href="mailto:support@roomxchange.com" style={{ color: "var(--rx-accent)", fontWeight: 700 }}>
              support@roomxchange.com
            </a>
            .
          </p>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a className="button" href={deletionMailto}>
            Email deletion request
          </a>
          <a className="button secondary" href="/privacy-policy">
            View privacy policy
          </a>
        </div>
      </section>
    </main>
  );
}

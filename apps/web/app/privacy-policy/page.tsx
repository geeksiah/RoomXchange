import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | RoomXchange",
  description: "How RoomXchange collects, uses, and protects personal information across its web and mobile products."
};

const lastUpdated = "March 31, 2026";

const sections = [
  {
    title: "Information we collect",
    items: [
      "Account and profile information such as your name, phone number, optional email address, profile photo, and sign-in details.",
      "Listing information you choose to publish, including title, description, price, amenities, photos, virtual-tour links, and the location details attached to a property.",
      "Communication and safety information such as messages, saved alerts or reminders, support requests, reports, and moderation records.",
      "Subscription and payment information needed to verify access, such as checkout email, payment reference, payment status, and subscription records. RoomXchange does not store your full payment card details.",
      "Device and app information needed to keep the service working, such as session state, app preferences, and push notification tokens when you enable notifications."
    ]
  },
  {
    title: "How we use information",
    items: [
      "To create and manage accounts, listings, messages, and subscriptions.",
      "To show listings, map views, map previews, and listing-related location details.",
      "To deliver reminders, push notifications, and service updates when those features are enabled.",
      "To process and verify web-only subscription payments and unlock eligible owner contact features.",
      "To investigate abuse, enforce platform rules, protect users, and comply with legal obligations."
    ]
  },
  {
    title: "Location and map services",
    items: [
      "RoomXchange uses location information that users provide for listings, searches, and property discovery.",
      "The mobile app does not rely on background device location collection for core use.",
      "When map or geocoding features are used, third-party map providers such as Google Maps and Mapbox may receive technical request data needed to render maps or return search results under their own privacy policies."
    ]
  },
  {
    title: "When we share information",
    items: [
      "Public listing content is shown to other users as part of the marketplace experience.",
      "Owner contact details are only shown or unlocked according to the product's subscription and access rules.",
      "We may share data with service providers that help us operate the platform, such as hosting, authentication, storage, map, notification, and payment providers.",
      "We may disclose information when required by law, to respond to legal process, or to protect the rights, safety, and security of RoomXchange and its users."
    ]
  },
  {
    title: "Data retention",
    items: [
      "We retain personal information for as long as needed to operate the service, maintain records, resolve disputes, prevent fraud, and meet legal or compliance obligations.",
      "When you request deletion, some information may remain in backups, logs, or transaction and safety records for a limited period where required."
    ]
  },
  {
    title: "How we protect information",
    items: [
      "We use reasonable administrative, technical, and organizational safeguards designed to protect personal information in transit and at rest.",
      "No method of transmission or storage is completely secure, so we cannot guarantee absolute security."
    ]
  },
  {
    title: "Your choices",
    items: [
      "You can update your profile details and listing content from the app or web dashboard.",
      "You can disable push notifications in your device settings at any time.",
      "You can use the RoomXchange account deletion page to request deletion or contact us directly with privacy-related questions."
    ]
  },
  {
    title: "Policy changes",
    items: ["We may update this Privacy Policy from time to time. When we do, we will post the updated version on this page and revise the last updated date."]
  }
] as const;

export default function PrivacyPolicyPage() {
  return (
    <main className="shell" style={{ padding: "48px 0 80px" }}>
      <section className="card" style={{ width: "min(100%, 920px)", margin: "0 auto", padding: 32, display: "grid", gap: 24 }}>
        <header style={{ display: "grid", gap: 14 }}>
          <span className="pill" style={{ width: "fit-content" }}>
            Privacy Policy
          </span>
          <div style={{ display: "grid", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(2.2rem, 5vw, 3.6rem)", lineHeight: 0.98 }}>RoomXchange Privacy Policy</h1>
            <p className="muted" style={{ margin: 0 }}>
              Last updated {lastUpdated}
            </p>
          </div>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            RoomXchange is a property marketplace available on web and mobile. This Privacy Policy explains what information we collect, how we
            use it, when we share it, and the choices you have when using RoomXchange.
          </p>
        </header>

        {sections.map((section) => (
          <section key={section.title} style={{ display: "grid", gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: "1.18rem" }}>{section.title}</h2>
            <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10, lineHeight: 1.65 }}>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: "1.18rem" }}>Contact us</h2>
          <p style={{ margin: 0, lineHeight: 1.7 }}>
            For privacy questions, account deletion requests, or support issues, contact{" "}
            <a href="mailto:support@roomxchange.com" style={{ color: "var(--rx-accent)", fontWeight: 700 }}>
              support@roomxchange.com
            </a>
            . You can also use the{" "}
            <a href="/delete-account" style={{ color: "var(--rx-accent)", fontWeight: 700 }}>
              account deletion page
            </a>{" "}
            to submit a deletion request.
          </p>
        </section>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a className="button" href="mailto:support@roomxchange.com">
            Contact support
          </a>
          <a className="button secondary" href="/">
            Back to home
          </a>
        </div>
      </section>
    </main>
  );
}

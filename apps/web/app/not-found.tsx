export default function NotFoundPage() {
  return (
    <main className="shell" style={{ padding: "48px 0 80px" }}>
      <section className="card" style={{ padding: 32, display: "grid", gap: 16, maxWidth: 720 }}>
        <span className="pill" style={{ width: "fit-content" }}>
          RoomXchange
        </span>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3.25rem)" }}>Page not found.</h1>
        <p className="muted" style={{ margin: 0 }}>
          The page you tried to open is unavailable.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a className="button" href="/">
            Go home
          </a>
          <a className="button secondary" href="/#downloads">
            Download app
          </a>
        </div>
      </section>
    </main>
  );
}

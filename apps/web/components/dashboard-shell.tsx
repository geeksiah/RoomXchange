"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { AuthPanel } from "./auth-panel";
import { useSession } from "./session-provider";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/listings", label: "Listings" },
  { href: "/dashboard/subscription", label: "Subscription" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/reports", label: "Reports" }
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useSession();

  if (!session) {
    return (
      <main className="shell" style={{ padding: "48px 0 80px" }}>
        <AuthPanel title="Unlock the RoomXchange dashboard" />
      </main>
    );
  }

  return (
    <main className="shell" style={{ padding: "24px 0 80px", display: "grid", gap: 24 }}>
      <header className="card" style={{ padding: 22, display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div className="pill" style={{ marginBottom: 12 }}>
            {session.user.isSubscribed ? "Subscription active" : "Web checkout required"}
          </div>
          <h1 style={{ margin: 0 }}>Welcome back, {session.user.name.split(" ")[0]}</h1>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="button secondary" href="/">
            Public site
          </Link>
          <button className="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <nav style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx("pill", pathname === item.href && "active")}
            style={{
              background: pathname === item.href ? "var(--rx-accent)" : "rgba(255,255,255,0.75)",
              color: pathname === item.href ? "white" : "var(--rx-text)"
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </main>
  );
}

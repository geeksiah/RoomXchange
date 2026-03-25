"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChartColumnIncreasing,
  CreditCard,
  Flag,
  LayoutGrid,
  LogOut,
  MessageSquareText,
  Search,
  Settings2,
  Shield,
  Users
} from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { AuthPanel } from "./auth-panel";
import { useSession } from "./session-provider";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navSections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "General",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
      { href: "/dashboard/admin/users", label: "Users", icon: Users },
      { href: "/dashboard/admin/listings", label: "Listings", icon: LayoutGrid },
      { href: "/dashboard/reports", label: "Reports", icon: Flag }
    ]
  },
  {
    label: "Control",
    items: [
      { href: "/dashboard/admin/conversations", label: "Conversations", icon: MessageSquareText },
      { href: "/dashboard/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/dashboard/admin/analytics", label: "Analytics", icon: ChartColumnIncreasing }
    ]
  }
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useSession();

  if (!session || session.user.role === "member") {
    return <AuthPanel />;
  }

  const firstName = session.user.name.split(" ")[0] ?? "Admin";

  return (
    <main className="admin-app">
      <aside className="admin-sidebar">
        <div style={{ display: "grid", gap: 24 }}>
          <div className="admin-brand">
            <div className="admin-brand-mark">
              <span className="admin-brand-icon">
                <Shield size={18} />
              </span>
              <span>roomxchange</span>
            </div>
            <span className="admin-tag" style={{ background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.08)", color: "white" }}>
              Admin
            </span>
          </div>

          {navSections.map((section) => (
            <div className="admin-side-section" key={section.label}>
              <div className="admin-side-label">{section.label}</div>
              <nav className="admin-nav">
                {section.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      className={clsx("admin-nav-link", isActivePath(pathname, item.href) && "active")}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="admin-sidebar-footer">
          <div className="admin-user-chip">
            <span className="admin-avatar">{getInitials(session.user.name)}</span>
            <div style={{ display: "grid", gap: 2 }}>
              <strong style={{ fontSize: "0.96rem" }}>{session.user.name}</strong>
              <span style={{ color: "rgba(255,255,255,0.58)", fontSize: "0.84rem" }}>{session.user.email ?? "admin@roomxchange.dev"}</span>
            </div>
          </div>

          <button
            className="admin-nav-link"
            onClick={logout}
            style={{ width: "100%", background: "transparent", border: "none", justifyContent: "flex-start" }}
            type="button"
          >
            <LogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <label className="admin-search" aria-label="Search dashboard">
            <Search size={18} color="var(--rx-text-muted)" />
            <input placeholder="Search users, listings, reports..." />
          </label>

          <div className="admin-toolbar">
            <button className="admin-icon-button" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="admin-icon-button" type="button" aria-label="Settings">
              <Settings2 size={18} />
            </button>
            <div className="admin-user-chip" style={{ background: "var(--rx-surface)", border: "1px solid var(--rx-border)", color: "var(--rx-text)" }}>
              <span className="admin-avatar" style={{ background: "var(--rx-accent-soft)", color: "var(--rx-accent)" }}>
                {getInitials(firstName)}
              </span>
              <div style={{ display: "grid", gap: 1 }}>
                <strong style={{ fontSize: "0.94rem" }}>{firstName}</strong>
                <span className="muted" style={{ fontSize: "0.82rem" }}>
                  {session.user.role.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-workspace">{children}</div>
      </section>
    </main>
  );
}

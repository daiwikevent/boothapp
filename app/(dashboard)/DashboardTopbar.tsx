"use client";

/**
 * app/(dashboard)/DashboardTopbar.tsx
 * Client-side top navigation bar for authenticated dashboard pages.
 * Shows: brand logo, nav links, credit badge (with threshold colors), user info, logout.
 *
 * Credit badge thresholds (doc 04 §3):
 *   < 6  → red   (danger)
 *   < 15 → amber (warn)
 *   ≥ 15 → default
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface Props {
  userName: string;
  userEmail: string;
  credits: number;
  plan: string;
  isAdmin?: boolean;
}

function creditBadgeClass(credits: number): string {
  if (credits < 6) return "credit-badge danger";
  if (credits < 15) return "credit-badge warn";
  return "credit-badge";
}

export default function DashboardTopbar({
  userName,
  credits,
  plan,
  isAdmin,
}: Props) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/dashboard", label: "Overview" },
    { href: "/events", label: "Events" },
    { href: "/presets", label: "Presets" },
    { href: "/reports", label: "Reports" },
    { href: "/account", label: "Account" },
  ];

  if (isAdmin) {
    navLinks.push({ href: "/admin", label: "Admin" });
  }

  // Determine if credit badge should pulse when low
  const creditsCritical = credits < 6;

  return (
    <header className="dash-topbar">
      <div className="dash-topbar-left">
        <Link href="/dashboard" className="dash-brand">
          BoothMagic
        </Link>
        <nav className="dash-nav">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${pathname === link.href ? " active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="dash-topbar-right">
        {/* Credit badge — thresholds: amber < 15, red < 6 */}
        <div
          id="credit-badge"
          className={creditBadgeClass(credits)}
          title={`${credits} credits · ${Math.floor(credits / 3)} photos remaining`}
          style={creditsCritical ? { animation: "pulse-badge 2s ease-in-out infinite" } : undefined}
        >
          <span aria-hidden="true">⚡</span>
          <span className="tabular-nums">{credits}</span>
          <span style={{ fontWeight: 400, opacity: 0.75 }}>credits</span>
        </div>

        <span className="dash-user">
          {userName}
          {plan !== "TRIAL" && (
            <span className="dash-plan-badge">
              {plan}
            </span>
          )}
        </span>

        <button
          id="signout-btn"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-logout"
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

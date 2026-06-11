/**
 * app/(dashboard)/dashboard/page.tsx
 * T04 — Dashboard overview page.
 *
 * Shows: greeting, credit balance card (with threshold logic), current plan,
 * Launch Booth CTA, quick-start guide, and a low-credit alert banner.
 *
 * Credit badge thresholds (doc 04 §3):
 *   < 6  → red / danger
 *   < 15 → amber / warn
 *   ≥ 15 → default
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getBalance } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview | BoothMagic",
  description: "Manage your AI photobooth events, presets, and credits.",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function creditColorVar(credits: number): string {
  if (credits < 6) return "var(--error)";
  if (credits < 15) return "var(--accent)";
  return "var(--success)";
}

function creditLabel(credits: number): string {
  if (credits < 6) return "Top up now to keep generating";
  if (credits < 15) return "Running low — consider a top-up";
  return `${Math.floor(credits / 3)} photos remaining`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const scopedSession: ScopedSession = { user: { id: session.user.id } };
  const credits = await getBalance(scopedSession);

  const greeting = getGreeting();
  const creditColor = creditColorVar(credits);
  const isLow = credits < 15;
  const isCritical = credits < 6;

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Low credit alert banner ──────────────────────── */}
      {isLow && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            padding: "var(--space-3) var(--space-6)",
            marginBottom: "var(--space-6)",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${isCritical ? "var(--error)" : "var(--accent)"}`,
            background: isCritical
              ? "rgba(248, 113, 113, 0.08)"
              : "rgba(255, 181, 71, 0.08)",
            color: isCritical ? "var(--error)" : "var(--accent)",
            fontSize: 14,
          }}
        >
          <span>
            {isCritical ? "🔴" : "🟡"}&nbsp;&nbsp;
            <strong>{credits} credits remaining</strong> —{" "}
            {isCritical
              ? "You have fewer than 6 credits. Purchase a pack to keep your booth running."
              : "Credits are running low. Top up before your next event."}
          </span>
          <Link
            href="/account#billing"
            className="btn btn-sm"
            style={{
              background: isCritical ? "var(--error)" : "var(--accent)",
              color: "#000",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Top up →
          </Link>
        </div>
      )}

      {/* ── Greeting ────────────────────────────────────── */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <h1
          style={{
            fontFamily: "var(--font-poppins), Poppins, sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "var(--space-2)",
          }}
        >
          {greeting},{" "}
          <span className="gradient-text">
            {session.user.name?.split(" ")[0] || "Operator"}
          </span>{" "}
          👋
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15 }}>
          Here&apos;s an overview of your BoothMagic account.
        </p>
      </div>

      {/* ── Stats grid ──────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        {/* Credit balance card */}
        <div
          className="card"
          style={{
            padding: "var(--space-6)",
            borderColor: isLow ? (isCritical ? "var(--error)" : "var(--accent)") : "var(--border)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "var(--space-2)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Credit Balance
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: creditColor,
              lineHeight: 1,
              marginBottom: "var(--space-2)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {credits}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {creditLabel(credits)}
          </div>
        </div>

        {/* Plan card */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "var(--space-2)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Current Plan
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--primary)",
              lineHeight: 1,
              marginBottom: "var(--space-2)",
              textTransform: "capitalize",
            }}
          >
            {(session.user.plan || "Trial").toLowerCase()}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {session.user.plan === "TRIAL"
              ? "9 free credits to explore BoothMagic"
              : "Active subscription — full access"}
          </div>
        </div>

        {/* Active event card */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "var(--space-2)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Active Event
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "var(--text-muted)",
              lineHeight: 1.4,
              marginBottom: "var(--space-2)",
            }}
          >
            None
          </div>
          <Link href="/events" style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none", fontWeight: 500 }}>
            Create your first event →
          </Link>
        </div>
      </div>

      {/* ── Launch Booth CTA ─────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: "var(--space-8)",
          marginBottom: "var(--space-8)",
          background: "linear-gradient(135deg, rgba(124, 92, 255, 0.1) 0%, rgba(196, 77, 255, 0.06) 100%)",
          borderColor: "rgba(124, 92, 255, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-6)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-poppins), Poppins, sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text)",
              marginBottom: "var(--space-2)",
            }}
          >
            Ready to capture memories?
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
            Set up an active event, then launch the AI photobooth on your tablet.
          </p>
        </div>
        <Link
          href="/booth"
          id="launch-booth-btn"
          className="btn btn-primary"
          style={{ fontSize: 15, padding: "12px 28px", flexShrink: 0 }}
        >
          🎬&nbsp; Launch Booth
        </Link>
      </div>

      {/* ── Quick start guide ────────────────────────────── */}
      <h2
        style={{
          fontFamily: "var(--font-poppins), Poppins, sans-serif",
          fontSize: 16,
          fontWeight: 600,
          color: "var(--text)",
          marginBottom: "var(--space-4)",
        }}
      >
        Getting Started
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {[
          {
            step: "01",
            title: "Create an Event",
            desc: "Each wedding or event gets its own gallery and QR link.",
            href: "/events",
            cta: "Go to Events",
          },
          {
            step: "02",
            title: "Choose Presets",
            desc: "Pick AI style presets (Royal Rajasthan, Bollywood Retro, etc.) for your event.",
            href: "/presets",
            cta: "Browse Presets",
          },
          {
            step: "03",
            title: "Launch the Booth",
            desc: "Open on a tablet in landscape mode. Guests self-serve and get QR codes instantly.",
            href: "/booth",
            cta: "Open Booth",
          },
        ].map((item) => (
          <div
            key={item.step}
            className="card"
            style={{ padding: "var(--space-6)" }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--primary)",
                letterSpacing: "0.1em",
                marginBottom: "var(--space-2)",
                textTransform: "uppercase",
              }}
            >
              Step {item.step}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "var(--space-2)",
              }}
            >
              {item.title}
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.6,
                marginBottom: "var(--space-4)",
              }}
            >
              {item.desc}
            </p>
            <Link
              href={item.href}
              style={{
                fontSize: 13,
                color: "var(--primary)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {item.cta} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

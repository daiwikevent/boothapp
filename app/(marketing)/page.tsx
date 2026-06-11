import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BoothMagic — AI Photobooth for Indian Events",
  description:
    "Studio-quality AI portraits at weddings, sangeets, and corporate events. Themed for India, billed in rupees. Start with 9 free credits.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: "rgba(124,92,255,0.12)", border: "1px solid rgba(124,92,255,0.3)", color: "var(--primary)" }}>
          ✨ India&apos;s AI Photobooth Platform
        </div>

        <h1 className="text-5xl font-bold leading-tight" style={{ fontFamily: "var(--font-poppins)" }}>
          <span className="gradient-text">Studio-Quality</span>
          <br />AI Portraits at Every Event
        </h1>

        <p className="text-lg" style={{ color: "var(--text-muted)", maxWidth: "520px", margin: "0 auto" }}>
          Royal Rajasthan, Bollywood Retro, Sangeet Glam & more — transform
          your guests into AI portraits in under 20 seconds. Billed in ₹.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/signup" className="btn btn-primary text-base px-8">
            Start Free — 9 credits ⚡
          </Link>
          <Link href="/pricing" className="btn btn-secondary text-base px-8">
            View Pricing
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-8 justify-center pt-8 border-t"
          style={{ borderColor: "var(--border)" }}>
          {[
            { label: "per photo cost", value: "₹3–4" },
            { label: "generation time", value: "<20s" },
            { label: "free trial credits", value: "9" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold tabular-nums gradient-text">{stat.value}</div>
              <div className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Nav hint */}
      <nav className="fixed top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-50"
        style={{ borderBottom: "1px solid var(--border)", background: "rgba(11,11,20,0.85)", backdropFilter: "blur(12px)" }}>
        <span className="font-bold text-lg gradient-text" style={{ fontFamily: "var(--font-poppins)" }}>
          BoothMagic
        </span>
        <div className="flex items-center gap-2">
          <Link href="/pricing" className="nav-link">Pricing</Link>
          <Link href="/login" className="nav-link">Login</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>
    </main>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    icon: "🤖",
    title: "Gemini AI Powered",
    desc: "Google's latest vision AI transforms any photo into a stunning themed portrait in under 20 seconds.",
  },
  {
    icon: "🎭",
    title: "15+ Indian Themes",
    desc: "Royal Rajasthan, Haldi Glow, Sangeet Glam, Bollywood Retro, South Indian Temple Classic & more.",
  },
  {
    icon: "📱",
    title: "No Hardware Needed",
    desc: "Just a smartphone or tablet. Guests walk up, snap, and receive their AI portrait in seconds.",
  },
  {
    icon: "🔗",
    title: "Instant QR Sharing",
    desc: "Every photo gets a unique short-link. Guests scan the QR code and download their portrait instantly.",
  },
  {
    icon: "📺",
    title: "Live Slideshow Screen",
    desc: "Display a live rotating gallery on any TV or screen at the venue. Guests love seeing their photos appear.",
  },
  {
    icon: "🏷️",
    title: "Custom Logo & Branding",
    desc: "Add your photography studio logo to every output photo. White-label experience for your clients.",
  },
  {
    icon: "☁️",
    title: "Google Drive Auto-Backup",
    desc: "All photos automatically sync to your Google Drive folder. Never lose a single guest memory.",
  },
  {
    icon: "📊",
    title: "Event Analytics & Reports",
    desc: "Track photos generated, credits used, and export CSV reports per event for your records.",
  },
  {
    icon: "🔒",
    title: "Attendant PIN Lock",
    desc: "Lock booth settings behind a 4-digit PIN. Guests can't accidentally change your configurations.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create Your Event",
    desc: "Log in, create a new event (e.g., \"Sharma Wedding\"), and pick your AI preset themes from 15+ curated Indian styles.",
    icon: "📅",
  },
  {
    step: "02",
    title: "Open the Booth",
    desc: "Open the booth screen on any device — tablet or laptop. Show it to your guests or set it up at a designated photo spot.",
    icon: "📷",
  },
  {
    step: "03",
    title: "Snap & Transform",
    desc: "Guest uploads their photo, selects a theme. AI transforms them into a stunning portrait in under 20 seconds.",
    icon: "✨",
  },
  {
    step: "04",
    title: "Share Instantly",
    desc: "The portrait appears on the live slideshow screen. Guest scans the QR code to download their photo. Everyone goes viral.",
    icon: "🎉",
  },
];

const TESTIMONIALS = [
  {
    name: "Ravi Sharma",
    role: "Wedding Photographer, Delhi",
    quote: "BoothMagic turned a regular mehandi into a 5-star experience. Guests were queueing up to get their Royal Rajasthan portraits. My clients loved it!",
    avatar: "RS",
    color: "#7C5CFF",
  },
  {
    name: "Priya Mehta",
    role: "Event Coordinator, Mumbai",
    quote: "We used it at a corporate Diwali event for 300 people. The Bollywood Retro theme was a massive hit. Setup took 10 minutes. Revenue? 10x the investment.",
    avatar: "PM",
    color: "#C44DFF",
  },
  {
    name: "Arjun Nair",
    role: "Freelance Photographer, Bangalore",
    quote: "No bulky DSLR booth, no expensive hardware. Just my iPad and BoothMagic. I've done 12 events this month alone. The ROI is incredible.",
    avatar: "AN",
    color: "#34D399",
  },
];

const PRESETS = [
  { name: "Royal Rajasthan", emoji: "👑", tag: "Wedding", color: "#FFB547" },
  { name: "Sangeet Glam", emoji: "✨", tag: "Wedding", color: "#C44DFF" },
  { name: "Haldi Glow", emoji: "💛", tag: "Wedding", color: "#FFB547" },
  { name: "Bollywood Retro", emoji: "🎬", tag: "Fun", color: "#F87171" },
  { name: "Cyber Neon Night", emoji: "🌃", tag: "Universal", color: "#7C5CFF" },
  { name: "Executive Headshot", emoji: "💼", tag: "Corporate", color: "#34D399" },
  { name: "South Indian Temple", emoji: "🛕", tag: "Wedding", color: "#FFB547" },
  { name: "Little Astronaut", emoji: "🚀", tag: "Kids", color: "#7C5CFF" },
  { name: "Monsoon Romance", emoji: "🌧️", tag: "Couple", color: "#60A5FA" },
];

const STATS = [
  { value: "15+", label: "AI Themes" },
  { value: "<20s", label: "Per Portrait" },
  { value: "₹3–4", label: "Per Photo" },
  { value: "9", label: "Free Credits" },
];

function HoverCard({ children, style, hoverStyle }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  hoverStyle?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      onMouseEnter={(e) => {
        if (hoverStyle) {
          Object.assign((e.currentTarget as HTMLElement).style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        // Reset to base style properties that might have been changed
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = (style as { borderColor?: string })?.borderColor || "";
        el.style.transform = "";
        el.style.boxShadow = "";
      }}
    >
      {children}
    </div>
  );
}

export default function HomeClient() {
  return (
    <>
      {/* ═══════════════════ STICKY NAV ═══════════════════ */}
      <nav
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          height: "64px",
          background: "rgba(11,11,20,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(124,92,255,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22, fontFamily: "var(--font-poppins), Poppins, sans-serif", fontWeight: 800 }}>
            <span className="gradient-text">Booth</span>
            <span style={{ color: "var(--text)" }}>Magic</span>
          </span>
          <span
            style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
              textTransform: "uppercase" as const, color: "var(--primary)",
              background: "rgba(124,92,255,0.15)",
              border: "1px solid rgba(124,92,255,0.3)",
              borderRadius: 4, padding: "2px 6px", marginLeft: 4,
            }}
          >
            AI
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Link href="#features" className="nav-link" style={{ fontSize: 14 }}>Features</Link>
          <Link href="#how-it-works" className="nav-link" style={{ fontSize: 14 }}>How It Works</Link>
          <Link href="/pricing" className="nav-link" style={{ fontSize: 14 }}>Pricing</Link>
          <Link href="/login" className="nav-link" style={{ fontSize: 14 }}>Login</Link>
          <Link href="/signup" className="btn btn-primary btn-sm" style={{ marginLeft: 8 }}>
            Start Free ⚡
          </Link>
        </div>
      </nav>

      <main style={{ background: "var(--bg)", overflowX: "hidden" }}>

        {/* ═══════ A — ATTENTION: HERO ═══════ */}
        <section
          id="hero"
          style={{
            minHeight: "100vh",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "120px 24px 80px",
            textAlign: "center",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Background orbs */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
            <div style={{
              position: "absolute", top: "10%", left: "15%",
              width: 600, height: 600,
              background: "radial-gradient(circle, rgba(124,92,255,0.12) 0%, transparent 70%)",
              borderRadius: "50%", filter: "blur(40px)",
            }} />
            <div style={{
              position: "absolute", bottom: "5%", right: "10%",
              width: 500, height: 500,
              background: "radial-gradient(circle, rgba(196,77,255,0.1) 0%, transparent 70%)",
              borderRadius: "50%", filter: "blur(40px)",
            }} />
          </div>

          <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto" }}>
            {/* Badge */}
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 18px", borderRadius: 999,
                background: "rgba(124,92,255,0.1)",
                border: "1px solid rgba(124,92,255,0.3)",
                color: "var(--primary)", fontSize: 13, fontWeight: 600,
                marginBottom: 32, letterSpacing: "0.01em",
              }}
            >
              <span>✨</span>
              <span>India&apos;s #1 AI Photobooth Platform</span>
              <span
                style={{
                  background: "var(--gradient-primary)", color: "#fff",
                  fontSize: 10, fontWeight: 700, padding: "2px 8px",
                  borderRadius: 999, letterSpacing: "0.06em",
                }}
              >NEW</span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                fontFamily: "var(--font-poppins), Poppins, sans-serif",
                fontWeight: 800, lineHeight: 1.1,
                marginBottom: 24, letterSpacing: "-0.02em",
              }}
            >
              Turn Every Guest Into a{" "}
              <span className="gradient-text">Bollywood Star</span>
              <br />in Under 20 Seconds
            </h1>

            {/* Subheadline */}
            <p style={{
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              color: "var(--text-muted)", maxWidth: 620, margin: "0 auto 40px",
              lineHeight: 1.7,
            }}>
              BoothMagic is the AI photobooth built for Indian events. Royal Rajasthan, Sangeet Glam,
              Haldi Glow & 12 more themes — no hardware, no setup. Just open on any device and wow your guests.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
              <Link
                href="/signup"
                className="btn btn-primary"
                style={{ fontSize: 16, padding: "14px 32px", borderRadius: 12 }}
              >
                🚀 Start Free — 9 Credits Included
              </Link>
              <Link
                href="/pricing"
                className="btn btn-secondary"
                style={{ fontSize: 16, padding: "14px 32px", borderRadius: 12 }}
              >
                View Pricing Plans
              </Link>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex", gap: 0, justifyContent: "center", flexWrap: "wrap",
                padding: "28px 0",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    padding: "0 40px", textAlign: "center",
                    borderRight: i < STATS.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div
                    className="gradient-text"
                    style={{
                      fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                      fontWeight: 800, fontFamily: "var(--font-poppins), Poppins, sans-serif",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Trust line */}
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 24 }}>
              ✅ No credit card required &nbsp;·&nbsp; 🇮🇳 Billed in ₹ &nbsp;·&nbsp; ⚡ Ready in 60 seconds
            </p>
          </div>
        </section>

        {/* ═══════ HERO BEFORE/AFTER IMAGE ═══════ */}
        <section style={{ padding: "0 24px 100px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              position: "relative", maxWidth: 900, width: "100%",
              borderRadius: 24, overflow: "hidden",
              border: "1px solid rgba(124,92,255,0.2)",
              boxShadow: "0 32px 80px rgba(124,92,255,0.2), 0 0 0 1px rgba(124,92,255,0.1)",
            }}
          >
            <Image
              src="/hero-transformation.png"
              alt="AI Photobooth Before and After Transformation"
              width={900}
              height={600}
              style={{ width: "100%", height: "auto", display: "block" }}
              priority
            />
            <div
              style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "32px 32px 28px",
                background: "linear-gradient(to top, rgba(11,11,20,0.95) 0%, transparent 100%)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 16,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
                  Real transformation from our AI
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  Same guests, same phone camera → Royal Rajasthan palace portrait
                </div>
              </div>
              <div
                style={{
                  background: "rgba(124,92,255,0.15)", border: "1px solid rgba(124,92,255,0.3)",
                  borderRadius: 8, padding: "8px 16px", fontSize: 13, color: "var(--primary)", fontWeight: 600,
                }}
              >
                ⚡ Generated in 18 seconds
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ I — INTEREST: PRESETS SHOWCASE ═══════ */}
        <section id="presets" style={{ padding: "80px 24px", background: "var(--surface)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "6px 16px", borderRadius: 999,
                  background: "rgba(196,77,255,0.1)", border: "1px solid rgba(196,77,255,0.25)",
                  color: "#C44DFF", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 20,
                }}
              >
                🎭 AI Themes
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  fontFamily: "var(--font-poppins), Poppins, sans-serif",
                  fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em",
                }}
              >
                15+ Stunning Indian & Universal Presets
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
                From royal weddings to corporate headshots — every event deserves the perfect theme.
                Choose from our curated library or create your own.
              </p>
            </div>

            {/* Presets grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 16, marginBottom: 48,
              }}
            >
              {PRESETS.map((preset) => (
                <div
                  key={preset.name}
                  className="preset-hover-card"
                  style={{
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 16, padding: "20px 16px",
                    transition: "all 0.25s ease", cursor: "default",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 10, textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 36, lineHeight: 1 }}>{preset.emoji}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{preset.name}</div>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
                      letterSpacing: "0.06em", padding: "3px 10px", borderRadius: 999,
                      background: `${preset.color}18`, color: preset.color,
                      border: `1px solid ${preset.color}30`,
                    }}
                  >
                    {preset.tag}
                  </span>
                </div>
              ))}
              <div
                style={{
                  background: "var(--gradient-primary)", borderRadius: 16, padding: "20px 16px",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 10, textAlign: "center", cursor: "default",
                }}
              >
                <div style={{ fontSize: 36, lineHeight: 1 }}>➕</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", lineHeight: 1.3 }}>Create Custom</div>
                <span
                  style={{
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
                    letterSpacing: "0.06em", padding: "3px 10px", borderRadius: 999,
                    background: "rgba(255,255,255,0.2)", color: "#fff",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                >PRO+</span>
              </div>
            </div>

            {/* Presets showcase image */}
            <div
              style={{
                borderRadius: 24, overflow: "hidden",
                border: "1px solid rgba(124,92,255,0.15)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
            >
              <Image
                src="/presets-grid.png"
                alt="BoothMagic Photobooth AI Theme Showcase"
                width={1100}
                height={700}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          </div>
        </section>

        {/* ═══════ I — INTEREST: FEATURES ═══════ */}
        <section id="features" style={{ padding: "100px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "6px 16px", borderRadius: 999,
                  background: "rgba(124,92,255,0.1)", border: "1px solid rgba(124,92,255,0.25)",
                  color: "var(--primary)", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 20,
                }}
              >
                ⚡ Everything You Need
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  fontFamily: "var(--font-poppins), Poppins, sans-serif",
                  fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em",
                }}
              >
                One Platform,{" "}
                <span className="gradient-text">Infinite Events</span>
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
                Everything a professional event photographer needs — packed into one clean, fast, AI-powered booth.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="feature-hover-card"
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 18, padding: "28px 24px",
                    transition: "all 0.25s ease", position: "relative", overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: "var(--surface-2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24, marginBottom: 16,
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-poppins), Poppins, sans-serif",
                      fontWeight: 700, fontSize: 17, marginBottom: 8,
                    }}
                  >
                    {f.title}
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
                    {f.desc}
                  </p>
                  <div
                    style={{
                      position: "absolute", bottom: 16, right: 20,
                      fontSize: 48, fontWeight: 900, opacity: 0.04,
                      color: "var(--primary)", fontFamily: "var(--font-poppins), Poppins, sans-serif",
                      pointerEvents: "none", userSelect: "none" as const,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ I — DASHBOARD PREVIEW ═══════ */}
        <section style={{ padding: "80px 24px 100px", background: "var(--surface)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ textAlign: "center", marginBottom: 56, maxWidth: 640 }}>
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "6px 16px", borderRadius: 999,
                  background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
                  color: "#34D399", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 20,
                }}
              >
                🖥️ Operator Dashboard
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  fontFamily: "var(--font-poppins), Poppins, sans-serif",
                  fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em",
                }}
              >
                Manage Everything From One Place
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 16 }}>
                Create events, select presets, monitor live photo generation, and download reports.
                Your entire photobooth business in a single clean dashboard.
              </p>
            </div>

            <div
              style={{
                width: "100%", maxWidth: 960, borderRadius: 24, overflow: "hidden",
                border: "1px solid rgba(124,92,255,0.2)",
                boxShadow: "0 40px 100px rgba(124,92,255,0.2), 0 0 0 1px rgba(124,92,255,0.08)",
              }}
            >
              <Image
                src="/dashboard-mockup.png"
                alt="BoothMagic Operator Dashboard"
                width={960}
                height={640}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>

            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center", marginTop: 48 }}>
              {[
                "Multi-event management",
                "Live photo gallery",
                "Slideshow screen casting",
                "Credit usage tracking",
                "QR code per photo",
                "Google Drive sync",
              ].map((item) => (
                <div
                  key={item}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}
                >
                  <span style={{ color: "var(--success)", fontSize: 16 }}>✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ D — DESIRE: HOW IT WORKS ═══════ */}
        <section id="how-it-works" style={{ padding: "100px 24px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "6px 16px", borderRadius: 999,
                  background: "rgba(255,181,71,0.1)", border: "1px solid rgba(255,181,71,0.25)",
                  color: "var(--accent)", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 20,
                }}
              >
                🚀 Quick Start
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  fontFamily: "var(--font-poppins), Poppins, sans-serif",
                  fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em",
                }}
              >
                Up & Running in{" "}
                <span className="gradient-text">Under 2 Minutes</span>
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
                No technical setup. No hardware purchase. Just sign up and you&apos;re live.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>
              {HOW_IT_WORKS.map((step, i) => (
                <div
                  key={step.step}
                  className="hiw-hover-card"
                  style={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 20, padding: "32px 24px",
                    textAlign: "center", transition: "all 0.25s ease",
                  }}
                >
                  <div
                    style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: "var(--gradient-primary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24, margin: "0 auto 16px",
                      boxShadow: "0 8px 24px rgba(124,92,255,0.3)",
                    }}
                  >
                    {step.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 11, fontWeight: 800, color: "var(--primary)",
                      letterSpacing: "0.12em", marginBottom: 10,
                    }}
                  >
                    STEP {step.step}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-poppins), Poppins, sans-serif",
                      fontWeight: 700, fontSize: 16, marginBottom: 10,
                    }}
                  >
                    {step.title}
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ D — DESIRE: TESTIMONIALS ═══════ */}
        <section style={{ padding: "100px 24px", background: "var(--surface)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "6px 16px", borderRadius: 999,
                  background: "rgba(124,92,255,0.1)", border: "1px solid rgba(124,92,255,0.25)",
                  color: "var(--primary)", fontSize: 12, fontWeight: 700,
                  textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 20,
                }}
              >
                💬 Real Stories
              </div>
              <h2
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  fontFamily: "var(--font-poppins), Poppins, sans-serif",
                  fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em",
                }}
              >
                Photographers Love BoothMagic
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
                Hundreds of event photographers across India are running profitable photobooth businesses with zero hardware.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  style={{
                    background: "var(--bg)", border: "1px solid var(--border)",
                    borderRadius: 20, padding: "32px 28px",
                    transition: "all 0.25s ease",
                  }}
                >
                  <div style={{ display: "flex", gap: 3, marginBottom: 20 }}>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} style={{ color: "#FFB547", fontSize: 16 }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.75, color: "var(--text)", marginBottom: 28, fontStyle: "italic" }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${t.color} 0%, ${t.color}88 100%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0,
                      }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ D — DESIRE: PRICING TEASER ═══════ */}
        <section style={{ padding: "100px 24px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 16px", borderRadius: 999,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
                color: "#34D399", fontSize: 12, fontWeight: 700,
                textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 20,
              }}
            >
              💰 Simple Pricing
            </div>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                fontFamily: "var(--font-poppins), Poppins, sans-serif",
                fontWeight: 800, marginBottom: 16, letterSpacing: "-0.02em",
              }}
            >
              Transparent Pricing in ₹
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 16, maxWidth: 520, margin: "0 auto 48px" }}>
              Pay only for what you use. No annual contracts. Scale up for big events and down in off-season.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 48 }}>
              {[
                { plan: "Trial", price: "Free", credits: "9 credits", highlight: false, tag: "" },
                { plan: "Starter", price: "₹799", credits: "54 credits/month", highlight: false, tag: "~18 photos" },
                { plan: "Pro", price: "₹1,599", credits: "120 credits/month", highlight: true, tag: "~40 photos" },
                { plan: "Business", price: "₹2,999", credits: "240 credits/month", highlight: false, tag: "~80 photos" },
              ].map((p) => (
                <div
                  key={p.plan}
                  style={{
                    background: p.highlight ? "var(--gradient-primary)" : "var(--surface)",
                    border: p.highlight ? "none" : "1px solid var(--border)",
                    borderRadius: 18, padding: "28px 20px", textAlign: "center",
                    boxShadow: p.highlight ? "0 16px 48px rgba(124,92,255,0.35)" : "none",
                    transform: p.highlight ? "scale(1.04)" : "none",
                    transition: "all 0.25s ease",
                  }}
                >
                  {p.highlight && (
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "rgba(255,255,255,0.8)", marginBottom: 12 }}>
                      ⭐ Most Popular
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 4, color: p.highlight ? "#fff" : "var(--text)" }}>
                    {p.plan}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "var(--font-poppins), Poppins, sans-serif", marginBottom: 4, color: p.highlight ? "#fff" : "var(--text)" }}>
                    {p.price}
                  </div>
                  {p.tag && (
                    <div style={{ fontSize: 12, color: p.highlight ? "rgba(255,255,255,0.7)" : "var(--text-muted)", marginBottom: 8 }}>
                      {p.tag}
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 600, color: p.highlight ? "rgba(255,255,255,0.85)" : "var(--text-muted)" }}>
                    {p.credits}
                  </div>
                </div>
              ))}
            </div>

            <Link href="/pricing" className="btn btn-secondary" style={{ fontSize: 15, padding: "12px 28px" }}>
              See Full Feature Comparison →
            </Link>
          </div>
        </section>

        {/* ═══════ A — ACTION: FINAL CTA ═══════ */}
        <section style={{ padding: "100px 24px", position: "relative", overflow: "hidden", background: "var(--surface)" }}>
          <div
            style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 700, height: 400,
              background: "radial-gradient(ellipse, rgba(124,92,255,0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 56, marginBottom: 24 }}>🎉</div>
            <h2
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                fontFamily: "var(--font-poppins), Poppins, sans-serif",
                fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em", lineHeight: 1.1,
              }}
            >
              Your First Event is on{" "}
              <span className="gradient-text">Us</span>
            </h2>
            <p style={{ fontSize: 18, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.7 }}>
              Sign up for free and get{" "}
              <strong style={{ color: "var(--text)" }}>9 credits instantly</strong> — enough to
              generate 3 complete AI portraits. No credit card. No commitment.
            </p>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 48 }}>
              After that, plans start at just{" "}
              <strong style={{ color: "var(--accent)" }}>₹799/month</strong> — less than a single client dinner.
            </p>

            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/signup"
                className="btn btn-primary"
                style={{
                  fontSize: 18, padding: "16px 40px", borderRadius: 14,
                  boxShadow: "0 8px 32px rgba(124,92,255,0.4)",
                }}
              >
                🚀 Get Started Free
              </Link>
              <Link
                href="/pricing"
                className="btn btn-secondary"
                style={{ fontSize: 18, padding: "16px 32px", borderRadius: 14 }}
              >
                View All Plans
              </Link>
            </div>

            {/* Social proof avatars */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 40 }}>
              <div style={{ display: "flex" }}>
                {["RS", "PM", "AN", "KV"].map((initials, i) => (
                  <div
                    key={initials}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: `hsl(${i * 70 + 260}, 70%, 55%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, color: "#fff",
                      border: "2px solid var(--surface)",
                      marginLeft: i === 0 ? 0 : -10,
                    }}
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Join <strong style={{ color: "var(--text)" }}>200+ photographers</strong> already using BoothMagic
              </p>
            </div>
          </div>
        </section>

        {/* ═══════ FOOTER ═══════ */}
        <footer
          style={{
            padding: "48px 32px",
            borderTop: "1px solid var(--border)",
            display: "flex", flexWrap: "wrap",
            alignItems: "center", justifyContent: "space-between", gap: 20,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "var(--font-poppins), Poppins, sans-serif", marginBottom: 4 }}>
              <span className="gradient-text">BoothMagic</span>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              AI Photobooth for Indian Events &nbsp;·&nbsp; Made with ❤️ in India
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Link href="/pricing" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>Pricing</Link>
            <Link href="/login" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>Login</Link>
            <Link href="/signup" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>Sign Up</Link>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            © 2025 BoothMagic. All rights reserved.
          </div>
        </footer>
      </main>

      {/* CSS for pure CSS hover effects (no JS event handlers needed) */}
      <style>{`
        .preset-hover-card:hover {
          border-color: rgba(124,92,255,0.4) !important;
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 32px rgba(124,92,255,0.15) !important;
        }
        .feature-hover-card:hover {
          border-color: rgba(124,92,255,0.35) !important;
          transform: translateY(-4px) !important;
          box-shadow: 0 16px 40px rgba(124,92,255,0.1) !important;
        }
        .hiw-hover-card:hover {
          border-color: rgba(124,92,255,0.4) !important;
          box-shadow: 0 12px 32px rgba(124,92,255,0.15) !important;
        }
      `}</style>
    </>
  );
}

"use client";

/**
 * app/s/[eventSlug]/page.tsx
 * T18 — Public Slideshow Page /s/[slug]
 *
 * Auto-rotating fullscreen cinematic display of latest AI photos for venue screens.
 * Features:
 * - Fullscreen dark backdrop — no browser chrome (designed for TV/projector display)
 * - Ken Burns zoom + crossfade transition between photos
 * - Auto-polls for new photos every 30 seconds
 * - Keyboard/click to pause / advance manually
 * - "BoothMagic" branding + event name overlay
 * - "Powered by BoothMagic" QR code corner for guests to scan
 * - Empty state with graceful placeholder
 */

import { useEffect, useState, useRef, useCallback } from "react";

interface SlideshowPhoto {
  id: string;
  url: string;
  createdAt: string;
}

interface SlideshowData {
  event: { name: string; slug: string };
  photos: SlideshowPhoto[];
}

// How long each slide stays on screen (ms)
const SLIDE_DURATION = 6000;
// How often to poll server for new photos (ms)
const POLL_INTERVAL = 30_000;

export default function SlideshowPage({ params }: { params: { eventSlug: string } }) {
  const { eventSlug } = params;

  const [data, setData] = useState<SlideshowData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showUI, setShowUI] = useState(true);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosRef = useRef<SlideshowPhoto[]>([]);

  // Fetch / poll data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/slideshow/${eventSlug}`);
      if (!res.ok) {
        if (res.status === 404) setError("Event not found");
        return;
      }
      const json: SlideshowData = await res.json();
      setData(json);
      // Append new photos we don't already have
      const existing = new Set(photosRef.current.map((p) => p.id));
      const newPhotos = json.photos.filter((p) => !existing.has(p.id));
      if (newPhotos.length > 0 || photosRef.current.length === 0) {
        photosRef.current = json.photos;
      }
    } catch {
      // silent — don't disrupt slideshow on network blip
    }
  }, [eventSlug]);

  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(poll);
  }, [fetchData]);

  // Auto-advance timer
  const advance = useCallback(() => {
    if (!data?.photos.length) return;
    setCurrent((c) => (c + 1) % data.photos.length);
  }, [data]);

  useEffect(() => {
    if (paused || !data?.photos.length) return;
    timerRef.current = setTimeout(advance, SLIDE_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, advance, data]);

  // Auto-hide UI after 3s of no interaction
  const resetUiTimer = useCallback(() => {
    setShowUI(true);
    if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    uiTimerRef.current = setTimeout(() => setShowUI(false), 3000);
  }, []);

  useEffect(() => {
    resetUiTimer();
    return () => { if (uiTimerRef.current) clearTimeout(uiTimerRef.current); };
  }, [resetUiTimer]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      resetUiTimer();
      if (e.key === " " || e.key === "p") setPaused((p) => !p);
      if (e.key === "ArrowRight" && data?.photos.length) setCurrent((c) => (c + 1) % data.photos.length);
      if (e.key === "ArrowLeft" && data?.photos.length) setCurrent((c) => (c - 1 + data.photos.length) % data.photos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, resetUiTimer]);

  const photos = data?.photos ?? [];
  const eventName = data?.event.name ?? eventSlug;

  // ── Empty / error states ──────────────────────────────────────────────
  if (error) {
    return (
      <div style={styles.screen}>
        <div style={styles.emptyCard}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎪</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)" }}>Event not found</div>
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>Check the URL and try again.</div>
        </div>
      </div>
    );
  }

  if (data && photos.length === 0) {
    return (
      <div style={styles.screen}>
        <div style={styles.emptyCard}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>📸</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{eventName}</div>
          <div style={{ fontSize: 16, color: "var(--text-muted)" }}>Photos will appear here as guests capture them</div>
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={styles.dot} />
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Waiting for first photo…</span>
          </div>
        </div>
        <div style={styles.brandingBottom}>
          <span style={{ color: "var(--primary)", fontWeight: 700 }}>BoothMagic</span>
          <span style={{ color: "var(--text-muted)" }}> · AI Photo Experience</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.screen}>
        <div style={{ color: "var(--text-muted)", fontSize: 16 }}>Loading slideshow…</div>
      </div>
    );
  }

  // ── Main slideshow ────────────────────────────────────────────────────
  return (
    <div
      style={styles.screen}
      onMouseMove={resetUiTimer}
      onClick={() => { resetUiTimer(); setPaused((p) => !p); }}
      onTouchStart={resetUiTimer}
    >
      {/* Slides */}
      {photos.map((photo, idx) => {
        const isActive = idx === current;
        const isPrev = idx === (current - 1 + photos.length) % photos.length;
        return (
          <div
            key={photo.id}
            style={{
              ...styles.slide,
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 2 : isPrev ? 1 : 0,
              transition: isActive
                ? "opacity 1.2s ease-in-out"
                : isPrev
                ? "opacity 1.2s ease-in-out 0.2s"
                : "none",
            }}
          >
            {/* Ken Burns image */}
            <div
              style={{
                ...styles.kbWrapper,
                animation: isActive && !paused ? "kenBurns 7s ease-in-out forwards" : "none",
              }}
            >
              {/* Preload the image */}
              <img
                src={photo.url}
                alt=""
                style={styles.slideImg}
                loading={Math.abs(idx - current) <= 2 ? "eager" : "lazy"}
              />
            </div>

            {/* Gradient overlays */}
            <div style={styles.gradientTop} />
            <div style={styles.gradientBottom} />
          </div>
        );
      })}

      {/* Top bar: branding + event name */}
      <div
        style={{
          ...styles.topBar,
          opacity: showUI ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        <div style={styles.brandBadge}>
          <span style={{ color: "var(--primary)", fontWeight: 800, fontSize: 15 }}>BoothMagic</span>
        </div>
        <div style={styles.eventTitle}>{eventName}</div>
      </div>

      {/* Bottom bar: slide counter + pause indicator */}
      <div
        style={{
          ...styles.bottomBar,
          opacity: showUI ? 1 : 0,
          transition: "opacity 0.5s ease",
        }}
      >
        {/* Dot indicators */}
        <div style={styles.dotRow}>
          {photos.slice(0, Math.min(photos.length, 12)).map((_, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); resetUiTimer(); }}
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === current ? "var(--primary)" : "rgba(255,255,255,0.3)",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
            />
          ))}
          {photos.length > 12 && (
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginLeft: 4 }}>
              +{photos.length - 12}
            </span>
          )}
        </div>

        {/* Photo count + pause indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
            {current + 1} / {photos.length}
          </span>
          {paused && (
            <span
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                color: "var(--primary)", background: "rgba(124, 92, 255, 0.15)",
                padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(124,92,255,0.3)",
              }}
            >
              ⏸ PAUSED
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!paused && (
        <div style={styles.progressTrack}>
          <div
            key={`${current}-progress`}
            style={{
              ...styles.progressBar,
              animation: `progress ${SLIDE_DURATION}ms linear forwards`,
            }}
          />
        </div>
      )}

      {/* Keyframe styles */}
      <style>{`
        @keyframes kenBurns {
          0%   { transform: scale(1.0) translate(0%, 0%); }
          25%  { transform: scale(1.06) translate(-1%, -0.5%); }
          75%  { transform: scale(1.08) translate(1%, 0.5%); }
          100% { transform: scale(1.1) translate(0%, 0%); }
        }
        @keyframes progress {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        body { overflow: hidden !important; }
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  screen: {
    position: "fixed",
    inset: 0,
    background: "#050508",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    userSelect: "none",
    cursor: "none",
    fontFamily: "var(--font-inter), Inter, sans-serif",
  },
  slide: {
    position: "absolute",
    inset: 0,
  },
  kbWrapper: {
    position: "absolute",
    inset: "-5%",
    transformOrigin: "center center",
  },
  slideImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  gradientTop: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: "25%",
    background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
    zIndex: 3,
  },
  gradientBottom: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: "35%",
    background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
    zIndex: 3,
  },
  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    padding: "24px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    pointerEvents: "none",
  },
  brandBadge: {
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(124,92,255,0.25)",
    borderRadius: 999,
    padding: "6px 16px",
    fontSize: 14,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "rgba(255,255,255,0.9)",
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(12px)",
    padding: "6px 20px",
    borderRadius: 999,
    maxWidth: "60%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    padding: "20px 32px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
    pointerEvents: "auto",
  },
  dotRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  progressTrack: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: 3,
    background: "rgba(255,255,255,0.1)",
    zIndex: 20,
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, var(--primary), var(--primary-2))",
    borderRadius: "0 2px 2px 0",
  },
  emptyCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "48px 40px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    maxWidth: 440,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    background: "var(--primary)",
    animation: "pulse 2s ease-in-out infinite",
  },
  brandingBottom: {
    position: "absolute",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 13,
    color: "var(--text-muted)",
  },
};

/**
 * app/g/[code]/page.tsx
 * T12 — Guest download page
 *
 * Public mobile page:
 * - Fetches photo by short code server-side
 * - Generates a short-lived JWT token for the file
 * - Shows Download + WhatsApp share buttons
 * - "Available for 3 days" note
 * - Graceful expired state
 */

import { getPhotoByShortCode } from "@/lib/db-scoped";

import type { Metadata } from "next";
import * as jose from "jose";
import Link from "next/link";

const FILE_TOKEN_SECRET = process.env.FILE_TOKEN_SECRET ?? "dev-file-token-secret";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type Props = { params: { code: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const photo = await getPhotoByShortCode(params.code);
  if (!photo) return { title: "Photo Not Found | BoothMagic" };
  return {
    title: "Your AI Photo | BoothMagic",
    description: "Download your AI-transformed photo from BoothMagic.",
    openGraph: { title: "Your AI Photobooth Portrait", description: "Created with BoothMagic AI" },
  };
}

async function generateFileToken(shortCode: string): Promise<string> {
  const secret = new TextEncoder().encode(FILE_TOKEN_SECRET);
  return new jose.SignJWT({ shortCode })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export default async function GuestDownloadPage({ params }: Props) {
  const photo = await getPhotoByShortCode(params.code);

  // Expired or invalid
  if (!photo || photo.status !== "DONE") {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "var(--space-8)", textAlign: "center", gap: "var(--space-6)",
      }}>
        <div style={{ fontSize: 64 }}>⏳</div>
        <h1 style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)" }}>
          Photo Not Available
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 340, lineHeight: 1.6 }}>
          This photo link has expired or doesn&apos;t exist. Photos are available for 3 days after they&apos;re taken.
        </p>
        <Link href="/" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 500, fontSize: 14 }}>
          Learn about BoothMagic →
        </Link>
      </div>
    );
  }

  // Generate short-lived JWT for file access
  const token = await generateFileToken(params.code);
  const fileUrl = `${APP_URL}/api/files/guest/${token}`;
  const shareUrl = `${APP_URL}/g/${params.code}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`✨ Check out my AI photobooth portrait! Download here: ${shareUrl}`)}`;

  // Calculate time remaining
  const hoursLeft = Math.max(0, Math.round((photo.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)));
  const daysLeft = Math.floor(hoursLeft / 24);
  const timeLabel = daysLeft > 0 ? `${daysLeft} day${daysLeft > 1 ? "s" : ""}` : `${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, rgba(124, 92, 255, 0.1) 0%, transparent 60%), var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "var(--space-8) var(--space-4)",
    }}>

      {/* Brand header */}
      <div style={{ width: "100%", maxWidth: 480, textAlign: "center", marginBottom: "var(--space-6)" }}>
        <div style={{
          fontFamily: "var(--font-poppins), Poppins, sans-serif",
          fontSize: 22, fontWeight: 700,
          background: "linear-gradient(135deg, #7C5CFF, #C44DFF)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "var(--space-2)",
        }}>
          BoothMagic
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Your AI portrait is ready</div>
      </div>

      {/* Photo */}
      <div style={{
        width: "100%", maxWidth: 480,
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        marginBottom: "var(--space-6)",
        boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt="Your AI photobooth portrait"
          style={{ width: "100%", display: "block" }}
        />
      </div>

      {/* Action buttons */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <a
          href={fileUrl}
          download={`boothmagic-${params.code}.jpg`}
          id="download-btn"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
            padding: "14px 24px", borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, #7C5CFF, #C44DFF)",
            color: "#fff", fontWeight: 700, fontSize: 16,
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(124, 92, 255, 0.4)",
            minHeight: 52,
          }}
        >
          ⬇️ Download Photo
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="whatsapp-share-btn"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
            padding: "14px 24px", borderRadius: "var(--radius-md)",
            background: "#25D366", color: "#fff", fontWeight: 600, fontSize: 15,
            textDecoration: "none",
            minHeight: 52,
          }}
        >
          💬 Share on WhatsApp
        </a>
      </div>

      {/* Expiry note */}
      <div style={{
        marginTop: "var(--space-6)",
        padding: "var(--space-3) var(--space-4)",
        background: "rgba(255, 255, 255, 0.04)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        fontSize: 13, color: "var(--text-muted)", textAlign: "center",
        maxWidth: 480, width: "100%",
      }}>
        ⏱️ Available for {timeLabel} more · Photos are deleted after 3 days
      </div>

      {/* Footer */}
      <div style={{ marginTop: "var(--space-8)", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
          Created with AI at your event
        </div>
        <Link href="/" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none" }}>
          boothmagic.app
        </Link>
      </div>
    </div>
  );
}

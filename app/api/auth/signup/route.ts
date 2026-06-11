/**
 * app/api/auth/signup/route.ts
 * Creates a new user account with bcrypt-hashed password.
 *
 * On successful signup:
 * 1. Creates user row with passwordHash
 * 2. In local dev (no SMTP), auto-verifies the email
 * 3. Redirects to /login with success message
 *
 * Email verification tokens are sent in production when SMTP is configured.
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, displayName, companyName } = body;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // ── Check for existing user ────────────────────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // ── Create user ────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const smtpConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        displayName: displayName?.trim() || null,
        companyName: companyName?.trim() || null,
        // Auto-verify in local dev when SMTP is not configured
        emailVerified: smtpConfigured ? null : new Date(),
      },
    });

    // ── Email verification (production) ────────────────────────────────────
    if (smtpConfigured) {
      // TODO T03-SMTP: Generate verification token and send email
      // For now, the user needs to be verified manually or via a future
      // /api/auth/verify endpoint
      console.log(
        `📧 SMTP is configured — email verification should be sent to ${normalizedEmail}`
      );
    } else {
      console.log(
        `✅ Auto-verified ${normalizedEmail} (no SMTP configured — local dev mode)`
      );
    }

    return NextResponse.json(
      {
        message: "Account created successfully",
        userId: user.id,
        verified: !!user.emailVerified,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

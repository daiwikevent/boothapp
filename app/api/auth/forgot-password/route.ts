import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";
import { getAppSettings } from "@/lib/app-settings";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // To prevent user enumeration, we return success even if user does not exist
    if (!user) {
      return NextResponse.json({ ok: true, message: "If your email is registered, you will receive a reset link shortly." });
    }

    // Check if SMTP is configured
    const settings = await getAppSettings();
    const smtpHost = settings.smtp_host || process.env.SMTP_HOST;
    const smtpUser = settings.smtp_user || process.env.SMTP_USER;
    const smtpPass = settings.smtp_pass || process.env.SMTP_PASS;
    const smtpConfigured = !!(smtpHost && smtpUser && smtpPass);

    if (!smtpConfigured) {
      return NextResponse.json(
        { error: "Password reset is not configured (SMTP settings are missing). Please contact your administrator." },
        { status: 500 }
      );
    }

    // Generate password reset token (valid for 1 hour)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Delete any existing password reset tokens for this user first
    await prisma.verificationToken.deleteMany({
      where: {
        userId: user.id,
        type: "PASSWORD_RESET",
      },
    });

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: "PASSWORD_RESET",
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendPasswordResetEmail(normalizedEmail, token, appUrl);

    return NextResponse.json({
      ok: true,
      message: "If your email is registered, you will receive a reset link shortly.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

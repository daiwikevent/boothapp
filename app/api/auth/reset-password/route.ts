import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;

export async function POST(req: NextRequest) {
  try {
    const { token: tokenValue, password } = await req.json();

    if (!tokenValue || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Find valid token
    const resetToken = await prisma.verificationToken.findFirst({
      where: {
        token: tokenValue,
        type: "PASSWORD_RESET",
        expiresAt: { gte: new Date() },
      },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired password reset token" }, { status: 400 });
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.verificationToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return NextResponse.json({ ok: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}

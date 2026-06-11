import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tokenValue = searchParams.get("token");

  if (!tokenValue) {
    return NextResponse.redirect(new URL("/login?error=invalid-token", req.url));
  }

  try {
    // Find valid token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: tokenValue,
        type: "EMAIL_VERIFY",
        expiresAt: { gte: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL("/login?error=expired-token", req.url));
    }

    // Update user to verified
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      }),
    ]);

    return NextResponse.redirect(new URL("/login?success=verified", req.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/login?error=verify-failed", req.url));
  }
}

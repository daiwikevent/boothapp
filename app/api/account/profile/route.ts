/**
 * app/api/account/profile/route.ts
 * PATCH /api/account/profile — update mutable profile fields
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { updateProfile, getProfile } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const profile = await getProfile(scoped);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  return NextResponse.json({
    displayName: profile.displayName,
    companyName: profile.companyName,
    logoUrl: profile.logoUrl,
    countdownSecs: profile.countdownSecs,
    boothPin: profile.boothPin,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { displayName, companyName, countdownSecs, boothPin } = await req.json();
  const scoped: ScopedSession = { user: { id: session.user.id } };

  // Validate boothPin: must be exactly 4 digits if provided
  if (boothPin !== undefined && !/^\d{4}$/.test(boothPin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }

  const user = await updateProfile(scoped, {
    displayName: displayName?.trim() ?? undefined,
    companyName: companyName?.trim() ?? undefined,
    countdownSecs: typeof countdownSecs === "number" ? Math.min(10, Math.max(1, countdownSecs)) : undefined,
    boothPin: boothPin ?? undefined,
  });

  return NextResponse.json({ ok: true, displayName: user.displayName });
}

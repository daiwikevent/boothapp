/**
 * app/api/auth/gdrive/disconnect/route.ts
 *
 * POST /api/auth/gdrive/disconnect
 * Clears the user's saved Google Drive refresh token.
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { clearGDriveRefreshToken } from "@/lib/db-scoped";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await clearGDriveRefreshToken(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[GDrive Disconnect] Failed to disconnect:", error);
    return NextResponse.json({ error: "Failed to disconnect Google Drive" }, { status: 500 });
  }
}

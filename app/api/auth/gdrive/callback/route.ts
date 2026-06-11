/**
 * app/api/auth/gdrive/callback/route.ts
 *
 * GET /api/auth/gdrive/callback
 * Google OAuth redirect callback target. Exchanges authorization code for tokens
 * and stores the refresh token in the operator user record.
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthCode } from "@/lib/gdrive";
import { saveGDriveRefreshToken } from "@/lib/db-scoped";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin).toString());
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    console.error(`[GDrive OAuth Callback] Error: ${error || "No auth code provided"}`);
    return NextResponse.redirect(
      new URL("/account?gdrive=error", req.nextUrl.origin).toString()
    );
  }

  try {
    const redirectUri = new URL("/api/auth/gdrive/callback", req.nextUrl.origin).toString();
    const tokens = await exchangeAuthCode(code, redirectUri);

    if (!tokens.refresh_token) {
      console.warn(
        "[GDrive OAuth Callback] Warning: No refresh token returned. User may need to re-consent."
      );
      // Even if refresh_token is missing, they might have already been connected.
      // But we always specify prompt=consent, so a refresh token should be returned.
    } else {
      await saveGDriveRefreshToken(session.user.id, tokens.refresh_token);
    }

    return NextResponse.redirect(
      new URL("/account?gdrive=connected", req.nextUrl.origin).toString()
    );
  } catch (err) {
    console.error("[GDrive OAuth Callback] Exchange failed:", err);
    return NextResponse.redirect(
      new URL("/account?gdrive=error", req.nextUrl.origin).toString()
    );
  }
}

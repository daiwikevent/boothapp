/**
 * app/api/auth/gdrive/connect/route.ts
 *
 * GET /api/auth/gdrive/connect
 * Redirects user to Google OAuth consent page to request Drive access.
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientID = process.env.GOOGLE_CLIENT_ID;
  if (!clientID) {
    return NextResponse.redirect(
      new URL("/account?gdrive=not_configured", req.nextUrl.origin).toString()
    );
  }

  // Construct callback URL dynamically using request origin
  const redirectUri = new URL("/api/auth/gdrive/callback", req.nextUrl.origin).toString();

  const googleOAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleOAuthUrl.searchParams.set("client_id", clientID);
  googleOAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleOAuthUrl.searchParams.set("response_type", "code");
  googleOAuthUrl.searchParams.set("scope", "openid email profile https://www.googleapis.com/auth/drive.file");
  googleOAuthUrl.searchParams.set("access_type", "offline");
  googleOAuthUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(googleOAuthUrl.toString());
}

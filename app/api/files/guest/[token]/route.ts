/**
 * app/api/files/guest/[token]/route.ts
 * T12 — Guest photo file serving via short-lived JWT token
 *
 * GET /api/files/guest/[token]
 *
 * - Verifies JWT signed with FILE_TOKEN_SECRET
 * - Checks photo expiry
 * - Streams file with Cache-Control: private, no-store
 * - Token payload: { photoId, exp }
 */

import { NextRequest, NextResponse } from "next/server";
import { getPhotoByShortCode } from "@/lib/db-scoped";
import { readFile } from "fs/promises";
import { join } from "path";
import * as jose from "jose";

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), "data", "storage");
const FILE_TOKEN_SECRET = process.env.FILE_TOKEN_SECRET ?? "dev-file-token-secret";

type Ctx = { params: { token: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  let payload: jose.JWTPayload;
  try {
    const secret = new TextEncoder().encode(FILE_TOKEN_SECRET);
    const { payload: p } = await jose.jwtVerify(params.token, secret);
    payload = p;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const shortCode = payload.shortCode as string;
  if (!shortCode) return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });

  const photo = await getPhotoByShortCode(shortCode);
  if (!photo || photo.status !== "DONE" || !photo.outputPath) {
    return NextResponse.json({ error: "Photo not found or expired" }, { status: 404 });
  }

  const filePath = join(STORAGE_DIR, photo.outputPath);
  try {
    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="boothmagic-${shortCode}.jpg"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

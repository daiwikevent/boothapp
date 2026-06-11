/**
 * app/api/files/logo/[filename]/route.ts
 * T19 — Serve user logo files from the data/logos directory
 *
 * GET /api/files/logo/[filename]
 *   Streams logo image files (PNG/JPEG). No auth required — logos are
 *   displayed publicly on booth screens and slideshow.
 */

import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname } from "path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), "data", "storage");
const LOGOS_DIR = join(STORAGE_DIR, "logos");

type Ctx = { params: { filename: string } };

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { filename } = params;

  // Sanitise — prevent path traversal
  if (filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const ext = extname(filename).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  const filePath = join(LOGOS_DIR, filename);
  try {
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }
}

/**
 * app/api/files/slideshow/[photoId]/route.ts
 * T18 — Public photo serving for slideshow (no operator auth required)
 *
 * GET /api/files/slideshow/[photoId]
 *   Streams the output image from disk.
 *   Validates that the photo is DONE, non-expired, and has an outputPath.
 *   No session required — this is the public slideshow image endpoint.
 *
 * Security: serves output files only (never originals), respects expiresAt.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), "data", "storage");

type Ctx = { params: { photoId: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const photo = await prisma.photo.findFirst({
    where: {
      id: params.photoId,
      status: "DONE",
      outputPath: { not: null },
      expiresAt: { gt: new Date() },
    },
    select: { outputPath: true, shortCode: true },
  });

  if (!photo || !photo.outputPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = join(STORAGE_DIR, photo.outputPath);
  try {
    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        // Allow browser to cache for the slideshow session
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}

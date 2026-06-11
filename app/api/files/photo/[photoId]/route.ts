/**
 * app/api/files/photo/[photoId]/route.ts
 * T10/T11/T16 — Operator photo file serving and deletion (authenticated)
 *
 * GET    /api/files/photo/[photoId]  → Streams the photo from disk
 * DELETE /api/files/photo/[photoId]  → Deletes photo files from disk + DB row
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getPhoto, deletePhoto } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import { readFile, unlink } from "fs/promises";
import { join } from "path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), "data", "storage");

type Ctx = { params: { photoId: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const photo = await getPhoto(scoped, params.photoId);
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variant = req.nextUrl.searchParams.get("variant");
  const relativePath = variant === "original" ? photo.originalPath : photo.outputPath;

  if (!relativePath) {
    return NextResponse.json({ error: "Photo not ready or path missing" }, { status: 404 });
  }

  const filePath = join(STORAGE_DIR, relativePath);
  try {
    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="boothmagic-${photo.shortCode}.jpg"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const photo = await getPhoto(scoped, params.photoId);
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 1. Delete files from disk
  const originalPath = photo.originalPath ? join(STORAGE_DIR, photo.originalPath) : null;
  const outputPath = photo.outputPath ? join(STORAGE_DIR, photo.outputPath) : null;

  for (const path of [originalPath, outputPath]) {
    if (path) {
      try {
        await unlink(path);
      } catch {
        // File might not exist, ignore
      }
    }
  }

  // 2. Delete database row
  await deletePhoto(scoped, params.photoId);

  return NextResponse.json({ success: true });
}

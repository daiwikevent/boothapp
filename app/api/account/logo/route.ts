/**
 * app/api/account/logo/route.ts
 * T19 — Logo upload for white-label branding (Pro+ only)
 *
 * POST   /api/account/logo — Upload a logo image (multipart/form-data, ≤2MB, PNG/JPEG/WebP)
 * DELETE /api/account/logo — Remove the current logo
 *
 * Saves the logo to data/storage/logos/{userId}_{timestamp}.{ext}
 * and updates the user's logoUrl in the database.
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { updateProfile, getProfile } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join, extname } from "path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), "data", "storage");
const LOGOS_DIR = join(STORAGE_DIR, "logos");
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PRO_PLANS = ["PRO", "BUSINESS"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Plan check — Pro+ only
  const plan = session.user.plan ?? "TRIAL";
  if (!PRO_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "Logo upload requires Pro or Business plan" },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, and WebP images are allowed" },
      { status: 400 }
    );
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Logo must be under 2MB" },
      { status: 400 }
    );
  }

  // Read and save
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await mkdir(LOGOS_DIR, { recursive: true });

  const ext = extname(file.name).toLowerCase() || ".png";
  const filename = `${session.user.id}_${Date.now()}${ext}`;
  const filePath = join(LOGOS_DIR, filename);
  await writeFile(filePath, buffer);

  // Delete old logo file if exists
  const scoped: ScopedSession = { user: { id: session.user.id } };
  const profile = await getProfile(scoped);
  if (profile?.logoUrl) {
    const oldFilename = profile.logoUrl.split("/").pop();
    if (oldFilename) {
      try { await unlink(join(LOGOS_DIR, oldFilename)); } catch { /* ignore */ }
    }
  }

  // Update profile
  const logoUrl = `/api/files/logo/${filename}`;
  await updateProfile(scoped, { logoUrl });

  return NextResponse.json({ logoUrl });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const profile = await getProfile(scoped);

  // Delete file from disk
  if (profile?.logoUrl) {
    const filename = profile.logoUrl.split("/").pop();
    if (filename) {
      try { await unlink(join(LOGOS_DIR, filename)); } catch { /* ignore */ }
    }
  }

  // Clear logoUrl
  await updateProfile(scoped, { logoUrl: null });
  return NextResponse.json({ ok: true });
}

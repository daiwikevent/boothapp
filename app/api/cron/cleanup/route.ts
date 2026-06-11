/**
 * app/api/cron/cleanup/route.ts
 * T13 — Auto-delete expired photos (files + DB rows)
 *
 * GET /api/cron/cleanup
 *
 * Should be called hourly via cron:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/cleanup
 *
 * Deletes:
 *  - Storage files (originals + outputs) for expired photos
 *  - DB photo rows (cascade)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import { join } from "path";

const STORAGE_DIR = process.env.STORAGE_DIR ?? join(process.cwd(), "data", "storage");
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Simple bearer token auth for cron jobs
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();

  // Find all expired photos
  const expired = await prisma.photo.findMany({
    where: { expiresAt: { lt: now } },
    select: { id: true, originalPath: true, outputPath: true, shortCode: true },
  });

  let deletedFiles = 0;
  let deletedRows = 0;
  const errors: string[] = [];

  for (const photo of expired) {
    // Delete files from disk
    for (const filePath of [photo.originalPath, photo.outputPath]) {
      if (filePath) {
        try {
          await unlink(join(STORAGE_DIR, filePath));
          deletedFiles++;
        } catch {
          // File may already be gone — that's fine
        }
      }
    }

    // Delete DB row (cascades to credit_ledger refs are intentionally not deleted)
    try {
      await prisma.photo.delete({ where: { id: photo.id } });
      deletedRows++;
    } catch (e) {
      errors.push(`Failed to delete photo ${photo.id}: ${e}`);
    }
  }

  return NextResponse.json({
    ok: true,
    deletedFiles,
    deletedRows,
    errors,
    checkedAt: now.toISOString(),
  });
}

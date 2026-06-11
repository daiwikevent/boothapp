/**
 * app/api/slideshow/[slug]/route.ts
 * T18 — Public slideshow API (no auth required)
 *
 * GET /api/slideshow/[slug]
 *   Returns the latest N DONE photos for a public event slug.
 *   Each photo item includes a signed URL (/api/files/slideshow/[photoId])
 *   and basic metadata. Checks that the photo is non-expired.
 *
 * Security: read-only, no user data leaked — only output images.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: { slug: string } };

const SLIDESHOW_LIMIT = 50; // max photos to return

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = params;

  // Find event by slug — public, no user auth needed
  const event = await prisma.event.findFirst({
    where: { slug },
    select: { id: true, name: true, userId: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Fetch latest DONE photos with unexpired output files
  const photos = await prisma.photo.findMany({
    where: {
      eventId: event.id,
      userId: event.userId, // scoped to event owner
      status: "DONE",
      outputPath: { not: null },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: SLIDESHOW_LIMIT,
    select: {
      id: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    event: { name: event.name, slug },
    photos: photos.map((p) => ({
      id: p.id,
      // Each image served via authenticated-on-server route using photoId
      url: `/api/files/slideshow/${p.id}`,
      createdAt: p.createdAt,
    })),
  });
}

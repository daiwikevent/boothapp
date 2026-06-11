/**
 * app/api/reports/route.ts
 * T20 — Usage Reports API
 *
 * GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&eventId=xxx
 *   Returns usage data: credits used, photos generated, failures, per-event breakdown.
 *   Filterable by date range and event.
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = req.nextUrl;

  // Parse filters
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const eventId = searchParams.get("eventId");

  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default: last 30 days
  const to = toStr ? new Date(toStr + "T23:59:59.999Z") : new Date();

  // Base where clause
  const wherePhotos: Record<string, unknown> = {
    userId,
    createdAt: { gte: from, lte: to },
  };
  if (eventId) wherePhotos.eventId = eventId;

  const whereLedger: Record<string, unknown> = {
    userId,
    createdAt: { gte: from, lte: to },
  };

  // Fetch data in parallel
  const [photos, events, ledger] = await Promise.all([
    prisma.photo.findMany({
      where: wherePhotos,
      select: { id: true, eventId: true, status: true, creditsCharged: true, createdAt: true, presetId: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.event.findMany({
      where: { userId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.creditLedger.findMany({
      where: whereLedger,
      select: { id: true, delta: true, reason: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Compute summary
  const totalPhotos = photos.length;
  const donePhotos = photos.filter(p => p.status === "DONE").length;
  const failedPhotos = photos.filter(p => p.status === "FAILED").length;
  const processingPhotos = photos.filter(p => p.status === "PROCESSING").length;
  const totalCreditsUsed = photos
    .filter(p => p.status === "DONE")
    .reduce((sum, p) => sum + p.creditsCharged, 0);
  const totalCreditsRefunded = ledger
    .filter(l => l.reason === "REFUND")
    .reduce((sum, l) => sum + l.delta, 0);

  // Per-event breakdown
  const eventMap = new Map(events.map(e => [e.id, e]));
  const perEvent: Record<string, { name: string; total: number; done: number; failed: number; credits: number }> = {};
  for (const p of photos) {
    if (!perEvent[p.eventId]) {
      const ev = eventMap.get(p.eventId);
      perEvent[p.eventId] = { name: ev?.name ?? "Unknown", total: 0, done: 0, failed: 0, credits: 0 };
    }
    const entry = perEvent[p.eventId];
    entry.total++;
    if (p.status === "DONE") { entry.done++; entry.credits += p.creditsCharged; }
    if (p.status === "FAILED") entry.failed++;
  }

  return NextResponse.json({
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      totalPhotos,
      donePhotos,
      failedPhotos,
      processingPhotos,
      totalCreditsUsed,
      totalCreditsRefunded,
    },
    events: events.map(e => ({ id: e.id, name: e.name })),
    perEvent: Object.entries(perEvent).map(([id, data]) => ({ eventId: id, ...data })),
    photos: photos.map(p => ({
      id: p.id,
      eventId: p.eventId,
      eventName: eventMap.get(p.eventId)?.name ?? "",
      status: p.status,
      credits: p.creditsCharged,
      createdAt: p.createdAt,
    })),
  });
}

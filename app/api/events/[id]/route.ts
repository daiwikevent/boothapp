/**
 * app/api/events/[id]/route.ts
 * T05 — Per-event CRUD
 *
 * GET    /api/events/[id]              → fetch one event
 * PATCH  /api/events/[id]             → rename event
 * DELETE /api/events/[id]             → delete event
 * POST   /api/events/[id]/activate    → handled in /activate/route.ts
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getEvent, updateEvent, deleteEvent } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import type { Event } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const event = await getEvent(scoped, params.id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, gdriveFolderId } = body;

  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const updateData: Partial<Pick<Event, "name" | "gdriveFolderId">> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (gdriveFolderId !== undefined) {
    updateData.gdriveFolderId = gdriveFolderId.trim() || null;
  }

  const event = await updateEvent(scoped, params.id, updateData);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const ok = await deleteEvent(scoped, params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

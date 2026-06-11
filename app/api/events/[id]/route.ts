/**
 * app/api/events/[id]/route.ts
 * T05 — Per-event CRUD
 *
 * GET    /api/events/[id]              → fetch one event
 * PATCH  /api/events/[id]             → rename event / update drive folder (with verification)
 * DELETE /api/events/[id]             → delete event
 * POST   /api/events/[id]/activate    → handled in /activate/route.ts
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getEvent, updateEvent, deleteEvent } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import type { Event } from "@prisma/client";
import { verifyAndUploadSample } from "@/lib/gdrive";

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
    const trimmed = gdriveFolderId.trim();
    if (trimmed) {
      try {
        const resolvedFolderId = await verifyAndUploadSample(
          session.user.id,
          trimmed,
          params.id
        );
        updateData.gdriveFolderId = resolvedFolderId;
      } catch (err: unknown) {
        console.error("[GDrive Verification Failed]:", err);
        const errMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
          { error: `Verification failed: ${errMsg}. Verify the folder URL is shared and has Editor permissions.` },
          { status: 400 }
        );
      }
    } else {
      updateData.gdriveFolderId = null;
    }
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

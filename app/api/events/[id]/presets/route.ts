/**
 * app/api/events/[id]/presets/route.ts
 * T07 — Event–preset linking
 *
 * GET  /api/events/[id]/presets → list preset IDs linked to this event
 * PUT  /api/events/[id]/presets → replace the full set of linked presets
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { listEventPresets, setEventPresets, getEvent } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const event = await getEvent(scoped, params.id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const presets = await listEventPresets(scoped, params.id);
  return NextResponse.json(presets);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { presetIds } = await req.json();
  if (!Array.isArray(presetIds)) return NextResponse.json({ error: "presetIds must be an array" }, { status: 400 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  try {
    const links = await setEventPresets(scoped, params.id, presetIds);
    return NextResponse.json(links);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}

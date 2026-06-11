/**
 * app/api/events/[id]/activate/route.ts
 * T05 — Activate exactly one event (deactivates all others for this user).
 *
 * POST /api/events/[id]/activate
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { setActiveEvent } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";

type Ctx = { params: { id: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const event = await setActiveEvent(scoped, params.id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

/**
 * app/api/events/route.ts
 * T05 — Events CRUD API
 *
 * GET  /api/events  → list all events for the session user
 * POST /api/events  → create a new event
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { listEvents, createEvent } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import { verifyAndUploadSample } from "@/lib/gdrive";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const events = await listEvents(scoped);
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, gdriveFolderId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const slug = slugify(name.trim()) + "-" + Date.now().toString(36);

  let resolvedFolderId: string | null = null;
  if (gdriveFolderId && gdriveFolderId.trim()) {
    try {
      resolvedFolderId = await verifyAndUploadSample(
        session.user.id,
        gdriveFolderId
      );
    } catch (err: unknown) {
      console.error("[GDrive Verification Failed on Create]:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Verification failed: ${errMsg}. Verify the folder URL is shared and has Editor permissions.` },
        { status: 400 }
      );
    }
  }

  try {
    const event = await createEvent(scoped, {
      name: name.trim(),
      slug,
      gdriveFolderId: resolvedFolderId,
    });
    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "An event with a similar name already exists." }, { status: 409 });
  }
}


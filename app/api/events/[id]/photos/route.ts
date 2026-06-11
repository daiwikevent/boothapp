import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { listEventPhotos } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const photos = await listEventPhotos(scoped, params.id);
  return NextResponse.json(photos);
}

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, upsertSystemPreset } from "@/lib/db-scoped";

import { Plan } from "@/lib/db-scoped";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scopedUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    plan: session.user.plan as Plan,
    isAdmin: session.user.isAdmin,
  };

  try {
    assertAdmin({ user: scopedUser });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();

  try {
    const preset = await upsertSystemPreset({ user: scopedUser }, data);
    return NextResponse.json(preset);
  } catch (e: unknown) {
    const err = e as Error;
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to upsert preset" }, { status: 500 });
  }
}

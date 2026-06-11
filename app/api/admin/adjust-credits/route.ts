import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/db-scoped";

import { Plan } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertAdmin({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        plan: session.user.plan as Plan,
        isAdmin: session.user.isAdmin,
      },
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await req.json();
  const { targetUserId, amount } = data;

  if (!targetUserId || typeof amount !== "number") {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const delta = amount;
    const ledgerRow = await prisma.creditLedger.create({
      data: {
        userId: targetUserId,
        delta,
        reason: delta > 0 ? "TRIAL_GRANT" : "PHOTO_SPEND",
        refId: `admin:${session.user.id}:${Date.now()}`,
      },
    });
    return NextResponse.json({ success: true, delta: ledgerRow.delta });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to adjust credits" }, { status: 500 });
  }
}

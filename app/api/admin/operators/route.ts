import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdmin, getBalanceForUser } from "@/lib/db-scoped";

import { Plan } from "@prisma/client";

export async function GET() {
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

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      companyName: true,
      plan: true,
      createdAt: true,
    },
  });

  const operators = await Promise.all(
    users.map(async (u) => {
      const balance = await getBalanceForUser(u.id);
      return { ...u, balance };
    })
  );

  return NextResponse.json(operators);
}

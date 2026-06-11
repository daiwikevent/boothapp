import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdmin, getBalanceForUser } from "@/lib/db-scoped";
import { Plan } from "@prisma/client";

async function verifyAdminSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  assertAdmin({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      plan: session.user.plan as Plan,
      isAdmin: session.user.isAdmin,
    },
  });
  return session.user.id;
}

export async function GET() {
  try {
    await verifyAdminSession();
  } catch (e) {
    const errorObj = e as Error;
    const status = errorObj.message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: errorObj.message }, { status });
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
      emailVerified: true,
    },
  });

  const operators = await Promise.all(
    users.map(async (u) => {
      const balance = await getBalanceForUser(u.id);
      return {
        ...u,
        emailVerified: !!u.emailVerified,
        balance,
      };
    })
  );

  return NextResponse.json(operators);
}

export async function PATCH(req: NextRequest) {
  try {
    await verifyAdminSession();
  } catch (e) {
    const errorObj = e as Error;
    const status = errorObj.message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: errorObj.message }, { status });
  }

  const data = await req.json();
  const { operatorId, plan, emailVerified } = data;

  if (!operatorId) {
    return NextResponse.json({ error: "Missing operatorId" }, { status: 400 });
  }

  const updateData: { plan?: Plan; emailVerified?: Date | null } = {};
  if (plan !== undefined) updateData.plan = plan as Plan;
  if (emailVerified !== undefined) {
    updateData.emailVerified = emailVerified ? new Date() : null;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: operatorId },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        companyName: true,
        plan: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    const balance = await getBalanceForUser(updated.id);
    return NextResponse.json({
      ...updated,
      emailVerified: !!updated.emailVerified,
      balance,
    });
  } catch (e) {
    console.error("Failed to update operator:", e);
    return NextResponse.json({ error: "Failed to update operator" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await verifyAdminSession();
  } catch (e) {
    const errorObj = e as Error;
    const status = errorObj.message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: errorObj.message }, { status });
  }

  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get("operatorId");

  if (!operatorId) {
    return NextResponse.json({ error: "Missing operatorId" }, { status: 400 });
  }

  try {
    // Check if operator exists and is not admin to prevent self-deletion
    const targetUser = await prisma.user.findUnique({
      where: { id: operatorId },
      select: { isAdmin: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    if (targetUser.isAdmin) {
      return NextResponse.json({ error: "Cannot delete an administrator account" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: operatorId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete operator:", e);
    return NextResponse.json({ error: "Failed to delete operator" }, { status: 500 });
  }
}

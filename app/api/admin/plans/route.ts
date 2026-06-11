import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/db-scoped";

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
      plan: session.user.plan ?? "TRIAL",
      isAdmin: session.user.isAdmin,
    },
  });
}

export async function GET() {
  try {
    await verifyAdminSession();
  } catch (e) {
    const errorObj = e as Error;
    const status = errorObj.message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: errorObj.message }, { status });
  }

  try {
    const plans = await prisma.billingPlan.findMany({
      orderBy: { priceInr: "asc" },
    });
    return NextResponse.json(plans);
  } catch (e) {
    console.error("Failed to load billing plans:", e);
    return NextResponse.json({ error: "Failed to load billing plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdminSession();
  } catch (e) {
    const errorObj = e as Error;
    const status = errorObj.message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: errorObj.message }, { status });
  }

  try {
    const data = await req.json();
    const {
      id,
      name,
      label,
      priceInr,
      credits,
      features,
      hasCustomPresets,
      hasCustomLogo,
      hasNoWatermark,
      hasCsvReports,
      hasAttendantPin,
      isActive,
    } = data;

    if (!name || !label || priceInr === undefined || credits === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (id) {
      const updated = await prisma.billingPlan.update({
        where: { id },
        data: {
          name,
          label,
          priceInr,
          credits,
          features,
          hasCustomPresets,
          hasCustomLogo,
          hasNoWatermark,
          hasCsvReports,
          hasAttendantPin,
          isActive,
        },
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.billingPlan.create({
        data: {
          name,
          label,
          priceInr,
          credits,
          features,
          hasCustomPresets,
          hasCustomLogo,
          hasNoWatermark,
          hasCsvReports,
          hasAttendantPin,
          isActive,
        },
      });
      return NextResponse.json(created);
    }
  } catch (e) {
    console.error("Failed to save billing plan:", e);
    return NextResponse.json({ error: "Failed to save billing plan" }, { status: 500 });
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
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing plan id" }, { status: 400 });
  }

  try {
    const plan = await prisma.billingPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (["STARTER", "PRO", "BUSINESS"].includes(plan.name)) {
      return NextResponse.json({ error: "Cannot delete system default plans" }, { status: 400 });
    }

    await prisma.billingPlan.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Failed to delete billing plan:", e);
    return NextResponse.json({ error: "Failed to delete billing plan" }, { status: 500 });
  }
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

async function isAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } });
  return !!user?.isAdmin;
}

// GET — list all credit packs
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const packs = await prisma.creditPack.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(packs);
}

// POST — create or update a credit pack
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await req.json();
  const { id, label, credits, priceInr, sortOrder, isActive } = data;

  if (!label || credits == null || priceInr == null) {
    return NextResponse.json({ error: "label, credits, and priceInr are required" }, { status: 400 });
  }

  const payload = {
    label: label.trim(),
    credits: Number(credits),
    priceInr: Number(priceInr),
    sortOrder: Number(sortOrder ?? 0),
    isActive: isActive !== false,
  };

  if (id) {
    // Update existing
    const updated = await prisma.creditPack.update({ where: { id }, data: payload });
    return NextResponse.json(updated);
  } else {
    // Create new
    const created = await prisma.creditPack.create({ data: payload });
    return NextResponse.json(created);
  }
}

// DELETE — delete a credit pack
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.creditPack.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

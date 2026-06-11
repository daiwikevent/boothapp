/**
 * app/api/admin/settings/route.ts
 * Admin-only: Read and write app_settings (AI keys, active model)
 *
 * GET  /api/admin/settings          — return all settings (values masked for keys)
 * POST /api/admin/settings          — upsert one or more settings { key, value }[]
 */

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";

// Keys that should be masked (only show last 6 chars) when read back
const SENSITIVE_KEYS = [
  "gemini_api_key", "openai_api_key", "fal_api_key", "replicate_api_key", "ideogram_api_key", "midjourney_api_key",
  "razorpay_key_id", "razorpay_key_secret", "razorpay_webhook_secret", "smtp_pass"
];

function maskValue(key: string, value: string): string {
  if (SENSITIVE_KEYS.includes(key) && value.length > 6) {
    return "••••••••••••" + value.slice(-6);
  }
  return value;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const scoped: ScopedSession = {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      isAdmin: session.user.isAdmin,
    },
  };
  
  try {
    assertAdmin(scoped);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(
    settings.map(s => ({ key: s.key, value: maskValue(s.key, s.value), updatedAt: s.updatedAt }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const scoped: ScopedSession = {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      isAdmin: session.user.isAdmin,
    },
  };
  
  try {
    assertAdmin(scoped);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: { key: string; value: string }[] = await req.json();
  if (!Array.isArray(body) || body.some(b => !b.key)) {
    return NextResponse.json({ error: "Expected array of { key, value }" }, { status: 400 });
  }

  // Upsert each setting
  await Promise.all(
    body.map(({ key, value }) =>
      // Don't overwrite if user sent a masked value
      value.startsWith("••••") ? Promise.resolve() :
      prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return NextResponse.json({ ok: true });
}


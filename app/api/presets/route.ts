import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { PeopleTag } from "@prisma/client";
import { createPreset, listPresets } from "@/lib/db-scoped";
import type { ScopedSession, Plan } from "@/lib/db-scoped";
import { hasFeature } from "@/lib/plans";

const BLOCKED_WORDS = [
  "nudity", "naked", "sex", "porn", "violence", "kill", "murder", "blood", 
  "death", "bomb", "weapon", "gun", "cocaine", "weed", "drugs", "abuse", 
  "terrorist", "suicide"
];

function containsBlockedTerms(text: string): boolean {
  const normalized = text.toLowerCase();
  return BLOCKED_WORDS.some(word => normalized.includes(word));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped: ScopedSession = {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      plan: session.user.plan as Plan,
      isAdmin: session.user.isAdmin,
    },
  };
  const presets = await listPresets(scoped);
  return NextResponse.json(presets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = session.user.plan ?? "TRIAL";
  const canCustomPresets = await hasFeature(plan, "hasCustomPresets");
  if (!canCustomPresets) {
    return NextResponse.json(
      { error: "Plan upgrade required. Custom presets are restricted to Pro & Business plans." },
      { status: 403 }
    );
  }

  try {
    const data = await req.json();
    const name = data.name?.trim();
    const prompt = data.prompt?.trim();
    const peopleTag = data.peopleTag as PeopleTag;
    const thumbnailUrl = data.thumbnailUrl?.trim() || undefined;

    if (!name || !prompt || !peopleTag) {
      return NextResponse.json({ error: "Missing required fields (name, prompt, peopleTag)" }, { status: 400 });
    }

    if (!["SOLO", "COUPLE", "GROUP"].includes(peopleTag)) {
      return NextResponse.json({ error: "Invalid peopleTag value" }, { status: 400 });
    }

    // Safety Denylist check
    if (containsBlockedTerms(name) || containsBlockedTerms(prompt)) {
      return NextResponse.json(
        { error: "Safety check failed: prompt or title contains blocked terminology." },
        { status: 400 }
      );
    }

    const scoped: ScopedSession = {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        plan,
        isAdmin: session.user.isAdmin,
      },
    };

    const newPreset = await createPreset(scoped, {
      name,
      prompt,
      peopleTag,
      thumbnailUrl,
    });

    return NextResponse.json(newPreset);
  } catch (e) {
    console.error("Custom preset create error:", e);
    return NextResponse.json({ error: "Failed to create custom preset" }, { status: 500 });
  }
}

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { Plan, PeopleTag } from "@prisma/client";
import { updateCustomPreset, deleteCustomPreset } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";

const BLOCKED_WORDS = [
  "nudity", "naked", "sex", "porn", "violence", "kill", "murder", "blood", 
  "death", "bomb", "weapon", "gun", "cocaine", "weed", "drugs", "abuse", 
  "terrorist", "suicide"
];

function containsBlockedTerms(text: string): boolean {
  const normalized = text.toLowerCase();
  return BLOCKED_WORDS.some(word => normalized.includes(word));
}

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = session.user.plan as Plan;
  // Enforce Pro+ Plan Gate
  if (plan !== "PRO" && plan !== "BUSINESS") {
    return NextResponse.json(
      { error: "Plan upgrade required. Custom presets are restricted to Pro & Business plans." },
      { status: 403 }
    );
  }

  try {
    const data = await req.json();
    const updateData: {
      name?: string;
      prompt?: string;
      peopleTag?: PeopleTag;
      thumbnailUrl?: string;
    } = {};

    if (data.name !== undefined) {
      const name = data.name?.trim();
      if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      if (containsBlockedTerms(name)) {
        return NextResponse.json({ error: "Safety check failed: title contains blocked terminology." }, { status: 400 });
      }
      updateData.name = name;
    }

    if (data.prompt !== undefined) {
      const prompt = data.prompt?.trim();
      if (!prompt) return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
      if (containsBlockedTerms(prompt)) {
        return NextResponse.json({ error: "Safety check failed: prompt contains blocked terminology." }, { status: 400 });
      }
      updateData.prompt = prompt;
    }

    if (data.peopleTag !== undefined) {
      const peopleTag = data.peopleTag as PeopleTag;
      if (!["SOLO", "COUPLE", "GROUP"].includes(peopleTag)) {
        return NextResponse.json({ error: "Invalid peopleTag value" }, { status: 400 });
      }
      updateData.peopleTag = peopleTag;
    }

    if (data.thumbnailUrl !== undefined) {
      updateData.thumbnailUrl = data.thumbnailUrl?.trim() || "";
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

    const updated = await updateCustomPreset(scoped, params.id, updateData);
    if (!updated) {
      return NextResponse.json({ error: "Preset not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Custom preset update error:", e);
    return NextResponse.json({ error: "Failed to update custom preset" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = session.user.plan as Plan;
  // Enforce Pro+ Plan Gate
  if (plan !== "PRO" && plan !== "BUSINESS") {
    return NextResponse.json(
      { error: "Plan upgrade required." },
      { status: 403 }
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

  try {
    const success = await deleteCustomPreset(scoped, params.id);
    if (!success) {
      return NextResponse.json({ error: "Preset not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Custom preset delete error:", e);
    return NextResponse.json({ error: "Failed to delete custom preset" }, { status: 500 });
  }
}

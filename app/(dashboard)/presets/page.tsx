import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listPresets } from "@/lib/db-scoped";
import type { ScopedSession, Plan } from "@/lib/db-scoped";
import type { Metadata } from "next";
import PresetsClient from "./PresetsClient";

export const metadata: Metadata = {
  title: "Presets | BoothMagic",
  description: "Browse and manage your AI photobooth style presets.",
};

export default async function PresetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const plan = session.user.plan as Plan;
  const scoped: ScopedSession = {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      plan,
      isAdmin: session.user.isAdmin,
    },
  };
  const presets = await listPresets(scoped);

  return (
    <div style={{ maxWidth: 1100 }}>
      <PresetsClient
        initialPresets={JSON.parse(JSON.stringify(presets))}
        currentPlan={plan}
        features={session.user.features}
      />
    </div>
  );
}

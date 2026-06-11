import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listPresets, getBalanceForUser } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";
import type { Metadata } from "next";

import { Plan } from "@prisma/client";

export const metadata: Metadata = {
  title: "Admin Panel | BoothMagic",
  description: "Internal administrative controls for BoothMagic.",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  
  // Gate check
  if (!session.user.isAdmin) {
    redirect("/dashboard");
  }

  const scoped: ScopedSession = {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      plan: session.user.plan as Plan,
      isAdmin: session.user.isAdmin,
    },
  };

  // Fetch system presets and all operator details server-side
  const [presets, users] = await Promise.all([
    listPresets(scoped),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        companyName: true,
        plan: true,
        createdAt: true,
      },
    }),
  ]);

  const systemPresets = presets.filter((p) => !p.ownerId);

  const operators = await Promise.all(
    users.map(async (u) => {
      const balance = await getBalanceForUser(u.id);
      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName ?? "",
        companyName: u.companyName ?? "",
        plan: u.plan,
        createdAt: u.createdAt.toISOString(),
        balance,
      };
    })
  );

  return (
    <div style={{ maxWidth: 1100 }}>
      <AdminClient
        initialSystemPresets={JSON.parse(JSON.stringify(systemPresets))}
        initialOperators={operators}
      />
    </div>
  );
}

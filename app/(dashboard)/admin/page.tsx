import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { listPresets, getBalanceForUser } from "@/lib/db-scoped";
import type { ScopedSession, Plan } from "@/lib/db-scoped";
import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";
import type { Metadata } from "next";
import { getOrSeedBillingPlans } from "@/lib/plans";

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

  // Fetch all system admin data concurrently
  const [
    presets,
    users,
    totalOperators,
    totalEvents,
    totalPhotos,
    spentCreditsAgg,
    recentPayments,
    recentLedger,
    billingPlans,
  ] = await Promise.all([
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
        emailVerified: true,
      },
    }),
    prisma.user.count(),
    prisma.event.count(),
    prisma.photo.count(),
    prisma.creditLedger.aggregate({
      where: { delta: { lt: 0 } },
      _sum: { delta: true },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    }),
    prisma.creditLedger.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        user: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    }),
    getOrSeedBillingPlans(),
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
        emailVerified: !!u.emailVerified,
        balance,
      };
    })
  );

  // Format stats object
  const stats = {
    totalOperators,
    totalEvents,
    totalPhotos,
    totalCreditsSpent: Math.abs(spentCreditsAgg._sum.delta ?? 0),
  };

  // Format recent payments logs
  const paymentsLog = recentPayments.map((p) => ({
    id: p.id,
    userEmail: p.user?.email || "Unknown",
    userDisplayName: p.user?.displayName || "",
    razorpayPaymentId: p.razorpayPaymentId,
    amountInr: p.amountInr / 100, // convert paise to INR
    creditsGranted: p.creditsGranted,
    type: p.type,
    createdAt: p.createdAt.toISOString(),
  }));

  // Format ledger logs
  const ledgerLog = recentLedger.map((l) => ({
    id: l.id,
    userEmail: l.user?.email || "Unknown",
    userDisplayName: l.user?.displayName || "",
    delta: l.delta,
    reason: l.reason,
    refId: l.refId || "",
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div style={{ maxWidth: 1100 }}>
      <AdminClient
        initialSystemPresets={JSON.parse(JSON.stringify(systemPresets))}
        initialOperators={operators}
        stats={stats}
        paymentsLog={paymentsLog}
        ledgerLog={ledgerLog}
        initialBillingPlans={JSON.parse(JSON.stringify(billingPlans))}
      />
    </div>
  );
}

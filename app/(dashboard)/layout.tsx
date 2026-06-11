/**
 * app/(dashboard)/layout.tsx
 * Dashboard layout — authenticated shell with top nav, credit badge, and logout.
 * All (dashboard) routes require a session (enforced by middleware.ts).
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfile, getBalance } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import DashboardTopbar from "./DashboardTopbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check email verification — unverified users are blocked (T03 acceptance criterion)
  if (!session.user.isVerified) {
    redirect("/login?error=verify");
  }

  // Fetch credit balance and profile server-side dynamically
  const scopedSession: ScopedSession = {
    user: { id: session.user.id },
  };
  const [profile, credits] = await Promise.all([
    getProfile(scopedSession),
    getBalance(scopedSession),
  ]);

  return (
    <div>
      <DashboardTopbar
        userName={profile?.displayName || session.user.name || session.user.email || "Operator"}
        userEmail={session.user.email || ""}
        credits={credits}
        plan={profile?.plan || "TRIAL"}
        isAdmin={session.user.isAdmin || false}
      />
      <main style={{ padding: "var(--space-6)", maxWidth: 1200, margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}

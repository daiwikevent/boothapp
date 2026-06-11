/**
 * app/(dashboard)/account/page.tsx
 * T03/T04 — Account settings page
 *
 * Shows: profile info, current plan + credits, billing section (top-up link),
 * password change form, countdown setting.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProfile, getBalance } from "@/lib/db-scoped";
import type { ScopedSession } from "@/lib/db-scoped";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/app-settings";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "Account | BoothMagic",
  description: "Manage your BoothMagic account, plan, and settings.",
};

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const scoped: ScopedSession = { user: { id: session.user.id } };
  const [profile, credits, creditPacks, enableGDriveSetting] = await Promise.all([
    getProfile(scoped),
    getBalance(scoped),
    prisma.creditPack.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    getSetting("enable_gdrive", undefined, "true"),
  ]);

  return (
    <AccountClient
      userId={session.user.id}
      email={session.user.email ?? ""}
      credits={credits}
      plan={session.user.plan ?? "TRIAL"}
      displayName={profile?.displayName ?? ""}
      companyName={profile?.companyName ?? ""}
      countdownSecs={profile?.countdownSecs ?? 3}
      logoUrl={profile?.logoUrl ?? null}
      boothPin={profile?.boothPin ?? "0000"}
      isGDriveConnected={!!profile?.gdriveRefreshToken}
      drive_folder_link={profile?.drive_folder_link ?? null}
      drive_folder_id={profile?.drive_folder_id ?? null}
      drive_enabled={profile?.drive_enabled ?? false}
      features={session.user.features}
      creditPacks={JSON.parse(JSON.stringify(creditPacks))}
      isGDriveAllowedByAdmin={enableGDriveSetting === "true"}
    />
  );
}




import { prisma } from "@/lib/prisma";

export const DEFAULT_PLANS = [
  {
    name: "STARTER",
    label: "Starter",
    priceInr: 799,
    credits: 54,
    features: [
      "~18 AI photos/month",
      "Indian + Universal System Presets",
      "Basic Operator Dashboard",
      "Watermark on output image",
      "Email support",
    ],
    hasCustomPresets: false,
    hasCustomLogo: false,
    hasNoWatermark: false,
    hasCsvReports: false,
    hasAttendantPin: false,
  },
  {
    name: "PRO",
    label: "Pro",
    priceInr: 1599,
    credits: 120,
    features: [
      "~40 AI photos/month",
      "Custom style presets (create own prompts)",
      "Live slideshow public page",
      "Watermark on output image",
      "Print support (4x6 layout)",
      "Attendant PIN lock settings",
    ],
    hasCustomPresets: true,
    hasCustomLogo: false,
    hasNoWatermark: false,
    hasCsvReports: false,
    hasAttendantPin: true,
  },
  {
    name: "BUSINESS",
    label: "Business",
    priceInr: 2999,
    credits: 240,
    features: [
      "~80 AI photos/month",
      "NO brand watermark (White-label)",
      "Custom operator logo overlay",
      "CSV usage reports export",
      "Priority WhatsApp support",
    ],
    hasCustomPresets: true,
    hasCustomLogo: true,
    hasNoWatermark: true,
    hasCsvReports: true,
    hasAttendantPin: true,
  },
];

/**
 * Loads billing plans from the database.
 * If empty, seeds the default plans automatically.
 */
export async function getOrSeedBillingPlans() {
  try {
    let plans = await prisma.billingPlan.findMany({
      orderBy: { priceInr: "asc" },
    });

    if (plans.length === 0) {
      await Promise.all(
        DEFAULT_PLANS.map((plan) =>
          prisma.billingPlan.create({
            data: plan,
          })
        )
      );
      plans = await prisma.billingPlan.findMany({
        orderBy: { priceInr: "asc" },
      });
    }

    return plans;
  } catch (e) {
    console.error("Error loading/seeding billing plans:", e);
    // Return mock fallback to prevent crash during builds/migrations
    return DEFAULT_PLANS.map((p, index) => ({
      id: `fallback-${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      ...p,
    }));
  }
}

/**
 * Gating utility to check if a plan has a specific system feature unlocked.
 */
export async function hasFeature(
  userPlan: string,
  featureName: "hasCustomPresets" | "hasCustomLogo" | "hasNoWatermark" | "hasCsvReports" | "hasAttendantPin"
): Promise<boolean> {
  const normalized = (userPlan || "TRIAL").toUpperCase();
  if (normalized === "TRIAL") return false;

  try {
    const planDetails = await prisma.billingPlan.findUnique({
      where: { name: normalized }
    });

    if (planDetails) {
      return planDetails[featureName] ?? false;
    }
  } catch (e) {
    console.error(`Error fetching feature ${featureName} for plan ${userPlan}:`, e);
  }

  // Code fallback for safety / default plans in case of DB lookup issues
  if (normalized === "STARTER") {
    return false;
  }
  if (normalized === "PRO") {
    return featureName === "hasCustomPresets" || featureName === "hasAttendantPin";
  }
  if (normalized === "BUSINESS") {
    return true;
  }
  return false;
}

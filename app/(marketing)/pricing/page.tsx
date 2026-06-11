import type { Metadata } from "next";
import { auth } from "@/auth";
import PricingClient from "./PricingClient";
import { getOrSeedBillingPlans } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing | BoothMagic",
  description: "Simple, rupee-billed pricing for Indian event operators. Start with 9 free credits.",
};

export default async function PricingPage() {
  const session = await auth();
  const plans = await getOrSeedBillingPlans();

  return (
    <main className="min-h-screen px-6 py-24" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="mb-4" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif", fontSize: 36, fontWeight: 700, color: "var(--text)" }}>
            Simple, Honest Pricing
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 16 }}>
            Pay in ₹. Cancel anytime. All plans include a 9-credit free trial.
          </p>
        </div>

        <PricingClient
          userEmail={session?.user?.email ?? null}
          currentPlan={session?.user?.plan ?? null}
          initialPlans={JSON.parse(JSON.stringify(plans))}
        />
      </div>
    </main>
  );
}

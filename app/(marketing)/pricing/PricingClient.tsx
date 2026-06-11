"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userEmail: string | null;
  currentPlan: string | null;
}

const PLANS = [
  {
    id: "STARTER",
    name: "Starter",
    price: "₹799",
    billing: "month",
    credits: "54 monthly credits",
    features: [
      "~18 AI photos/month",
      "Indian + Universal System Presets",
      "Basic Operator Dashboard",
      "Watermark on output image",
      "Email support",
    ],
    highlight: false,
    cta: "Get Starter",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "₹1,599",
    billing: "month",
    credits: "120 monthly credits",
    features: [
      "~40 AI photos/month",
      "Custom style presets (create own prompts)",
      "Live slideshow public page",
      "Watermark on output image",
      "Print support (4x6 layout)",
      "Attendant PIN lock settings",
    ],
    highlight: true,
    cta: "Go Pro",
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: "₹2,999",
    billing: "month",
    credits: "240 monthly credits",
    features: [
      "~80 AI photos/month",
      "NO brand watermark (White-label)",
      "Custom operator logo overlay",
      "CSV usage reports export",
      "Priority WhatsApp support",
    ],
    highlight: false,
    cta: "Get Business",
  },
];

export default function PricingClient({ userEmail, currentPlan }: Props) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  async function handleCheckout(planId: string) {
    if (!userEmail) {
      router.push(`/login?callbackUrl=/pricing`);
      return;
    }

    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", plan: planId }),
      });

      if (!res.ok) {
        alert("Failed to initiate checkout");
        return;
      }

      const data = await res.json();

      if (data.mock) {
        // Mock webhook execution for testing without real Razorpay setup
        const mockWebhookRes = await fetch("/api/razorpay/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "subscription.charged",
            payload: {
              subscription: {
                entity: {
                  id: data.subscriptionId,
                  plan_id: data.plan,
                  status: "active",
                  current_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                  notes: {
                    userId: data.userId,
                    plan: data.plan,
                  },
                },
              },
            },
          }),
        });

        if (mockWebhookRes.ok) {
          alert(`Mock subscription activated! Starter/Pro/Business credits granted.`);
          router.push("/dashboard");
          router.refresh();
        } else {
          alert("Mock checkout failed.");
        }
      } else {
        const isScriptLoaded = await loadRazorpayScript();
        if (!isScriptLoaded) {
          alert("Razorpay Checkout failed to load. Check your internet connection.");
          return;
        }

        const options = {
          key: data.keyId,
          subscription_id: data.subscriptionId,
          name: "BoothMagic AI",
          description: `Subscribe to ${planId} Plan`,
          handler: function () {
            alert("Payment successful! Your credits will land in a few moments.");
            router.push("/dashboard");
            router.refresh();
          },
          prefill: {
            email: userEmail,
          },
          theme: {
            color: "#7C5CFF",
          },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong during checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "var(--space-6)",
        alignItems: "stretch",
        marginTop: "var(--space-8)",
      }}
    >
      {PLANS.map((plan) => {
        const isActive = currentPlan === plan.id;
        return (
          <div
            key={plan.id}
            className={`card ${plan.highlight ? "card-active" : ""}`}
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              justifyContent: "space-between",
              padding: "var(--space-8)",
              border: plan.highlight ? "2px solid var(--primary)" : "1px solid var(--border)",
              transform: plan.highlight ? "scale(1.02)" : "none",
            }}
          >
            {plan.highlight && (
              <span
                style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--gradient-primary)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: 999,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Most Popular
              </span>
            )}
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{plan.name}</h3>
              <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text)" }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 4 }}>/{plan.billing}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, marginBottom: 20 }}>
                ⚡ {plan.credits}
              </div>

              <hr style={{ border: 0, borderTop: "1px solid var(--border)", marginBottom: 20 }} />

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((feature, i) => (
                  <li key={i} style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 8, alignItems: "start" }}>
                    <span style={{ color: feature.startsWith("NO") ? "var(--success)" : "var(--primary)", fontWeight: 600 }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={isActive || loadingPlan !== null}
              className={`btn ${plan.highlight ? "btn-primary" : "btn-secondary"}`}
              style={{ width: "100%", marginTop: "auto" }}
            >
              {isActive ? "Current Plan" : loadingPlan === plan.id ? "Connecting..." : plan.cta}
            </button>
          </div>
        );
      })}
    </div>
  );
}

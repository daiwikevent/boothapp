"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userEmail: string | null;
  currentPlan: string | null;
  initialPlans: {
    id: string;
    name: string;
    label: string;
    priceInr: number;
    credits: number;
    features: string[];
    isActive: boolean;
  }[];
}

export default function PricingClient({ userEmail, currentPlan, initialPlans }: Props) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const plans = (initialPlans || []).filter(p => p.isActive);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  async function handleCheckout(planName: string) {
    if (!userEmail) {
      router.push(`/signup?callbackUrl=/pricing`);
      return;
    }

    setLoadingPlan(planName);
    try {
      const res = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", plan: planName }),
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
            event: "payment.captured",
            payload: {
              payment: {
                entity: {
                  id: data.orderId,
                  amount: data.amount,
                  status: "captured",
                  notes: {
                    userId: data.userId,
                    plan: data.plan,
                    planCredits: data.credits.toString(),
                    type: "subscription"
                  }
                }
              }
            }
          }),
        });

        if (mockWebhookRes.ok) {
          alert(`Mock subscription activated! Credits and plan features granted.`);
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
          amount: data.amount,
          currency: "INR",
          name: "BoothMagic AI",
          description: `Subscribe to ${planName} Plan`,
          order_id: data.orderId,
          handler: function () {
            alert("Payment successful! Your plan has been upgraded and credits added.");
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
      {plans.map((plan) => {
        const isActive = currentPlan?.toUpperCase() === plan.name.toUpperCase();
        const isHighlighted = plan.name === "PRO";
        return (
          <div
            key={plan.id}
            className={`card ${isHighlighted ? "card-active" : ""}`}
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              justifyContent: "space-between",
              padding: "var(--space-8)",
              border: isHighlighted ? "2px solid var(--primary)" : "1px solid var(--border)",
              transform: isHighlighted ? "scale(1.02)" : "none",
            }}
          >
            {isHighlighted && (
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
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{plan.label}</h3>
              <div style={{ display: "flex", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text)" }}>
                  ₹{plan.priceInr.toLocaleString("en-IN")}
                </span>
                <span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 4 }}>/month</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, marginBottom: 20 }}>
                ⚡ {plan.credits} monthly credits
              </div>

              <hr style={{ border: 0, borderTop: "1px solid var(--border)", marginBottom: 20 }} />

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((feature, i) => (
                  <li key={i} style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", gap: 8, alignItems: "start" }}>
                    <span style={{ color: feature.toUpperCase().startsWith("NO") ? "var(--success)" : "var(--primary)", fontWeight: 600 }}>✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleCheckout(plan.name)}
              disabled={isActive || loadingPlan !== null}
              className={`btn ${isHighlighted ? "btn-primary" : "btn-secondary"}`}
              style={{ width: "100%", marginTop: "auto" }}
            >
              {isActive ? "Current Plan" : loadingPlan === plan.name ? "Connecting..." : `Get ${plan.label}`}
            </button>
          </div>
        );
      })}
    </div>
  );
}

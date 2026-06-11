import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { Plan } from "@prisma/client";
import { getSetting } from "@/lib/app-settings";

// Map for Top-up Packs: [credits, price in paise]
const TOPUP_PACKS = [
  { credits: 120, price: 199900 },
  { credits: 360, price: 499900 },
  { credits: 700, price: 799900 },
  { credits: 1500, price: 1499900 },
];

// Map for Subscriptions: plan -> price in paise
const SUBSCRIPTION_PLANS: Record<Plan, { price: number; name: string }> = {
  TRIAL: { price: 0, name: "Trial" },
  STARTER: { price: 79900, name: "Starter" },
  PRO: { price: 159900, name: "Pro" },
  BUSINESS: { price: 299900, name: "Business" },
};

export async function POST(req: NextRequest) {
  const KEY_ID = await getSetting("razorpay_key_id", "RAZORPAY_KEY_ID");
  const KEY_SECRET = await getSetting("razorpay_key_secret", "RAZORPAY_KEY_SECRET");

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const data = await req.json();
  const { type, packIndex, plan } = data; // type: "topup" | "subscription"

  const isMock = !KEY_ID || !KEY_SECRET || KEY_ID === "mock" || KEY_SECRET === "mock";

  if (type === "topup") {
    const pack = TOPUP_PACKS[packIndex];
    if (!pack) {
      return NextResponse.json({ error: "Invalid pack index" }, { status: 400 });
    }

    if (isMock) {
      return NextResponse.json({
        mock: true,
        orderId: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
        amount: pack.price,
        credits: pack.credits,
        userId,
      });
    }

    // Call Razorpay Orders API
    try {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
        },
        body: JSON.stringify({
          amount: pack.price,
          currency: "INR",
          receipt: `topup_${userId}_${Date.now()}`,
          notes: {
            userId,
            packCredits: pack.credits.toString(),
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Razorpay order creation failed:", errorData);
        return NextResponse.json({ error: "Razorpay order creation failed" }, { status: 500 });
      }

      const order = await res.json();
      return NextResponse.json({
        mock: false,
        keyId: KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Razorpay connection error" }, { status: 500 });
    }
  }

  if (type === "subscription") {
    const planId = (plan as string).toUpperCase() as Plan;
    const planConfig = SUBSCRIPTION_PLANS[planId];
    if (!planConfig || planId === "TRIAL") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (isMock) {
      return NextResponse.json({
        mock: true,
        subscriptionId: `sub_mock_${Math.random().toString(36).substring(2, 11)}`,
        plan: planId,
        amount: planConfig.price,
        userId,
      });
    }

    // Find custom Razorpay plan ID from env variables
    const razorpayPlanKey = `RAZORPAY_PLAN_${planId}`;
    const razorpayPlanId = process.env[razorpayPlanKey];

    if (!razorpayPlanId) {
      return NextResponse.json(
        { error: `Razorpay plan ID for ${planId} (${razorpayPlanKey}) is not configured on the server.` },
        { status: 500 }
      );
    }

    // Call Razorpay Subscriptions API
    try {
      const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
        },
        body: JSON.stringify({
          plan_id: razorpayPlanId,
          total_count: 12,
          quantity: 1,
          notes: {
            userId,
            plan: planId,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Razorpay subscription creation failed:", errorData);
        return NextResponse.json({ error: "Razorpay subscription creation failed" }, { status: 500 });
      }

      const subscription = await res.json();
      return NextResponse.json({
        mock: false,
        keyId: KEY_ID,
        subscriptionId: subscription.id,
      });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: "Razorpay connection error" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
}

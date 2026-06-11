import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

// Map for Top-up Packs: [credits, price in paise]
const TOPUP_PACKS = [
  { credits: 120, price: 199900 },
  { credits: 360, price: 499900 },
  { credits: 700, price: 799900 },
  { credits: 1500, price: 1499900 },
];

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
    const planName = (plan as string).toUpperCase();
    if (planName === "TRIAL") {
      return NextResponse.json({ error: "Cannot subscribe to TRIAL plan" }, { status: 400 });
    }

    const bp = await prisma.billingPlan.findUnique({
      where: { name: planName }
    });
    if (!bp || !bp.isActive) {
      return NextResponse.json({ error: "Invalid or inactive plan" }, { status: 400 });
    }

    const amountPaise = bp.priceInr * 100;

    if (isMock) {
      return NextResponse.json({
        mock: true,
        orderId: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
        plan: bp.name,
        amount: amountPaise,
        credits: bp.credits,
        userId,
      });
    }

    // Call Razorpay Orders API for dynamic plans
    try {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `sub_${userId}_${Date.now()}`,
          notes: {
            userId,
            plan: bp.name,
            planCredits: bp.credits.toString(),
            type: "subscription",
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

  return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
}

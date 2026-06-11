import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getSetting } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const KEY_ID = await getSetting("razorpay_key_id", "RAZORPAY_KEY_ID");
  const KEY_SECRET = await getSetting("razorpay_key_secret", "RAZORPAY_KEY_SECRET");

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const data = await req.json();
  const { type, packId, plan } = data; // type: "topup" | "subscription"

  const isMock = !KEY_ID || !KEY_SECRET || KEY_ID === "mock" || KEY_SECRET === "mock";

  if (type === "topup") {
    // Look up credit pack from DB
    const pack = packId ? await prisma.creditPack.findUnique({ where: { id: packId } }) : null;
    if (!pack || !pack.isActive) {
      return NextResponse.json({ error: "Invalid or inactive credit pack" }, { status: 400 });
    }

    const amountPaise = pack.priceInr * 100;

    if (isMock) {
      return NextResponse.json({
        mock: true,
        orderId: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
        amount: amountPaise,
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
          amount: amountPaise,
          currency: "INR",
          receipt: `top_${userId.slice(-8)}_${Date.now()}`.slice(0, 40),
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
    console.log("[checkout] subscription request for plan:", planName, "userId:", userId);
    if (planName === "TRIAL") {
      return NextResponse.json({ error: "Cannot subscribe to TRIAL plan" }, { status: 400 });
    }

    let bp;
    try {
      bp = await prisma.billingPlan.findUnique({
        where: { name: planName }
      });
      console.log("[checkout] billingPlan lookup result:", bp ? `found (${bp.name}, ₹${bp.priceInr})` : "NOT FOUND");
    } catch (dbErr) {
      console.error("[checkout] DB error looking up billingPlan:", dbErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    if (!bp || !bp.isActive) {
      return NextResponse.json({ error: "Invalid or inactive plan" }, { status: 400 });
    }

    const amountPaise = bp.priceInr * 100;

    if (isMock) {
      console.log("[checkout] MOCK mode — returning mock order");
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
    console.log("[checkout] Calling Razorpay Orders API, keyId:", KEY_ID?.slice(0, 12) + "...", "amount:", amountPaise);
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
          receipt: `sub_${userId.slice(-8)}_${Date.now()}`.slice(0, 40),
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
        console.error("[checkout] Razorpay order creation failed:", JSON.stringify(errorData));
        return NextResponse.json({ error: "Razorpay order creation failed" }, { status: 500 });
      }

      const order = await res.json();
      console.log("[checkout] Razorpay order created:", order.id);
      return NextResponse.json({
        mock: false,
        keyId: KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        plan: bp.name,
        credits: bp.credits,
      });
    } catch (e) {
      console.error("[checkout] Razorpay connection error:", e);
      return NextResponse.json({ error: "Razorpay connection error" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
}

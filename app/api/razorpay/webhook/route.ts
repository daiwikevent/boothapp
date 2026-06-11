import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { getSetting } from "@/lib/app-settings";

export async function POST(req: NextRequest) {
  const RAZORPAY_WEBHOOK_SECRET = await getSetting("razorpay_webhook_secret", "RAZORPAY_WEBHOOK_SECRET");
  const bodyText = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  // Verify signature if secret is configured
  if (RAZORPAY_WEBHOOK_SECRET) {
    if (!signature || !verifyWebhookSignature(bodyText, signature, RAZORPAY_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Webhook secret missing in production" }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = event.event;
  const payload = event.payload;

  if (eventType === "payment.captured") {
    const payment = payload.payment.entity;
    const paymentId = payment.id;
    const amountInr = payment.amount; // in paise
    const notes = payment.notes || {};
    const userId = notes.userId;

    if (!userId) {
      console.warn("Webhook payment.captured: userId missing in notes", notes);
      return NextResponse.json({ ok: true, message: "Ignored due to missing userId" });
    }

    const isSubscription = notes.type === "subscription" || !!notes.plan;

    if (isSubscription) {
      const planName = (notes.plan || "STARTER").toUpperCase();
      const creditsGranted = notes.planCredits ? parseInt(notes.planCredits) : 54;

      try {
        // 1. Grant credits
        const ledgerRow = await grantCredits(userId, creditsGranted, "SUBSCRIPTION_GRANT", paymentId);

        // 2. Create Payment row
        if (ledgerRow) {
          await prisma.payment.create({
            data: {
              userId,
              razorpayPaymentId: paymentId,
              amountInr,
              creditsGranted,
              type: "SUBSCRIPTION",
            },
          });
        }

        // 3. Update User's active plan
        await prisma.user.update({
          where: { id: userId },
          data: { plan: planName },
        });

        // 4. Upsert Subscription row
        await prisma.subscription.upsert({
          where: { razorpaySubId: `sub_order_${paymentId}` },
          create: {
            userId,
            razorpaySubId: `sub_order_${paymentId}`,
            plan: planName,
            status: "active",
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          update: {
            status: "active",
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        return NextResponse.json({ ok: true, received: true });
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "P2002") {
          return NextResponse.json({ ok: true, message: "Duplicate subscription charge" });
        }
        console.error("Webhook processing failed:", e);
        return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
      }
    } else {
      // Standard credit top-up pack
      const creditsGranted = notes.packCredits ? parseInt(notes.packCredits) : 0;
      if (!creditsGranted) {
        console.warn("Webhook payment.captured: packCredits missing in notes", notes);
        return NextResponse.json({ ok: true, message: "Ignored due to missing credits" });
      }

      try {
        // 1. Grant credits
        const ledgerRow = await grantCredits(userId, creditsGranted, "TOPUP", paymentId);
        
        // 2. Create Payment row
        if (ledgerRow) {
          await prisma.payment.create({
            data: {
              userId,
              razorpayPaymentId: paymentId,
              amountInr,
              creditsGranted,
              type: "TOPUP",
            },
          });
        }

        return NextResponse.json({ ok: true, received: true });
      } catch (e: unknown) {
        const err = e as { code?: string };
        // Handle unique constraint violations gracefully (duplicate webhooks)
        if (err.code === "P2002") {
          return NextResponse.json({ ok: true, message: "Duplicate event already processed" });
        }
        console.error("Webhook processing failed:", e);
        return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
      }
    }
  }

  if (eventType === "subscription.charged") {
    const subscription = payload.subscription.entity;
    const payment = payload.payment?.entity;
    const subId = subscription.id;
    const paymentId = payment?.id ?? `sub-charge-${subId}-${Date.now()}`;
    const amountInr = payment?.amount ?? 0;
    const planName = (subscription.notes?.plan ?? "STARTER").toUpperCase();
    const userId = subscription.notes?.userId;

    if (!userId) {
      console.warn("Webhook subscription.charged: userId missing in notes");
      return NextResponse.json({ ok: true, message: "Ignored due to missing userId" });
    }

    // Dynamic credits lookup
    let creditsGranted = 0;
    try {
      const bp = await prisma.billingPlan.findUnique({ where: { name: planName } });
      if (bp) {
        creditsGranted = bp.credits;
      } else {
        const fallbackMap: Record<string, number> = {
          STARTER: 54,
          PRO: 120,
          BUSINESS: 240,
          TRIAL: 0,
        };
        creditsGranted = fallbackMap[planName] ?? 0;
      }
    } catch {
      creditsGranted = 54;
    }

    try {
      // 1. Grant credits
      const ledgerRow = await grantCredits(userId, creditsGranted, "SUBSCRIPTION_GRANT", paymentId);

      // 2. Upsert Subscription row
      await prisma.subscription.upsert({
        where: { razorpaySubId: subId },
        create: {
          userId,
          razorpaySubId: subId,
          plan: planName,
          status: "active",
          currentPeriodEnd: new Date(subscription.current_end * 1000),
        },
        update: {
          status: "active",
          currentPeriodEnd: new Date(subscription.current_end * 1000),
        },
      });

      // 3. Update User's active plan
      await prisma.user.update({
        where: { id: userId },
        data: { plan: planName },
      });

      // 4. Create Payment row
      if (ledgerRow && payment?.id) {
        await prisma.payment.create({
          data: {
            userId,
            razorpayPaymentId: paymentId,
            amountInr,
            creditsGranted,
            type: "SUBSCRIPTION",
          },
        });
      }

      return NextResponse.json({ ok: true, received: true });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "P2002") {
        return NextResponse.json({ ok: true, message: "Duplicate subscription charge" });
      }
      console.error("Webhook processing failed:", e);
      return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
    }
  }

  if (eventType === "subscription.cancelled") {
    const subscription = payload.subscription.entity;
    const subId = subscription.id;

    try {
      // Mark subscription as cancelled in DB
      await prisma.subscription.update({
        where: { razorpaySubId: subId },
        data: { status: "cancelled" },
      });

      return NextResponse.json({ ok: true, received: true });
    } catch (e) {
      console.error("Webhook subscription.cancelled failed:", e);
      return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, message: "Unhandled event type" });
}

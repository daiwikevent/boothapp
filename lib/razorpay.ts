/**
 * lib/razorpay.ts
 * Razorpay webhook signature verification (server-side only).
 */

import crypto from "crypto";

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return false;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

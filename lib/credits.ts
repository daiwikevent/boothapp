/**
 * lib/credits.ts
 *
 * MANDATORY CREDIT LEDGER — all credit changes go through here.
 * Rule: AGENTS.md rule 3 + docs/06-Self-Hosted-Architecture-and-Deployment.md §3
 *
 * ─── Credit model ────────────────────────────────────────────────────────────
 * credit_ledger is append-only. Balance = SUM(delta).
 * Never store a mutable balance field — always compute from the ledger.
 *
 * ─── Atomic spend algorithm (doc 06 §3) ─────────────────────────────────────
 * 1. `SELECT pg_advisory_xact_lock(hashtext(userId))` — per-user exclusive lock
 * 2. SUM(delta) for user → if < CREDITS_PER_PHOTO, throw 402
 * 3. INSERT -3 row + photo row 'processing' inside the same transaction → commit
 *
 * This prevents concurrent double-spend even with two booth tablets on one account.
 */

import { prisma } from "@/lib/prisma";
import type { CreditLedger } from "@prisma/client";

export const CREDITS_PER_PHOTO = 3;
export const CREDITS_PER_VIDEO = 12;
export const TRIAL_GRANT_CREDITS = 9;

// ─── Balance ─────────────────────────────────────────────────────────────────

/** Get the current credit balance for a userId (server-internal only). */
export async function getBalance(userId: string): Promise<number> {
  const result = await prisma.creditLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

// ─── Atomic spend ─────────────────────────────────────────────────────────────

/**
 * Atomically deduct CREDITS_PER_PHOTO credits for a photo.
 * Uses Postgres advisory lock to prevent concurrent double-spend.
 *
 * @param userId   — the operator's user id (from server session, never from client)
 * @param photoId  — the photo row id to reference in the ledger
 * @throws { status: 402, message: "Insufficient credits" } if balance < 3
 */
export async function spendPhotoCredits(
  userId: string,
  photoId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Per-user advisory lock — hashtext maps a string to a stable int32
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

    // 2. Compute current balance within the lock
    const result = await tx.creditLedger.aggregate({
      where: { userId },
      _sum: { delta: true },
    });
    const balance = result._sum.delta ?? 0;

    if (balance < CREDITS_PER_PHOTO) {
      throw new InsufficientCreditsError(balance);
    }

    // 3. Insert spend row
    await tx.creditLedger.create({
      data: {
        userId,
        delta: -CREDITS_PER_PHOTO,
        reason: "PHOTO_SPEND",
        refId: photoId,
      },
    });
  });
}

/**
 * Atomically deduct CREDITS_PER_VIDEO credits for a video (v2 feature flag).
 */
export async function spendVideoCredits(
  userId: string,
  photoId: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

    const result = await tx.creditLedger.aggregate({
      where: { userId },
      _sum: { delta: true },
    });
    const balance = result._sum.delta ?? 0;

    if (balance < CREDITS_PER_VIDEO) {
      throw new InsufficientCreditsError(balance);
    }

    await tx.creditLedger.create({
      data: {
        userId,
        delta: -CREDITS_PER_VIDEO,
        reason: "VIDEO_SPEND",
        refId: photoId,
      },
    });
  });
}

// ─── Refund ───────────────────────────────────────────────────────────────────

/**
 * Refund credits after a generation failure.
 * Inserts a +CREDITS_PER_PHOTO row with reason 'REFUND'.
 * Called in the catch block of /api/generate after marking the photo FAILED.
 */
export async function refundPhotoCredits(
  userId: string,
  photoId: string
): Promise<CreditLedger> {
  return prisma.creditLedger.create({
    data: {
      userId,
      delta: CREDITS_PER_PHOTO,
      reason: "REFUND",
      refId: photoId,
    },
  });
}

// ─── Grant ────────────────────────────────────────────────────────────────────

/**
 * Grant credits (trial signup, subscription charge, topup).
 * Idempotent: if refId (razorpayPaymentId) already exists, does nothing.
 *
 * @param userId  — operator id (from server session or verified webhook payload)
 * @param delta   — positive integer (credits to add)
 * @param reason  — ledger reason
 * @param refId   — idempotency key (razorpayPaymentId, subscriptionId, or 'trial')
 */
export async function grantCredits(
  userId: string,
  delta: number,
  reason: "TRIAL_GRANT" | "SUBSCRIPTION_GRANT" | "TOPUP",
  refId?: string
): Promise<CreditLedger | null> {
  if (delta <= 0) throw new Error("delta must be positive");

  // Idempotency check — if this refId was already processed, skip
  if (refId) {
    const existing = await prisma.creditLedger.findFirst({
      where: { userId, refId, reason },
    });
    if (existing) return null; // already granted
  }

  return prisma.creditLedger.create({
    data: { userId, delta, reason, refId },
  });
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class InsufficientCreditsError extends Error {
  status = 402;
  balance: number;

  constructor(currentBalance: number) {
    super(`Insufficient credits: balance is ${currentBalance}, need ${CREDITS_PER_PHOTO}`);
    this.name = "InsufficientCreditsError";
    this.balance = currentBalance;
  }
}

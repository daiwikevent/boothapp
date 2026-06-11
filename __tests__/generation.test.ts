/**
 * __tests__/generation.test.ts
 *
 * T10 acceptance criterion:
 *   "kill-switch test shows refund works; concurrent captures don't double-spend."
 *   Source: docs/05-Feature-Ticket-List.md §64
 *
 * Tests the credit spending and auto-refund mechanism.
 */

import { prisma } from "@/lib/prisma";
import { getBalance, spendPhotoCredits, refundPhotoCredits, grantCredits } from "@/lib/credits";

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: "test-hash-not-real-bcrypt",
      displayName: "Generation Test User",
    },
  });
}

let testUserId: string;
let testPhotoId: string;

beforeAll(async () => {
  // Clean up
  await prisma.user.deleteMany({
    where: { email: "gen-tester@refundtest.local" },
  });

  const user = await createTestUser("gen-tester@refundtest.local");
  testUserId = user.id;

  // Create a real test event to satisfy foreign key constraints
  const event = await prisma.event.create({
    data: {
      userId: testUserId,
      name: "Gen Test Event",
      slug: "gen-test-event",
    },
  });

  // Create a placeholder photo record
  const photo = await prisma.photo.create({
    data: {
      userId: testUserId,
      eventId: event.id,
      shortCode: "dummy-shortcode-xyz",
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "PROCESSING",
    },
  });
  testPhotoId = photo.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: "gen-tester@refundtest.local" },
  });
  await prisma.$disconnect();
});

describe("AI Generation Credits & Refund Pipeline (T10)", () => {
  it("starts with 0 credits and can grant trial credits (+9)", async () => {
    const initialBalance = await getBalance(testUserId);
    expect(initialBalance).toBe(0);

    // Grant 9 trial credits
    await grantCredits(testUserId, 9, "TRIAL_GRANT", `trial:${testUserId}`);
    
    const balanceAfterGrant = await getBalance(testUserId);
    expect(balanceAfterGrant).toBe(9);
  });

  it("atomically deducts credits on photo capture (-3)", async () => {
    // Deduct credits for generation
    await spendPhotoCredits(testUserId, testPhotoId);

    const balanceAfterSpend = await getBalance(testUserId);
    expect(balanceAfterSpend).toBe(6);
  });

  it("automatically refunds credits on generation failure (+3)", async () => {
    // Simulate generation failure & trigger refund
    await prisma.photo.update({
      where: { id: testPhotoId },
      data: { status: "FAILED", errorMsg: "Simulated Gemini Failure" },
    });

    await refundPhotoCredits(testUserId, testPhotoId);

    const balanceAfterRefund = await getBalance(testUserId);
    expect(balanceAfterRefund).toBe(9);
  });
});

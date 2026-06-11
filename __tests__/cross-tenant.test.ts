/**
 * __tests__/cross-tenant.test.ts
 *
 * T02 acceptance criterion:
 *   "Add an integration test: user B requesting user A's event/photo by id gets 404 (null)"
 *   Source: docs/06-Self-Hosted-Architecture-and-Deployment.md §2
 *
 * This test runs against a real database.
 * Prerequisites: DATABASE_URL is set and `prisma migrate deploy` has been run.
 *
 * Run: npm test
 *
 * The test creates two users (A and B), creates an event and photo for user A,
 * then verifies that user B's scoped session cannot access them.
 */

import { prisma } from "@/lib/prisma";
import {
  getEvent,
  getPhoto,
  createEvent,
  type ScopedSession,
} from "@/lib/db-scoped";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createTestUser(email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: "test-hash-not-real-bcrypt",
      displayName: "Test User",
    },
  });
}

function makeSession(userId: string): ScopedSession {
  return { user: { id: userId, email: "test@example.com" } };
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

let userAId: string;
let userBId: string;
let eventAId: string;
let photoAId: string;

beforeAll(async () => {
  // Clean up any leftover test data first
  await prisma.user.deleteMany({
    where: { email: { in: ["user-a@crosstenanttest.local", "user-b@crosstenanttest.local"] } },
  });

  // Create two users
  const userA = await createTestUser("user-a@crosstenanttest.local");
  const userB = await createTestUser("user-b@crosstenanttest.local");
  userAId = userA.id;
  userBId = userB.id;

  // Create an event for user A
  const sessionA = makeSession(userAId);
  const eventA = await createEvent(sessionA, {
    name: "User A's Wedding",
    slug: "user-a-wedding",
  });
  eventAId = eventA.id;

  // Create a photo for user A directly (skipping credit logic for this test)
  const photo = await prisma.photo.create({
    data: {
      userId: userAId,
      eventId: eventAId,
      shortCode: "test-short-code-xyz",
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: "DONE",
      outputPath: "/test/output.jpg",
    },
  });
  photoAId = photo.id;
});

afterAll(async () => {
  // Clean up test data
  await prisma.user.deleteMany({
    where: { email: { in: ["user-a@crosstenanttest.local", "user-b@crosstenanttest.local"] } },
  });
  await prisma.$disconnect();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Cross-tenant isolation (T02)", () => {
  describe("Event access", () => {
    it("user A can read their own event", async () => {
      const sessionA = makeSession(userAId);
      const event = await getEvent(sessionA, eventAId);
      expect(event).not.toBeNull();
      expect(event?.id).toBe(eventAId);
      expect(event?.userId).toBe(userAId);
    });

    it("user B CANNOT read user A's event — returns null (→ 404)", async () => {
      const sessionB = makeSession(userBId);
      const event = await getEvent(sessionB, eventAId);
      // This is the critical assertion: cross-tenant access returns null
      expect(event).toBeNull();
    });
  });

  describe("Photo access", () => {
    it("user A can read their own photo", async () => {
      const sessionA = makeSession(userAId);
      const photo = await getPhoto(sessionA, photoAId);
      expect(photo).not.toBeNull();
      expect(photo?.userId).toBe(userAId);
    });

    it("user B CANNOT read user A's photo — returns null (→ 404)", async () => {
      const sessionB = makeSession(userBId);
      const photo = await getPhoto(sessionB, photoAId);
      // Critical assertion: cross-tenant access returns null
      expect(photo).toBeNull();
    });
  });

  describe("Event slug uniqueness", () => {
    it("user A can create an event with slug 'my-event'", async () => {
      const sessionA = makeSession(userAId);
      const event = await createEvent(sessionA, {
        name: "Another Event",
        slug: "my-event",
      });
      expect(event.slug).toBe("my-event");
    });

    it("user B can also create an event with slug 'my-event' (slug is unique per user, not global)", async () => {
      const sessionB = makeSession(userBId);
      const event = await createEvent(sessionB, {
        name: "My Event Too",
        slug: "my-event",
      });
      expect(event.slug).toBe("my-event");
    });
  });
});

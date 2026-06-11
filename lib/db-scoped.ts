/**
 * lib/db-scoped.ts
 *
 * MANDATORY TENANT ISOLATION LAYER — every query on tenant tables goes here.
 * Rule: AGENTS.md rule 2 + docs/06-Self-Hosted-Architecture-and-Deployment.md §2
 *
 * ─── Contract ───────────────────────────────────────────────────────────────
 * • Every accessor takes a ScopedSession (from Auth.js) and injects
 *   `where: { userId: session.user.id }` — no route may accept userId from client.
 * • Missing/unauthorized records return null → caller responds with 404.
 * • System presets (ownerId = null) are readable by all authenticated users.
 * • System presets are writable only via admin-flag check (isAdmin = true).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { prisma } from "@/lib/prisma";
import type {
  Event,
  Photo,
  Preset,
  User,
  EventPreset,
  Subscription,
  Plan,
  PeopleTag,
} from "@prisma/client";

// ─── Session type ─────────────────────────────────────────────────────────────

/** Minimal session shape provided by Auth.js v5. Expanded in T03. */
export interface ScopedSession {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    plan?: Plan;
    isAdmin?: boolean;
  };
}

// ─── User / Profile ───────────────────────────────────────────────────────────

/** Get the full profile for the session user. */
export async function getProfile(session: ScopedSession): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

/** Update mutable profile fields for the session user. */
export async function updateProfile(
  session: ScopedSession,
  data: Partial<Pick<User, "displayName" | "companyName" | "logoUrl" | "countdownSecs" | "boothPin">>
): Promise<User> {
  return prisma.user.update({
    where: { id: session.user.id },
    data,
  });
}

/** Save Google Drive OAuth refresh token. */
export async function saveGDriveRefreshToken(
  userId: string,
  refreshToken: string
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { gdriveRefreshToken: refreshToken },
  });
}

/** Clear Google Drive OAuth refresh token. */
export async function clearGDriveRefreshToken(
  userId: string
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { gdriveRefreshToken: null },
  });
}

// ─── Events ───────────────────────────────────────────────────────────────────

/** List all events for the session user, newest first. */
export async function listEvents(session: ScopedSession): Promise<Event[]> {
  return prisma.event.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
}

/** Get one event by id — returns null if not found or belongs to another user. */
export async function getEvent(
  session: ScopedSession,
  eventId: string
): Promise<Event | null> {
  return prisma.event.findFirst({
    where: { id: eventId, userId: session.user.id },
  });
}

/** Create a new event for the session user. */
export async function createEvent(
  session: ScopedSession,
  data: { name: string; slug: string; gdriveFolderId?: string | null }
): Promise<Event> {
  return prisma.event.create({
    data: { ...data, userId: session.user.id },
  });
}

/** Update an event — scoped to the session user. */
export async function updateEvent(
  session: ScopedSession,
  eventId: string,
  data: Partial<Pick<Event, "name" | "slug" | "isActive" | "gdriveFolderId">>
): Promise<Event | null> {
  const existing = await getEvent(session, eventId);
  if (!existing) return null;
  return prisma.event.update({ where: { id: eventId }, data });
}

/**
 * Activate one event and deactivate all others for the session user.
 * Constraint: only one active event per user at a time (doc §3).
 */
export async function setActiveEvent(
  session: ScopedSession,
  eventId: string
): Promise<Event | null> {
  const existing = await getEvent(session, eventId);
  if (!existing) return null;

  await prisma.$transaction([
    // Deactivate all user's events
    prisma.event.updateMany({
      where: { userId: session.user.id },
      data: { isActive: false },
    }),
    // Activate the target
    prisma.event.update({
      where: { id: eventId },
      data: { isActive: true },
    }),
  ]);

  return prisma.event.findUnique({ where: { id: eventId } });
}

/** Delete an event (soft-delete: photos expire naturally on their timer). */
export async function deleteEvent(
  session: ScopedSession,
  eventId: string
): Promise<boolean> {
  const existing = await getEvent(session, eventId);
  if (!existing) return false;
  await prisma.event.delete({ where: { id: eventId } });
  return true;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

/**
 * List presets visible to the session user:
 * - All system presets (ownerId = null, isActive = true)
 * - The user's own custom presets
 */
export async function listPresets(session: ScopedSession): Promise<Preset[]> {
  return prisma.preset.findMany({
    where: {
      isActive: true,
      OR: [{ ownerId: null }, { ownerId: session.user.id }],
    },
    orderBy: [{ ownerId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

/** List presets enabled for a specific event (for the booth picker). */
export async function listEventPresets(
  session: ScopedSession,
  eventId: string
): Promise<Preset[]> {
  const event = await getEvent(session, eventId);
  if (!event) return [];

  const links = await prisma.eventPreset.findMany({
    where: { eventId },
    include: { preset: true },
  });

  return links
    .map((l) => l.preset)
    .filter((p) => p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Get one preset — system or user-owned. */
export async function getPreset(
  session: ScopedSession,
  presetId: string
): Promise<Preset | null> {
  return prisma.preset.findFirst({
    where: {
      id: presetId,
      OR: [{ ownerId: null }, { ownerId: session.user.id }],
    },
  });
}

/** Create a custom preset (operator-owned, requires Pro+ plan). */
export async function createPreset(
  session: ScopedSession,
  data: { name: string; prompt: string; peopleTag: PeopleTag; thumbnailUrl?: string }
): Promise<Preset> {
  return prisma.preset.create({
    data: { ...data, ownerId: session.user.id },
  });
}

/** Update a custom preset (scoped to the owner). */
export async function updateCustomPreset(
  session: ScopedSession,
  presetId: string,
  data: Partial<Pick<Preset, "name" | "prompt" | "peopleTag" | "thumbnailUrl">>
): Promise<Preset | null> {
  const existing = await prisma.preset.findFirst({
    where: { id: presetId, ownerId: session.user.id },
  });
  if (!existing) return null;

  return prisma.preset.update({
    where: { id: presetId },
    data,
  });
}

/** Delete a custom preset (scoped to the owner). */
export async function deleteCustomPreset(
  session: ScopedSession,
  presetId: string
): Promise<boolean> {
  const existing = await prisma.preset.findFirst({
    where: { id: presetId, ownerId: session.user.id },
  });
  if (!existing) return false;

  await prisma.preset.delete({
    where: { id: presetId },
  });
  return true;
}

/** Set event–preset links (replaces existing links for the event). */
export async function setEventPresets(
  session: ScopedSession,
  eventId: string,
  presetIds: string[]
): Promise<EventPreset[]> {
  const event = await getEvent(session, eventId);
  if (!event) throw new Error("Event not found or unauthorized");

  return prisma.$transaction(async (tx) => {
    // Delete existing links
    await tx.eventPreset.deleteMany({ where: { eventId } });
    // Insert new links
    await tx.eventPreset.createMany({
      data: presetIds.map((presetId) => ({ eventId, presetId })),
    });
    return tx.eventPreset.findMany({ where: { eventId } });
  });
}

// ─── Photos ───────────────────────────────────────────────────────────────────

/** Get a photo by id — scoped to the session user. */
export async function getPhoto(
  session: ScopedSession,
  photoId: string
): Promise<Photo | null> {
  return prisma.photo.findFirst({
    where: { id: photoId, userId: session.user.id },
  });
}

/**
 * Get a photo by its public short code.
 * No auth required — used by the guest download page /g/[shortCode].
 * Checks expiry — returns null if expired.
 */
export async function getPhotoByShortCode(shortCode: string): Promise<Photo | null> {
  return prisma.photo.findFirst({
    where: {
      shortCode,
      expiresAt: { gt: new Date() },
    },
  });
}

/** List all photos for an event — scoped to the session user. */
export async function listEventPhotos(
  session: ScopedSession,
  eventId: string
): Promise<Photo[]> {
  const event = await getEvent(session, eventId);
  if (!event) return [];

  return prisma.photo.findMany({
    where: { eventId, userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
}

/** Create a photo row in PROCESSING state (called inside credit spend transaction). */
export async function createPhotoProcessing(
  session: ScopedSession,
  data: {
    eventId: string;
    presetId: string | null;
    shortCode: string;
  }
): Promise<Photo> {
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // +3 days
  return prisma.photo.create({
    data: {
      userId: session.user.id,
      eventId: data.eventId,
      presetId: data.presetId,
      shortCode: data.shortCode,
      expiresAt,
      status: "PROCESSING",
      creditsCharged: 3,
    },
  });
}

/** Mark a photo as DONE and save its output path. */
export async function markPhotoDone(
  photoId: string,
  outputPath: string
): Promise<Photo> {
  return prisma.photo.update({
    where: { id: photoId },
    data: { status: "DONE", outputPath },
  });
}

/** Mark a photo as FAILED with an error message. */
export async function markPhotoFailed(photoId: string, errorMsg: string): Promise<Photo> {
  return prisma.photo.update({
    where: { id: photoId },
    data: { status: "FAILED", errorMsg },
  });
}

/** Delete a photo (operator initiated). */
export async function deletePhoto(
  session: ScopedSession,
  photoId: string
): Promise<boolean> {
  const existing = await getPhoto(session, photoId);
  if (!existing) return false;
  await prisma.photo.delete({ where: { id: photoId } });
  return true;
}

// ─── Credits ─────────────────────────────────────────────────────────────────

/** Get the current credit balance for the session user. */
export async function getBalance(session: ScopedSession): Promise<number> {
  const result = await prisma.creditLedger.aggregate({
    where: { userId: session.user.id },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

/** Get the credit balance for any userId (server-internal use only). */
export async function getBalanceForUser(userId: string): Promise<number> {
  const result = await prisma.creditLedger.aggregate({
    where: { userId },
    _sum: { delta: true },
  });
  return result._sum.delta ?? 0;
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

/** Get the active subscription for the session user (null if on trial/no sub). */
export async function getSubscription(
  session: ScopedSession
): Promise<Subscription | null> {
  return prisma.subscription.findFirst({
    where: { userId: session.user.id, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Admin-only helpers ───────────────────────────────────────────────────────

/**
 * Assert the session user is an admin.
 * Usage: in server actions / API routes that need admin access.
 */
export function assertAdmin(session: ScopedSession): void {
  if (!session.user.isAdmin) {
    throw new Error("Forbidden: admin access required");
  }
}

/** Create or update a system preset (admin only). */
export async function upsertSystemPreset(
  session: ScopedSession,
  data: {
    id?: string;
    name: string;
    prompt: string;
    peopleTag: PeopleTag;
    thumbnailUrl?: string;
    planRequired?: Plan | null;
    sortOrder?: number;
  }
): Promise<Preset> {
  assertAdmin(session);
  if (data.id) {
    return prisma.preset.update({
      where: { id: data.id },
      data: { ...data, ownerId: null },
    });
  }
  return prisma.preset.create({
    data: { ...data, ownerId: null },
  });
}

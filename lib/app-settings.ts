/**
 * lib/app-settings.ts
 * Runtime accessor for admin-configurable app settings stored in app_settings table.
 *
 * Uses a 60-second in-process cache to avoid DB round-trips on every generation request.
 */

import { prisma } from "@/lib/prisma";

type SettingsCache = {
  data: Record<string, string>;
  fetchedAt: number;
};

let cache: SettingsCache | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

export async function getAppSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

  const rows = await prisma.appSetting.findMany();
  const data: Record<string, string> = {};
  for (const row of rows) data[row.key] = row.value;

  cache = { data, fetchedAt: now };
  return data;
}

/** Invalidate the cache (call after admin saves settings) */
export function invalidateSettingsCache() {
  cache = null;
}

/** Convenience: get a single setting, falling back to env var then defaultValue */
export async function getSetting(key: string, envFallback?: string, defaultValue = ""): Promise<string> {
  const settings = await getAppSettings();
  return settings[key] || (envFallback ? process.env[envFallback] ?? defaultValue : defaultValue);
}

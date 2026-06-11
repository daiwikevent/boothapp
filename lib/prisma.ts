/**
 * lib/prisma.ts
 * Prisma client singleton — prevents multiple instances in Next.js dev mode
 * (hot reload would otherwise exhaust the connection pool).
 *
 * Usage: import { prisma } from "@/lib/prisma"
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

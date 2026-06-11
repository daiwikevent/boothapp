import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Checks DB connectivity and returns service status.
 * Wired to UptimeRobot per doc 06 §8.
 *
 * DB check will be added in T02 once Prisma is set up.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.0.1",
      checks: {
        db: "pending — wired in T02",
        storage: "pending — wired in T10",
      },
    },
    { status: 200 }
  );
}

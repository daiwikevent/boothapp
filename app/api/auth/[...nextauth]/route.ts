/**
 * app/api/auth/[...nextauth]/route.ts
 * Auth.js v5 API route — handles all /api/auth/* requests.
 */

import { handlers } from "@/auth";

export const GET = handlers.GET;
export const POST = handlers.POST;

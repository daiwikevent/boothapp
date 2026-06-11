/**
 * middleware.ts
 * Route protection — Auth.js middleware checks JWT in the cookie.
 *
 * The `authorized` callback in auth.ts handles the actual redirect logic.
 * This file just re-exports the middleware and defines what paths to match.
 *
 * NOTE: This runs in Edge Runtime. bcryptjs is NOT used here — the
 * `authorized` callback only checks the JWT token existence, not passwords.
 */

export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Protected routes
    "/dashboard/:path*",
    "/events/:path*",
    "/presets/:path*",
    "/account/:path*",
    "/booth/:path*",
  ],
};

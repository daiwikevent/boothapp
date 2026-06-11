/**
 * auth.ts
 * Auth.js v5 (NextAuth) configuration — Credentials provider, bcrypt, JWT sessions.
 *
 * Doc ref: docs/06-Self-Hosted-Architecture-and-Deployment.md §1
 * Stack:   Auth.js v5 Credentials provider
 * Session: JWT cookie, 30-day maxAge (booth tablet stays logged in through long events)
 *
 * ─── Flow ────────────────────────────────────────────────────────────────────
 * 1. User signs up via /api/auth/signup → password bcrypt-hashed → user row created
 * 2. User logs in via Credentials provider → bcrypt.compare → JWT issued
 * 3. On first verified login → +9 TRIAL_GRANT credit row inserted
 * 4. JWT callback attaches user.id, plan, isAdmin to the token
 * 5. Session callback exposes these on session.user
 * ─────────────────────────────────────────────────────────────────────────────
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { grantCredits, TRIAL_GRANT_CREDITS } from "@/lib/credits";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Grant trial credits on first login (idempotent — won't double-grant)
        await grantCredits(
          user.id,
          TRIAL_GRANT_CREDITS,
          "TRIAL_GRANT",
          `trial:${user.id}`
        );

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days — booth tablet stays logged in
  },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        // First login — attach user fields to the JWT
        token.id = user.id;

        // Fetch full user to get plan + admin status
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { plan: true, isAdmin: true, emailVerified: true },
        });
        if (dbUser) {
          token.plan = dbUser.plan;
          token.isAdmin = dbUser.isAdmin;
          token.isVerified = !!dbUser.emailVerified;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.plan = token.plan as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },
    authorized({ auth: authSession, request: { nextUrl } }) {
      const isLoggedIn = !!authSession?.user;
      const isProtected = ["/dashboard", "/events", "/presets", "/account", "/booth"].some(
        (path) => nextUrl.pathname.startsWith(path)
      );
      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl));
      }
      return true;
    },
  },
});

"use client";

/**
 * components/providers/SessionProvider.tsx
 * Wraps the Auth.js SessionProvider for client components.
 */

import { SessionProvider as NextAuthProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthProvider>{children}</NextAuthProvider>;
}

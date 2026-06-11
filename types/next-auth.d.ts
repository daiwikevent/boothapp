/**
 * types/next-auth.d.ts
 * Augment the Auth.js session and JWT types to include our custom fields.
 */

import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      plan: string;
      isAdmin: boolean;
      isVerified: boolean;
      features?: {
        hasCustomPresets: boolean;
        hasCustomLogo: boolean;
        hasNoWatermark: boolean;
        hasCsvReports: boolean;
        hasAttendantPin: boolean;
      };
    };
  }

  interface User {
    id: string;
    plan?: string;
    isAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    plan: string;
    isAdmin: boolean;
    isVerified: boolean;
    features?: {
      hasCustomPresets: boolean;
      hasCustomLogo: boolean;
      hasNoWatermark: boolean;
      hasCsvReports: boolean;
      hasAttendantPin: boolean;
    };
  }
}

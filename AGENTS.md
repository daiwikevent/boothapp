# Project Rules
1. /docs is the source of truth. Read the relevant doc before
   implementing any ticket. Ask before deviating from the docs.
2. Every database query on tenant tables (events, photos, presets,
   payments, subscriptions, credit_ledger) MUST go through
   lib/db-scoped.ts accessors. Never accept a userId from the client.
3. Credits change ONLY via lib/credits.ts ledger helpers (atomic
   transaction with advisory lock). No direct inserts elsewhere.
4. Stack: Next.js 14 App Router, TypeScript, Tailwind, Prisma +
   PostgreSQL, Auth.js v5, sharp, self-hosted via Docker (see doc 06).
   Do not introduce Supabase, Vercel-specific APIs, or other ORMs.
5. Work on ONE ticket at a time. Stop after each ticket and list
   what was built against its acceptance criteria.
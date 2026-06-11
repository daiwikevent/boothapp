# Feature Ticket List — AI Photobooth SaaS

Each ticket is written so it can be pasted directly into an AI coding tool. Build strictly in order — dependencies are noted. Priority: 🔴 must-have, 🟡 should-have, 🟢 nice-to-have.

---

## Phase 0 — Foundation

**T01 · Project scaffold** 🔴
Create a Next.js 14 App Router project with Tailwind, TypeScript, the folder structure from the architecture doc, dark theme CSS variables from the frontend spec, and a PWA manifest (standalone display, landscape-friendly).
✅ Done when: app runs locally, deploys to Vercel, installs as a PWA on a tablet.
Depends on: —

**T02 · Supabase setup + schema** 🔴
Create the Supabase project; write `schema.sql` with profiles, credit_ledger, events, presets, event_presets, photos, subscriptions, payments; write all RLS policies from the security doc; create storage buckets (originals, outputs, preset-thumbnails, logos).
✅ Done when: tables exist, RLS verified by failing cross-user reads in a test, buckets created with correct visibility.
Depends on: T01

**T03 · Auth flow** 🔴
Signup, login, logout, email verification, password reset using Supabase Auth with SSR cookie sessions. On first verified login, create the profile row and insert a +9 `trial_grant` row in credit_ledger.
✅ Done when: a new user can sign up, verify, log in, and sees 9 credits; unverified users are blocked from the dashboard.
Depends on: T02

---

## Phase 1 — Operator core

**T04 · Dashboard shell + credit badge** 🔴
Top-nav dashboard layout with pages Overview / Events / Presets / Account. Credit badge in header computed as SUM(credit_ledger.delta) via a `get_balance` RPC.
✅ Done when: badge shows correct balance and updates after ledger changes; amber/red threshold colors work.
Depends on: T03

**T05 · Events CRUD** 🔴
Create/rename/delete events; toggle exactly one active event per user (activating one deactivates others); empty state per spec.
✅ Done when: operator can manage events; active badge behaves; RLS confirmed (user B cannot read user A's events).
Depends on: T04

**T06 · System preset library + seed** 🔴
Presets table seeded with 12–15 ORIGINAL themed presets (e.g., Royal Rajasthan, Bollywood Retro 70s, Mehandi Garden, Sangeet Glam, Classic Studio B&W, Cyber Neon, Vintage Mumbai, Beach Sunset, Office Headshot Pro) each with: name, people tag, transformation prompt, thumbnail. Generate thumbnails yourself with Gemini using your own face/test photos — do not reuse any competitor imagery.
✅ Done when: presets render in dashboard grid grouped by people tag.
Depends on: T04

**T07 · Event–preset linking** 🔴
In event edit view, multi-select which presets are enabled for that event (default: all system presets).
✅ Done when: selection persists in event_presets and drives the booth picker.
Depends on: T05, T06

---

## Phase 2 — Booth + AI (the heart)

**T08 · Booth camera screen** 🔴
Fullscreen /booth page: getUserMedia live preview, mirror toggle, front/back camera switch, configurable countdown (from profile.countdown_seconds), capture to canvas → JPEG (max 1280px longest edge). Floating controls per frontend spec. Block with friendly screens when no active event or no camera permission.
✅ Done when: works on a real Android tablet + laptop Chrome; capture produces a JPEG blob; controls are touch-friendly.
Depends on: T07

**T09 · Preset picker overlay** 🔴
Modal grid of the active event's presets (thumbnail cards, people-tag chips). Selected preset shown as a pill button in the booth header.
✅ Done when: guest can switch styles between shots; selection survives a page refresh.
Depends on: T08

**T10 · /api/generate pipeline** 🔴
Server endpoint: auth → atomic 3-credit spend (insufficient ⇒ 402) → upload original → Gemini call with system wrapper + preset prompt (45s timeout, 1 retry) → sharp post-process (web + 4x6 print variants, watermark when plan requires) → save output, photo row `done`, return short_code. On failure: `failed` + automatic +3 refund row.
✅ Done when: end-to-end photo in < 20s p50; kill-switch test shows refund works; concurrent captures don't double-spend.
Depends on: T08, T06

**T11 · Processing + result screens** 🔴
Booth states: processing animation → result with before/after, big QR (encodes /g/{shortCode}), Retake and New Photo buttons; out-of-credits screen with operator-facing top-up link.
✅ Done when: full guest loop (style → pose → capture → result → QR scan on a phone) works at demo quality.
Depends on: T10

**T12 · Guest download page /g/[code]** 🔴
Public mobile page: fetch photo by short code server-side, signed URL, Download button, WhatsApp share link, "available for 3 days" note, graceful expired state.
✅ Done when: scanning the booth QR on a phone downloads the image; expired codes show the friendly message.
Depends on: T10

**T13 · Auto-delete job** 🔴
pg_cron (or Vercel cron) hourly: delete storage objects + photo rows past expires_at.
✅ Done when: a photo with a forced past expiry disappears from storage, gallery, and /g/.
Depends on: T12

---

## Phase 3 — Money

**T14 · Razorpay top-up checkout** 🔴
Pricing page + dashboard buy flow: server creates Razorpay order for a credit pack; Checkout JS opens; webhook `payment.captured` (signature-verified, idempotent) inserts payment row + credit grant.
✅ Done when: test-mode purchase lands credits exactly once even when the webhook fires twice.
Depends on: T04

**T15 · Subscriptions (Starter/Pro/Business)** 🔴
Razorpay subscription plans; `subscription.charged` webhook grants monthly credits and sets profile.plan; cancel/downgrade handled at period end; plan gates enforced server-side (watermark off only on Business, custom presets Pro+).
✅ Done when: upgrading changes plan + credits; lapsed subscription blocks generation but not gallery.
Depends on: T14

**T16 · Operator gallery** 🔴
Per-event gallery page: thumbnails, open full size, single + bulk (zip) download, deletion countdown label, refresh.
✅ Done when: operator can recover any photo from an event within 3 days.
Depends on: T11

---

## Phase 4 — Should-haves (v1.1)

**T17 · Custom presets (Pro+)** 🟡 — form: name, people tag, prompt, thumbnail upload; server-side denylist validation; appears in own library + event linking. Depends on: T06, T15.
**T18 · Slideshow public page /s/[slug]** 🟡 — auto-rotating latest photos for venue screens; QR + copy-link buttons in event card. Depends on: T16.
**T19 · White-label logo (Pro+)** 🟡 — logo upload; overlaid on booth camera view and optionally stamped on output. Depends on: T10, T15.
**T20 · Usage reports** 🟡 — date/event-filtered report (credits used, photos, failures) with CSV export and field checkboxes. Depends on: T16.
**T21 · Print support** 🟡 — print button on result screen using the 4x6 variant; tested with a common dye-sub printer. Depends on: T11.
**T22 · Booth settings PIN lock** 🟡 — 4-digit PIN gate on the booth account/settings menu so guests can't open it. Depends on: T11.

---

## Phase 5 — v2 (do not start until paying customers exist)

**T23 · AI video generation (12 credits)** 🟢 — image-to-video via fal.ai behind a feature flag; separate queue + status polling.
**T24 · Reference images per preset (Business)** 🟢 — up to 3 style reference uploads passed to the model.
**T25 · Template/frame builder** 🟢 — overlay frames with event name/date on outputs.
**T26 · Custom QR domain** 🟢 — per-operator domain for /g/ links.
**T27 · Admin panel** 🟢 — manage system presets, adjust credits, view accounts.

---

## Suggested timeline (solo, evenings/weekends)

- Week 1–2: T01–T07 (foundation + operator core)
- Week 3–4: T08–T13 (booth + AI — the demo-able milestone; use it at a real Daivik event as your beta)
- Week 5: T14–T16 (billing + gallery) → soft launch
- Week 6+: v1.1 tickets driven by what beta operators ask for

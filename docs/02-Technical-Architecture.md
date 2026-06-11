# Technical Architecture — AI Photobooth SaaS

## 1. Tech Stack (with reasoning)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 14+ (App Router) + Tailwind CSS** | One framework for marketing site, dashboard, and booth PWA. Vercel-native. |
| PWA | next-pwa / manifest + service worker | Booth must install fullscreen on tablets and survive flaky venue Wi-Fi (queue & retry uploads). |
| Backend | **Next.js API routes / server actions** | No separate server to run; keeps the solo-dev footprint small. |
| Auth | **Supabase Auth** | Email/password + email verification out of the box; rows tie to `auth.uid()`. |
| Database | **Supabase Postgres** | Free tier fits MVP; RLS for tenant isolation; pg_cron for cleanup jobs. |
| Storage | **Supabase Storage** | Buckets for originals, outputs, preset thumbnails, logos. Signed URLs for guest downloads. |
| AI image | **Gemini image model (gemini-2.5-flash-image)** | Strong identity-preserving attire/background edits; you already know the Gemini API from n8n. Cost roughly $0.03–0.04/image ≈ ₹3–4. |
| AI video (v2) | fal.ai (Kling/Hailuo) or Veo | Defer. Only behind a feature flag. |
| Payments | **Razorpay** Subscriptions + Payment Links | INR billing, UPI support — essential for Indian operators. Webhooks grant credits. |
| QR codes | `qrcode` npm package, generated server-side | Trivial, no external service. |
| Hosting | **Vercel** | Free tier for MVP; serverless functions for the generate endpoint (set max duration ≥ 60s, or proxy long jobs through a Supabase Edge Function). |
| Email | Resend (or Supabase built-in for auth mails) | Verification + receipts. |
| Monitoring | Sentry free tier + Vercel analytics | Catch generation failures early. |

## 2. File & Folder Structure

```
/app
  /(marketing)            # public site
    page.tsx              # home
    pricing/page.tsx
    login/page.tsx
    signup/page.tsx
  /(dashboard)            # operator area (auth required)
    dashboard/page.tsx    # overview: credits, recent events
    events/page.tsx       # CRUD + per-event links/QRs
    presets/page.tsx      # system + my presets
    account/page.tsx      # profile, billing, reports, logo, password
  /booth
    page.tsx              # fullscreen camera PWA (auth required)
    result/[photoId]/page.tsx
  /g/[shortCode]/page.tsx # PUBLIC guest download page (QR target)
  /s/[eventSlug]/page.tsx # PUBLIC slideshow page (v1.1)
  /api
    generate/route.ts     # capture -> AI -> output (the core endpoint)
    razorpay/webhook/route.ts
    events/route.ts
    presets/route.ts
    reports/route.ts
/components
  /booth                  # CameraView, CountdownOverlay, PresetPicker,
                          # ResultCard, CreditBadge
  /dashboard
  /ui
/lib
  supabase.ts             # client + server helpers
  gemini.ts               # AI call, prompt assembly, retry logic
  credits.ts              # ledger ops (atomic spend/grant)
  razorpay.ts
  qr.ts
  watermark.ts            # sharp-based overlay
/db
  schema.sql
  rls-policies.sql
/public
  manifest.json           # PWA
```

## 3. Database Schema (plain English + SQL-ish)

**profiles** — one per operator (extends auth.users)
- id (uuid, = auth.users.id), email, display_name, company_name, country, logo_url, plan (`trial|starter|pro|business`), countdown_seconds (int, default 3), created_at

**credit_ledger** — append-only; balance = SUM(delta). Never store a mutable balance.
- id, user_id, delta (int; +grant / −spend), reason (`trial_grant|subscription_grant|topup|photo|video|refund`), ref_id (photo id / payment id), created_at

**events**
- id, user_id, name, slug (for public slideshow URL), is_active (bool), created_at
- Constraint: app logic enforces one active event per user at a time (matches reference UX).

**presets**
- id, owner_id (NULL = system preset), name, prompt (text — the AI instruction), people_tag (`solo|couple|group`), thumbnail_url, is_active, plan_required (`starter|pro|business`), created_at

**event_presets** — which presets are enabled for an event
- event_id, preset_id (composite PK)

**photos**
- id, user_id, event_id, preset_id, original_path, output_path, short_code (unique, for /g/ URL), status (`processing|done|failed`), credits_charged (int), error_msg, created_at, expires_at (created_at + 3 days)

**subscriptions**
- id, user_id, razorpay_subscription_id, plan, status, current_period_end, created_at

**payments**
- id, user_id, razorpay_payment_id, amount_inr, credits_granted, type (`subscription|topup`), created_at

**usage rollups** — skip a table; compute reports with SQL over photos + credit_ledger.

### Key relationships
profiles 1—N events 1—N photos; presets N—N events via event_presets; credit_ledger references profiles.

## 4. The Core Pipeline (/api/generate)

1. Auth check → load profile, event, preset.
2. **Atomic credit check & hold:** insert −3 ledger row inside a transaction that first verifies balance ≥ 3 (SELECT ... FOR UPDATE on a per-user advisory lock). Insufficient → 402 response, booth shows top-up prompt.
3. Upload original to storage (`originals/{userId}/{photoId}.jpg`).
4. Call Gemini: input = guest photo + preset prompt + global guardrails ("preserve the person's face and identity exactly; change attire and background to …"). Timeout 45s, 1 retry.
5. Post-process with `sharp`: resize for web + 4x6 print variant; apply watermark if plan requires; apply operator logo if enabled.
6. Save output, mark photo `done`, return short_code + signed URL.
7. On failure: mark `failed`, insert +3 refund ledger row, return error.

## 5. Environment & Config Notes

- `GEMINI_API_KEY` — server-only. NEVER call Gemini from the browser; the booth always goes through /api/generate.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (server-only, used by webhook + cleanup).
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- `NEXT_PUBLIC_APP_URL` — used to build QR URLs.
- Feature flags in DB or env: `ENABLE_VIDEO=false`, `ENABLE_SLIDESHOW=true`.
- Cron (pg_cron or Vercel cron): hourly job deletes storage objects + rows where `expires_at < now()`.
- Booth offline handling: if upload fails, queue capture in IndexedDB and retry — venues have bad Wi-Fi.

## 6. Cost Model (sanity check)

- Gemini image ≈ ₹3–4/photo → sold at ~₹13–20/photo equivalent via credits → ~75% gross margin.
- Supabase free → ₹0 until traction; storage stays small because of 3-day auto-delete.
- Vercel free/hobby for MVP; upgrade only when serverless minutes demand it.
- Fixed monthly cost at launch: ≈ ₹0 + domain.

# Security & Access — AI Photobooth SaaS

## 1. Authentication Method

- **Operators:** Email + password via Supabase Auth, with mandatory email verification before credits activate. Add Google OAuth later (nice-to-have, not blocking).
- **Guests:** No authentication ever. Guests interact only with (a) the booth screen, which is logged in as the operator, and (b) public short-code download pages.
- **Booth sessions:** the booth tablet is logged in as the operator. Long-lived session (30 days refresh) so it doesn't log out mid-event. Provide a "lock booth" mode later so guests can't open settings (v1.1: settings behind a 4-digit PIN).

## 2. User Roles & Permissions

| Role | Can | Cannot |
|---|---|---|
| **Guest (anonymous)** | View one photo via short code; download it; view event slideshow page | List photos, see other events, see operator info, call generate API |
| **Operator** | Everything in their own account: events, presets, photos, billing, reports, logo, booth | See or touch any other operator's data; edit system presets; grant themselves credits |
| **Admin (you)** | Manage system presets, view all accounts, adjust credits manually, refunds | — (use a dedicated admin flag in profiles, checked server-side; build a minimal internal page, not a public admin URL) |

## 3. Row-Level Security Rules (Supabase)

Enable RLS on every table. Policies in plain English:

- **profiles:** user can SELECT/UPDATE only the row where `id = auth.uid()`. No DELETE.
- **events / photos / event_presets:** SELECT/INSERT/UPDATE/DELETE only where `user_id = auth.uid()`.
- **presets:** SELECT where `owner_id = auth.uid() OR owner_id IS NULL` (system presets readable by all). INSERT/UPDATE/DELETE only where `owner_id = auth.uid()`. System presets editable only via service role.
- **credit_ledger:** SELECT own rows only. **No INSERT/UPDATE/DELETE from client at all** — credits change only through server code using the service-role key (generate endpoint, Razorpay webhook, admin tools).
- **subscriptions / payments:** SELECT own rows; writes server-only.
- **Storage buckets:** `originals` and `outputs` private; guest downloads use time-limited signed URLs resolved by the /g/[shortCode] page server-side. `preset-thumbnails` public-read. `logos` private, signed URL.
- Short codes: ≥ 10 random characters (nanoid) so gallery URLs are not guessable.

## 4. Payment Security

- All Razorpay webhook calls verified with HMAC signature against `RAZORPAY_WEBHOOK_SECRET`; reject otherwise.
- Credits granted ONLY from verified webhook events (`payment.captured`, `subscription.charged`) — never from a client-side "payment success" redirect.
- Idempotency: store razorpay_payment_id unique; duplicate webhook = no double grant.

## 5. Error Handling (defined responses)

| Failure | Behavior |
|---|---|
| AI generation fails/times out | Photo marked `failed`, 3 credits auto-refunded, booth shows "Couldn't create your portrait — credits refunded, please try again." |
| Insufficient credits | Booth blocks capture with friendly screen: "Out of credits" + (operator-only) top-up button. Never crash mid-event. |
| Venue Wi-Fi drops during upload | Capture queued locally (IndexedDB), auto-retry with visible "reconnecting" badge. |
| Camera permission denied | Full-screen instruction with browser-specific steps to re-enable. |
| Wrong password ×5 | Standard Supabase rate limiting; show "try again in a minute." |
| Razorpay payment fails | Show failure state, no credits granted, "retry payment" link; log for support. |
| Expired photo link (after 3 days) | /g/ page shows "This photo has expired" — never a 500. |
| Webhook received for unknown user | Log + alert (Sentry), return 200 to stop retries, investigate manually. |

## 6. Content & Safety Rules

- Server-side prompt template is fixed; the preset prompt is inserted into a slot — operators on Pro write preset text, but the system wrapper always enforces: no nudity/sexualization, no violence, preserve subject identity, no celebrity face swaps onto guests.
- Reject custom preset prompts containing blocked terms (simple server-side denylist + Gemini safety settings on).
- **Minors:** wedding events include children. Output stays fully clothed, wholesome themes only — the system wrapper guarantees this regardless of preset text.
- **IP:** system preset library must be original artwork/themes only. No film, brand, sports-team, or celebrity-styled presets. This is both legal protection and a differentiator (Indian-wedding themes the competitor doesn't have).
- **Privacy:** guest photos auto-delete after 3 days (originals AND outputs). State this on the booth result screen. Don't use guest photos for marketing without written consent from the operator + subjects.

## 7. Edge Cases Checklist

- Guest takes photo, walks away before result → photo still lands in gallery + slideshow; attendant can reopen QR from gallery.
- Two booths logged into one account simultaneously → allowed; credits ledger is atomic, so no double-spend race.
- Operator deletes an event that has photos → soft-delete event; photos expire naturally on their own timer.
- Operator downgrades plan mid-cycle → keep remaining credits; gate plan-locked features at next render.
- Subscription lapses → account drops to read-only booth (no generation) but gallery/downloads still work until expiry.
- Empty preset selection for an event → booth shows system default presets rather than an empty picker.
- Very large group photo / multiple faces → allow, but tag presets by people count and warn when mismatch ("This style works best for couples").
- Same photo retake spam → debounce capture button during processing; one in-flight generation per booth session.

# PRD — AI Photobooth SaaS (Working name: "BoothMagic" — rename as you like)

## 1. Problem Statement

Event operators (wedding planners, photobooth rental companies, brand activation agencies) want to offer AI photo experiences at events — guests get instantly transformed into themed portraits (royal attire, Bollywood retro, etc.) and download them via QR. Existing tools are priced in USD for Western markets, lean on generic/Western themes, and most Indian operators have no affordable, India-themed, Razorpay-billed option. Building it in-house per event is impossible for non-technical operators.

## 2. Target Users

**Primary — the operator (paying customer):**
- Photobooth rental businesses, wedding planners (like Daivik Events itself), event companies, brand agencies in India.
- Tech comfort: can use a web app on a laptop/tablet; cannot code.
- Wants: reliable booth software, themed presets that match Indian weddings/festivals, predictable per-photo cost, their own branding on output.

**Secondary — the guest (end user, never pays, never signs up):**
- Wedding/party guest, any age. Interacts only with the booth screen and a QR code. Zero-friction is mandatory: no app install, no login.

## 3. Product Vision

The default AI photobooth platform for Indian event professionals — every wedding, sangeet, and corporate event can offer studio-quality AI portraits in 30 seconds, billed in rupees, themed for India.

## 4. Core Features

### Must-have (MVP — v1)

| # | Feature | Description |
|---|---------|-------------|
| M1 | Operator auth | Email + password signup/login, email verification, password reset. |
| M2 | Events | Create/edit/delete events; one "active" event at a time per booth; each event linked to a set of presets. |
| M3 | Booth app (PWA) | Fullscreen camera page: live preview, mirror toggle, front/back camera, configurable countdown (default 3s), capture, preset picker overlay, result screen with QR download. Installable as PWA on tablet. |
| M4 | AI photo transform | Captured photo + selected preset prompt → Gemini image model → transformed image preserving the guest's face. Target < 20s end-to-end. |
| M5 | Preset system | System preset library (admin-curated, original Indian + universal themes, tagged by people count: Solo / Couple / Group). Operator picks which presets are enabled per event. |
| M6 | QR download | Each result gets a short URL + QR; guest scans and downloads on their phone. No login. |
| M7 | Credits | 3 credits per photo. Credit balance on account; booth blocks capture at 0 credits with clear message. Trial: 9 free credits on signup. |
| M8 | Plans & billing | Razorpay subscriptions (Starter / Pro / Business) + one-time credit top-up packs. Webhook-driven credit grants. |
| M9 | Event gallery | Operator-facing gallery per event; bulk download; auto-delete media after 3 days (configurable later). |
| M10 | Watermark | Small brand watermark on output for Starter/Trial; removed on Business plan. |

### Should-have (v1.1)

| # | Feature | Description |
|---|---------|-------------|
| S1 | Custom presets | Operator writes own prompt + name + thumbnail = custom preset (Pro+). |
| S2 | Slideshow link | Per-event public URL that auto-rotates latest photos — for the big screen at the venue. QR + copy-link in event settings. |
| S3 | White label logo | Operator uploads logo, overlaid on camera view and optionally on output image (Pro+). |
| S4 | Usage reports | Date-filtered report of credits used, images generated, per event; CSV export. |
| S5 | Print support | Print-ready output sizing (4x6) and a print button on result screen. |

### Nice-to-have (v2 — do NOT build in v1)

- AI video generation (image-to-video, ~4s clips, 12 credits) via a video model API.
- Reference images per preset (upload up to 3 example images to steer style) — Business plan.
- Template/frame builder (drag-drop overlay frames with event name + date).
- Custom QR domain.
- Live Preview / Video Preview public links.
- Seasonal theme packs (e.g., festival packs — design your own original artwork; do not copy branded/IP-based themes).
- Multi-operator team accounts.

## 5. App Flow (Guest journey at event)

1. Booth tablet shows fullscreen camera with operator's logo top-left and a "Select Style" button.
2. Guest (or attendant) taps Select Style → grid of preset cards with thumbnail images → taps one.
3. Camera view returns; guest poses; taps capture button → 3-2-1 countdown → photo taken.
4. Processing screen ("Creating your portrait…", ~10–20s) with progress animation.
5. Result screen: before/after, big QR code, "Scan to download", buttons: Retake / New Photo / Print (if enabled).
6. Photo also appears in the event slideshow and operator gallery.
7. Guest scans QR → mobile page with the image → Download / Share to WhatsApp.

## 6. App Flow (Operator journey)

1. Lands on marketing site → Start Free Trial → signup → email verify → 9 trial credits.
2. Onboarding: create first event → pick presets for it → "Launch Photobooth" opens booth in fullscreen.
3. Settings modal (inside booth or dashboard) with three tabs: **Events / My Presets / My Account** — mirroring what works in the reference app.
4. Runs out of credits → upgrade prompt → Razorpay checkout → credits land instantly via webhook.

## 7. What we are deliberately NOT building in v1

- Video generation (cost + latency risk; add after photo product is stable).
- Native mobile apps (PWA covers tablet/phone).
- Guest accounts, guest data collection forms.
- Hardware sales pages.
- Marketplace of third-party presets.
- Any preset using copyrighted characters, brands, films, or sports properties.

## 8. Success Metrics

- Activation: % of signups who generate ≥1 photo within 24h (target 60%).
- Conversion: trial → paid within 14 days (target 10–15%).
- Unit economics: AI cost per photo ≤ ₹4; effective revenue per photo ≥ ₹15.
- Reliability: photo success rate ≥ 97%; p90 generation time ≤ 20s.
- North star: photos generated per week.

## 9. Pricing (India-adjusted draft — validate before launch)

- Per-photo cost anchor: 3 credits/photo.
- **Trial:** 9 credits free.
- **Starter ₹799/mo:** 54 credits (~18 photos) — learning & testing.
- **Pro ₹1,599/mo:** 120 credits (~40 photos) — logo overlay, custom presets, slideshow, print.
- **Business ₹2,999/mo:** 240 credits (~80 photos) — no watermark, reports, priority support.
- **Top-ups:** ₹1,999/120cr · ₹4,999/360cr · ₹7,999/700cr · ₹14,999/1,500cr (declining per-credit price).
- Annual: 2 months free.

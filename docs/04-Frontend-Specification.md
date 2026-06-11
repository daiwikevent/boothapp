# Frontend Specification — AI Photobooth SaaS

Design direction: dark, premium, event-tech feel (works well on booth screens in dim venues), but with your own identity — do NOT copy the reference app's branding, artwork, or preset imagery. Below is an original palette suggestion; swap to match the brand you choose.

## 1. Color Palette

| Token | Hex | Use |
|---|---|---|
| `--bg` | #0B0B14 | App/booth background (near-black, slight indigo) |
| `--surface` | #14141F | Cards, modals |
| `--surface-2` | #1C1C2B | Inputs, nested panels |
| `--primary` | #7C5CFF | Primary buttons, active tabs |
| `--primary-2` | #C44DFF | Gradient end (primary buttons use a `--primary → --primary-2` gradient) |
| `--accent` | #FFB547 | Highlights, plan-locked feature notices, "Business" badges |
| `--text` | #F4F4F8 | Primary text |
| `--text-muted` | #9A9AB0 | Secondary text |
| `--success` | #34D399 | Active badges, savings tags |
| `--error` | #F87171 | Errors, destructive buttons |
| `--border` | #2A2A3D | Card borders, dividers; active cards get a `--primary` glow border |

Booth screens use the dark theme always. Dashboard can share it (simpler than maintaining two themes).

## 2. Typography

- **Headings:** Poppins (600/700) — geometric, modern, reads well on event screens. Sizes: h1 32–40px, h2 24px, h3 18px.
- **Body/UI:** Inter (400/500), 14–16px; 13px for table/metadata text.
- **Booth result/QR screen:** oversize — "Scan to download" at 24px+, because guests read from 1m away.
- Numbers (credits, prices): tabular-nums.

## 3. Component Styles

- **Buttons:** 10px radius. Primary = gradient fill, white text, subtle outer glow on hover. Secondary = transparent with `--border`, hover brightens border to `--primary`. Destructive = `--error` outline. Min touch target 44px — booth is touch-first.
- **Cards:** `--surface`, 14px radius, 1px `--border`; selected/active cards switch border to `--primary` with soft glow.
- **Modals:** centered, `--surface`, 16px radius, dimmed backdrop (80% black). Settings modal uses a 3-tab segmented control (Events / My Presets / My Account) — full-width pill tabs, active tab outlined in `--primary`.
- **Inputs:** `--surface-2` fill, 8px radius, 1px border, focus ring `--primary`.
- **Preset cards (booth picker):** square thumbnail, name overlaid on bottom gradient strip, people-count tag chip top-left ("Solo", "Couple", "Group"). Grid: 3 across on tablet landscape, 2 on portrait.
- **Plan-gate notice:** amber (`--accent`) bordered banner with lock icon — pattern: "Template Builder (Business plan) — upgrade to unlock."
- **Empty states:** centered icon + one-line message + one action ("No presets yet — Create your first preset").
- **Credit badge:** pill showing `⚡ 87 credits`, visible in booth account menu and dashboard header; turns amber < 15, red < 6.

## 4. Spacing & Layout Rules

- 4px base unit; common steps 8 / 12 / 16 / 24 / 32.
- Dashboard: max-width 1200px, 24px gutters, sidebar-less (top nav) to keep it simple.
- Booth: 100dvh fullscreen, no scroll, no browser chrome (PWA standalone). Controls float over camera: logo top-left; Style / Gallery / Fullscreen / Account top-right; capture button bottom-center (88px circle).
- Result screen: image left (60%), QR + actions right (40%); stacks vertically on portrait.
- Mobile guest download page (/g/): single column, image, Download button, WhatsApp share button, expiry note.

## 5. Screens Inventory

1. Marketing: Home, Pricing, Login, Signup.
2. Dashboard: Overview (credits, recent events, quick "Launch Booth"), Events, Presets, Account.
3. Booth: Camera, Preset Picker (modal), Processing, Result, Out-of-credits, Camera-permission help.
4. Public: /g/[code] guest download, /s/[slug] slideshow (v1.1).

## 6. API & Integration Spec

### Gemini (server-side only, via /api/generate)
- **Purpose:** identity-preserving attire/background transformation.
- **Call:** model `gemini-2.5-flash-image`; input = guest photo (base64) + assembled prompt (system wrapper + preset prompt); output = image.
- **In:** JPEG ≤ 4MB (downscale client-side to ~1280px longest edge before upload).
- **Out:** PNG/JPEG → post-processed (watermark/logo/print size) → stored.
- **Errors:** timeout 45s, 1 retry, then fail + auto credit refund.

### Razorpay
- **Purpose:** subscriptions (plans) + one-time orders (top-ups), INR/UPI.
- **Client:** Razorpay Checkout JS with order/subscription id created server-side.
- **Server endpoints used:** create order, create subscription, fetch invoice.
- **Webhooks consumed:** `payment.captured` (top-up → grant credits), `subscription.charged` (monthly grant), `subscription.cancelled` (downgrade at period end).
- **Data in:** amount, plan id, user id (notes field). **Data back:** payment id, status, signature (verified).

### Supabase
- **Auth:** signup/login/reset; session in cookies (SSR helpers).
- **DB:** all reads through RLS as the user; credit writes via service role on server only.
- **Storage:** uploads via server (originals/outputs private; signed URLs 15-min expiry for guest page, regenerated on each visit).

### QR generation
- `qrcode` npm lib server-side → data URL embedded in result screen and printable card. Encodes `{APP_URL}/g/{shortCode}`.

### WhatsApp share (guest page)
- Plain `https://wa.me/?text={encoded link}` deep link — no API needed.

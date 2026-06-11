# Self-Hosted Architecture & Deployment Guide — AI Photobooth SaaS

This replaces Doc 02's hosting/auth/storage choices. The product spec (Doc 01), security rules (Doc 03), frontend spec (Doc 04), and ticket order (Doc 05) stay the same except where noted at the end. Built to be generated with Antigravity IDE and deployed on a single VPS.

## 1. Revised Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router, standalone output) | Same as before; `output: 'standalone'` for a small Docker image. |
| ORM / DB | **Prisma + PostgreSQL 16 (Docker)** | Schema from Doc 02 ports directly; Prisma migrations replace schema.sql. |
| Auth | **Auth.js (NextAuth v5)** Credentials provider | Email+password with bcrypt; email verification + reset via SMTP (Brevo/Zoho free tier). Session = JWT cookie, 30-day maxAge so the booth tablet stays logged in through long events. |
| File storage | **Local disk volume** `/data/storage/{originals,outputs,thumbnails,logos}` | Served only through an app route (see §4). Optional later upgrade: MinIO for S3 API — not needed at MVP scale. |
| Image processing | sharp | Same: resize, 4x6 print variant, watermark, logo stamp. |
| AI | Gemini image API (server-side) | Unchanged. |
| Payments | Razorpay + webhook | Unchanged. Webhook URL points at your domain. |
| Reverse proxy | **Caddy** | Automatic HTTPS/Let's Encrypt, 2-line config. (Nginx fine if you prefer.) |
| Process mgmt | **Docker Compose** with `restart: unless-stopped` | App + Postgres + Caddy. |
| Cron | System cron on the host (or a tiny cron container) | Hourly photo cleanup, nightly backup. |
| Server | VPS: DigitalOcean Bangalore / Hostinger India, 2 vCPU / 4GB RAM / 80GB disk | ~₹500–800/mo. Indian region = low latency for booth uploads at venues. |
| Monitoring | UptimeRobot (free) pinging /api/health + Sentry free tier | A booth outage during a wedding is the worst failure mode — alert on it. |

## 2. Multi-Tenancy WITHOUT Supabase RLS (critical rule)

Postgres RLS is replaced by **application-layer tenant isolation**. This rule must be followed in every ticket:

> Every Prisma query on tenant tables (events, photos, presets with owner, payments, subscriptions, credit ledger) MUST include `where: { userId: session.user.id }` (or go through a repository helper that injects it). No route handler may accept a userId from the client. Write one helper module `lib/db-scoped.ts` exposing scoped accessors (e.g. `getEvent(session, id)`), and use only those in routes.

Add an integration test: user B requesting user A's event/photo by id gets 404.

System presets: rows with `ownerId = NULL`, readable by all, writable only via admin-flag check.

## 3. Credits Without Supabase RPC

Same append-only `credit_ledger`. Atomic spend with Prisma interactive transaction:

1. `SELECT pg_advisory_xact_lock(hashtext(userId))`
2. `SUM(delta)` for user → if < 3, throw 402.
3. Insert `-3` row, create photo row `processing`, commit.

Refund on failure = insert `+3` row referencing the photo id. Webhook grants are idempotent via unique `razorpayPaymentId`.

## 4. File Serving & "Signed URLs" Without Supabase

- Files live on disk; **never** under `/public`.
- Operator/dashboard access: `/api/files/[photoId]?variant=web|print` — checks session + ownership, streams file.
- Guest QR access: `/g/{shortCode}` page server-renders and embeds `/api/files/guest/{token}` where token = short-lived JWT (15 min, signed with `FILE_TOKEN_SECRET`, payload = photoId). Page regenerates the token on each visit, so links in the QR stay valid for the photo's 3-day life while raw file URLs expire quickly.
- Set `Cache-Control: private, no-store` on guest streams.

## 5. Docker Compose Layout

```
/opt/boothapp
  docker-compose.yml
  Caddyfile
  .env                     # all secrets; chmod 600; NEVER in git
  /data
    /postgres              # pg volume
    /storage               # photos volume
    /backups
```

**docker-compose.yml (shape — Antigravity can generate the full file):**

```yaml
services:
  app:
    build: .                      # Next.js standalone image
    env_file: .env
    volumes: [ "./data/storage:/data/storage" ]
    depends_on: [ db ]
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: booth
      POSTGRES_USER: booth
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [ "./data/postgres:/var/lib/postgresql/data" ]
    restart: unless-stopped
    # no ports exposed to host — app reaches it on the compose network

  caddy:
    image: caddy:2
    ports: [ "80:80", "443:443" ]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    restart: unless-stopped

volumes: { caddy_data: }
```

**Caddyfile:**

```
yourdomain.com {
    reverse_proxy app:3000
    request_body { max_size 10MB }   # photo uploads
}
```

## 6. Environment Variables (.env)

```
DATABASE_URL=postgresql://booth:...@db:5432/booth
AUTH_SECRET=...                # NextAuth
FILE_TOKEN_SECRET=...          # guest file tokens
GEMINI_API_KEY=...
RAZORPAY_KEY_ID=... / RAZORPAY_KEY_SECRET=... / RAZORPAY_WEBHOOK_SECRET=...
SMTP_HOST/PORT/USER/PASS, MAIL_FROM=...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ENABLE_VIDEO=false
```

## 7. Cron Jobs (host crontab)

```
# hourly: delete expired photos (rows + files)
0 * * * *  docker compose -f /opt/boothapp/docker-compose.yml exec -T app node scripts/cleanup-expired.js

# nightly 2am: DB backup + sync to Google Drive
0 2 * * *  /opt/boothapp/scripts/backup.sh
```

`backup.sh`: `pg_dump` from the db container → gzip into `/data/backups` (keep 14 days) → `rclone copy` to a Google Drive folder. **Also rclone-sync `/data/storage` if you want photo-level recovery** (optional given 3-day expiry). Test a restore once before launch — a backup you've never restored is a hope, not a backup.

## 8. Server Hardening Checklist (do once)

- Ubuntu 24.04 LTS; non-root deploy user; SSH key-only login; disable password SSH.
- `ufw allow 22,80,443` and deny everything else (Postgres is not exposed anyway).
- Unattended security upgrades on.
- Docker log rotation: `max-size: 10m, max-file: 3` in daemon.json.
- `/api/health` endpoint (checks DB + disk free) wired to UptimeRobot, alert to your email/WhatsApp.
- Disk alert: cleanup job logs storage usage; alert if /data > 80%.
- Razorpay webhook: configure `https://yourdomain.com/api/razorpay/webhook` in the Razorpay dashboard (live + test mode separately).

## 9. Deploy & Update Flow

1. Push code to a private GitHub repo.
2. On VPS: `git pull && docker compose build app && docker compose up -d` (≈30s downtime; fine at MVP — add a second app container behind Caddy later for zero-downtime).
3. Migrations: `docker compose exec app npx prisma migrate deploy` (run before restart in the same script).
4. Keep a `deploy.sh` doing all three steps so updates are one command.

## 10. Ticket Changes vs Doc 05

- **T02** → "Postgres + Prisma schema + scoped-accessor layer (`lib/db-scoped.ts`) + cross-tenant 404 test" (replaces Supabase + RLS).
- **T03** → Auth.js credentials provider, bcrypt, verification + reset emails via SMTP; trial grant on first verified login (same acceptance criteria).
- **T10** → storage writes to `/data/storage`; advisory-lock credit transaction per §3.
- **T12** → guest page uses token-streamed files per §4.
- **T13** → cleanup script + host cron per §7 (replaces pg_cron).
- **NEW T00 · VPS provisioning** 🔴 — provision VPS, hardening checklist §8, Docker + Compose installed, domain DNS pointed, Caddy serving a hello-world over HTTPS. Do this in week 1 in parallel with T01.
- **NEW T13b · Backups** 🔴 — backup.sh + rclone to Google Drive + one verified restore. Before taking real payments.

Everything else (booth UI, presets, Razorpay, gallery, reports) is unchanged.

## 11. Using This With Antigravity IDE

- Drop all six docs into the project root as `/docs` and tell the agent to treat them as the source of truth.
- Feed tickets one at a time in order; after each, run the acceptance criteria yourself before moving on — agents drift when given ten tickets at once.
- Pin the two non-negotiables in your agent rules file: (1) every tenant query goes through `lib/db-scoped.ts`; (2) credits change only via the ledger helpers — no direct inserts elsewhere.
- Ask the agent to write the cross-tenant test and the double-spend test early (T02/T10); they're your safety net for everything it generates after.

## 12. Cost Summary (self-hosted)

- VPS ~₹600/mo + domain ~₹80/mo + SMTP free tier + Sentry/UptimeRobot free.
- Variable: Gemini ≈ ₹3–4/photo (unchanged).
- Fixed total ≈ ₹700/mo from day one — covered by a single Starter subscriber.

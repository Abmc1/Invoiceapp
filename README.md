# MotivAction Invoicing

A private, production-ready invoicing and client billing system built for **MotivAction** (Little Island, Cork), Audrey Burke McCarthy's leadership & executive coaching practice ([motivaction.ie](https://motivaction.ie)).

This is a standalone internal application — it is **not** part of the public MotivAction website and is not linked from it. It exists purely so MotivAction can manage clients, services, invoices and payments in one place, without spreadsheets.

> **This is not a template or prototype.** Every screen is backed by real database queries, real server-side calculations, and a real PDF generator. There is no mock data pretending to be real, and no button that doesn't do something.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Local development](#local-development)
- [Testing](#testing)
- [Production build](#production-build)
- [Deployment](#deployment)
- [Backups & restore](#backups--restore)
- [Accounting export](#accounting-export)
- [Email configuration](#email-configuration)
- [PDF generation](#pdf-generation)
- [Security](#security)
- [GDPR & data protection](#gdpr--data-protection)
- [Extending the system](#extending-the-system)
- [Troubleshooting](#troubleshooting)

## Features

- **Clients** — create, edit, archive, search; per-client history with total invoiced/paid/outstanding and average payment time.
- **Service catalogue** — Coaching, Executive Coaching, Workshops & Facilitation, Training, Organisation Development, EQ-i Assessment, Return to Work Programme, LEGO® SERIOUS PLAY®, and custom/tailored services, each with an editable default rate.
- **Invoices** — draft → finalise (Sent) → paid workflow, multi-line items with per-line tax and discount, live-calculated totals, void + replacement invoices, full audit trail.
- **Automatic, gap-free, concurrency-safe invoice numbering** (`MA-2026-0001`, configurable prefix/format).
- **Decimal-safe money math** throughout (`decimal.js`) — never native floating point.
- **PDF generation** with MotivAction branding, downloadable and emailable.
- **Payments** — record bank transfer / cash / card / other payments; invoice status updates automatically (Sent → Partially Paid → Paid).
- **Dashboard** — revenue, outstanding, overdue, invoice counts, recent activity.
- **Reports** — revenue by month/client/service, payments received, outstanding & overdue invoices.
- **CSV exports** — clients, invoices, payments, and a date-ranged accounting export for handing records to an accountant.
- **Configurable automated payment reminders** (before due / on due / N days overdue) — **off by default**, never sends anything until explicitly enabled.
- **Audit log** of every financial change (invoice created/finalised/voided, payment recorded, client/settings edited).
- **Role-based auth** (Admin/User), hashed passwords, database-backed sessions, rate-limited login. Every user gets a self-service **My Account** page to change their own password; company-wide settings (business info, invoice defaults, bank details, email, reminders, user management) are restricted to Admins — enforced both in the UI (non-admin tabs are hidden) and, more importantly, server-side in every settings Server Action, so a non-admin can't bypass the UI by calling an action directly.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript, strict mode |
| UI | React 19, Tailwind CSS v4, small hand-built shadcn-style component kit + Radix primitives |
| Database | PostgreSQL |
| ORM | Drizzle ORM (`drizzle-kit` for migrations) |
| Auth | Custom email/password + bcrypt + signed, database-backed sessions (`jose`) |
| PDF | `@react-pdf/renderer` |
| Email | Provider-agnostic abstraction; SMTP (`nodemailer`) or a "mock" (console-log) provider |
| Money | `decimal.js` — no floating-point arithmetic anywhere near currency |
| Tests | Vitest + an in-memory PGlite Postgres for integration tests |

## Architecture

```
src/
  app/                     Routes (App Router)
    login/                 Public login page + server action
    (app)/                 Authenticated route group (dashboard, invoices, clients, services, payments, reports, settings)
    api/                   Route handlers: PDF download, CSV exports, reminders cron
  components/              UI: shared kit (components/ui) + feature components
  db/                      Drizzle schema + database client
  lib/
    auth/                  Password hashing, sessions, rate limiting
    services/               Business/service layer — the "backend": clients, catalogue,
                             invoices, invoice numbering, payments, reports, export,
                             audit, users, settings, reminders
    email/                 Provider abstraction (mock / smtp) + templates
    pdf/                   Invoice PDF document + generator
    money.ts               Decimal-safe money math
  proxy.ts                 Optimistic auth redirect (Next.js 16's replacement for middleware)
scripts/
  migrate.ts               Runs SQL migrations against DATABASE_URL
  seed.ts                  Seeds development data
drizzle/                   Generated SQL migrations (committed)
```

**Why a service layer?** Every page, server action, and route handler calls into `src/lib/services/*` rather than querying the database directly. This is the "clean service layer" the app is built around — it's what makes the business logic (invoice numbering, tax calculation, payment status transitions) unit-testable in isolation from Next.js, and it's the seam where Stripe, Xero, a client portal, or recurring invoices could be added later without touching the UI.

**Auth model**: a signed (HS256) session cookie carries only an opaque session ID — never role or personal data. `src/proxy.ts` does a fast, cookie-signature-only check to redirect unauthenticated requests (Next.js discourages doing real authorization in Proxy). The actual, database-backed authorization check (`requireUser` / `requireAdmin` in `src/lib/auth/session.ts`) runs in every Server Component, Server Action and Route Handler that touches data — this is the real security boundary, not the proxy.

## Getting started

```bash
git clone <this repo>
cd motivaction-invoicing
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and AUTH_SECRET, see below
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in with the seeded development admin account printed by `db:seed` (default `a.burkemccarthy@motivaction.ie` unless overridden — **change the password immediately in a real deployment**, via Settings → Account once logged in).

**Every login requires a second factor**: after the correct password, a 6-digit code is emailed and must be entered on the following screen before a session is created. With the default `EMAIL_PROVIDER=mock`, that code isn't actually emailed — it's printed to the `npm run dev` terminal output instead (look for `[email:mock] --- text body ---`). Configure real SMTP (see [Email configuration](#email-configuration)) to have it arrive by email instead — including via Gmail, which this is set up for out of the box.

## Environment variables

See [`.env.example`](.env.example) for the full list with comments. The essentials:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. See [Database setup](#database-setup). |
| `AUTH_SECRET` | Yes | Signs session cookies, at least 32 characters. Generate with `openssl rand -base64 32`. |
| `APP_URL` | No | Public base URL, used in emails/links. |
| `EMAIL_PROVIDER` | No | `mock` (default, logs to console) or `smtp`. Login 2FA codes need a real provider to actually be emailed. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` | Only if `EMAIL_PROVIDER=smtp` | Pre-filled for Gmail (`smtp.gmail.com:587`) — see [Email configuration](#email-configuration). |
| `DB_POOL_MAX` | No | Postgres connection pool size, default 10. |
| `CRON_SECRET` | **Yes in production** | Bearer token protecting `/api/cron/reminders` — the endpoint refuses all requests in production until this is set. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | No | Used only by `npm run db:seed`. |

Never commit `.env` or `.env.local` — they're git-ignored. `.env.example` contains no real values.

## Database setup

This app needs a real PostgreSQL database — the schema uses native Postgres features (enums, `NUMERIC` for money, `jsonb`, `gen_random_uuid()`) that a SQLite-style database can't provide.

**This sandboxed development environment had no Docker, no `psql`, and no network access to provision a hosted database.** Everything up to that point — schema, migrations, the entire service layer, seed data, and the full automated test suite — was built and verified without one (see [Testing](#testing)). Standing up the actual PostgreSQL instance the running app connects to is the one step that genuinely requires you to supply a credential; here are the fastest ways to get one:

**Option A — a free hosted Postgres (recommended, 2 minutes, no install):**
1. Create a free database at [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the connection string into `DATABASE_URL` in `.env.local`. If it's a *pooled* connection string (PgBouncer/Neon pooler), that's fine — the app already sets `prepare: false`, which is required for pooled connections.
3. Run `npm run db:migrate && npm run db:seed`.

**Option B — Docker, if you have it:**
```bash
docker run --name motivaction-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=motivaction -p 5432:5432 -d postgres:16
```
Then `DATABASE_URL=postgres://postgres:postgres@localhost:5432/motivaction`.

**Option C — zero-install local Postgres via PGlite (experimental, for quick local poking only):**
```bash
npm run db:dev-server   # starts an embedded Postgres-wire-protocol server on :5433
```
Then set `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/postgres` in a separate terminal and run migrate/seed/dev as normal. **Caveat**: in testing this bridge (`@electric-sql/pglite-socket`) was flaky under Next.js's connection-pooled queries — reliable for `db:migrate`/`db:seed` and light use, but not something to depend on for anything resembling production. Use Option A or B for anything beyond a quick local look.

Migrations are plain SQL files in `drizzle/`, generated from `src/db/schema.ts` via `npm run db:generate` and applied with `npm run db:migrate` (uses `drizzle-orm`'s migrator, tracked in a `__drizzle_migrations` table — safe to re-run).

## Local development

```bash
npm run dev          # start the app (http://localhost:3000)
npm run db:studio    # visual database browser (Drizzle Studio)
```

## Testing

```bash
npm test             # run once
npm run test:watch   # watch mode
```

The suite (Vitest) runs against an **in-memory PGlite Postgres** — a real Postgres engine compiled to WASM, with no external services required — so `npm test` works in any environment, including this one. It covers:

- Decimal-safe money math: addition/rounding, €0 invoices, no-tax invoices, discounts applied before tax, multi-line totals — including the classic `0.1 + 0.2` floating-point trap.
- Invoice numbering, including **10 concurrent invoice creations never producing a duplicate number** (transactional row-locking).
- The full draft → finalise → void → replacement workflow, and that finalised invoices reject edits.
- Payments: partial payment → `PARTIALLY_PAID`, full payment → `PAID`, multiple payments across methods, rejecting payments on drafts/voided invoices.
- Overdue detection.
- Client CRUD, archiving, and per-client financial summaries.
- Password hashing/verification and password policy.
- Session creation, `requireUser`/`requireAdmin` authorization, deactivated-user rejection.
- Two-factor login codes: correct-code verification, wrong codes rejected without consuming the real one, single-use enforcement, lockout after 5 wrong attempts, a new code invalidating the previous one, and expiry.
- Self-service password change: correct current password required, new password checked against the policy.
- PDF generation (asserts a valid `%PDF-` file is produced for a real invoice).

## Production build

```bash
npm run typecheck    # tsc --noEmit
npm run lint          # eslint
npm test
npm run build         # next build
```

All four pass cleanly in this repository as delivered.

## Deployment

Designed for **Vercel + a managed Postgres** (Neon/Supabase), keeping platform-specific code to a minimum:

1. Push to a Git repo, import into Vercel.
2. Set the environment variables from `.env.example` in the Vercel project settings (`DATABASE_URL`, `AUTH_SECRET`, and email/`CRON_SECRET` if used).
3. Run `npm run db:migrate` against the production `DATABASE_URL` once (locally, or as a one-off Vercel deploy step) before first traffic.
4. Optionally wire up automated reminders: add to `vercel.json`
   ```json
   { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 8 * * *" }] }
   ```
   Reminders still only fire if enabled in Settings → Reminders.

Self-hosting elsewhere (a Node server, Docker) works the same way — `next build && next start`, with `DATABASE_URL` etc. set as real environment variables.

## Backups & restore

The database is the single source of financial truth — back it up like one.

- **Hosted Postgres (Neon/Supabase)**: both provide automatic daily backups and point-in-time recovery on their dashboards; no extra setup needed beyond choosing a plan with the retention window you want.
- **Self-managed Postgres**: schedule `pg_dump`:
  ```bash
  pg_dump "$DATABASE_URL" -Fc -f motivaction-backup-$(date +%Y%m%d).dump
  ```
  Restore with:
  ```bash
  pg_restore -d "$DATABASE_URL" --clean motivaction-backup-YYYYMMDD.dump
  ```
- **Migrating to a new database**: provision the new instance, point `DATABASE_URL` at it, run `npm run db:migrate` to create the schema, then `pg_dump`/`pg_restore` (or your provider's migration tool) to move the data.
- **Exporting just the invoicing records** (not a full DB backup, but useful for handing data to an accountant or archiving): use the CSV exports in Reports, or hit `/api/export/{clients,invoices,payments}` directly.

## Accounting export

Reports → **Accounting Export**: pick a date range and download a CSV with, per invoice: invoice number, client, invoice date, due date, net amount, tax, gross amount, payment status, last payment date, and payment reference(s) — the fields an accountant actually needs. This does not replace bookkeeping software; it makes handing off records fast.

## Email configuration

Emails go through a small provider abstraction (`src/lib/email`):

- **`EMAIL_PROVIDER=mock`** (default): nothing is actually sent. The email is logged to the server console, and the UI/audit trail honestly report `mocked: true` — the app never pretends an email was delivered when it wasn't. This includes 2FA login codes, so local development still works end-to-end without any SMTP setup — just read the code from the terminal.
- **`EMAIL_PROVIDER=smtp`**: sends real email via `nodemailer`, configured with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`. Works with any standard SMTP provider.

Adding a new provider (e.g. a provider-specific HTTP API) means implementing the small `EmailProvider` interface in `src/lib/email/provider.ts` — nothing else in the app needs to change.

### Sending via Gmail

`.env.example` is pre-filled with Gmail's SMTP host, so this is just filling in three values:

1. Turn on **2-Step Verification** on the Gmail account: [myaccount.google.com/security](https://myaccount.google.com/security)
2. Create an **App Password**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) (choose "Mail" / "Other")
3. In `.env.local`:
   ```bash
   EMAIL_PROVIDER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=youraddress@gmail.com
   SMTP_PASSWORD=the-16-character-app-password
   EMAIL_FROM="MotivAction <youraddress@gmail.com>"
   ```
   Use the **App Password**, not the normal Gmail password — Gmail's SMTP relay rejects the latter. Gmail also generally requires `EMAIL_FROM` to match (or be an alias of) the authenticated account, or it will silently override the From header.

## PDF generation

`src/lib/pdf/InvoiceDocument.tsx` renders a professional, branded invoice (MotivAction's crimson/near-black palette, company + client details, line items, subtotal/discount/tax/total, amount due, bank details, payment terms, footer) via `@react-pdf/renderer`, streamed from `GET /api/invoices/[id]/pdf`. The same layout is mirrored as an HTML preview at `/invoices/[id]/preview` for on-screen review before sending.

## Security

**Authentication**
- Two-factor login: password, then a 6-digit, single-use, 10-minute code emailed as a second factor (`src/lib/services/login-otp.ts`). Codes are stored bcrypt-hashed (never plaintext), capped at 5 verification attempts each, and issuing a new code invalidates any previous unconsumed one. The "pending 2FA" state between the two steps lives in its own short-lived signed cookie that carries zero authorization on its own — it cannot be used to reach any protected route or data, only to complete the OTP step for a specific account.
- Passwords hashed with bcrypt (12 rounds); a minimum password policy (8+ chars, letter + number) is enforced server-side on both signup and change.
- Every user can change their own password (Settings → Account); doing so immediately invalidates every other active session for that account, so a session cookie stolen before the change stops working right away rather than staying valid for up to 7 more days.

**Sessions**
- Database-backed (individually revocable) and identified by a signed (HS256), httpOnly, `secure` (in production), `sameSite=strict` cookie carrying only an opaque session ID — never role or personal data, so authorization is always re-checked against the database, not trusted from the cookie.
- Every Server Action and Route Handler re-checks authentication/authorization server-side (`requireUser`/`requireAdmin`) — client-side route hiding (e.g. which Settings tabs are shown) is a UX nicety, never the actual security boundary.

**Rate limiting** (in-memory sliding window; see the note in `src/lib/auth/rate-limit.ts` about swapping in a shared store like Upstash/Redis if this ever scales beyond one instance)
- Login: limited per account *and* per IP independently — the per-account limit stops one target being brute-forced from anywhere, the per-IP limit stops one source enumerating many accounts.
- OTP verification and resend: capped separately from login itself.
- Password change: capped, so a valid but stolen session cookie can't be used to brute-force the "current password" check.
- The reminders cron endpoint: capped even when called with a correct `CRON_SECRET`, in case that secret ever leaks.

**Headers & transport**
- `Content-Security-Policy` is generated per-request in `src/proxy.ts` with a fresh nonce on every response, so `script-src` needs no `'unsafe-inline'`/`'unsafe-eval'` in production — a script can only run if it carries that exact request's nonce. (`style-src` still allows `'unsafe-inline'`: Tailwind emits its CSS as a single build-time `<style>` tag with no way to attach a nonce — a narrower, accepted trade-off, since injected CSS can't execute arbitrary script.)
- `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a locked-down `Permissions-Policy` are set globally in `next.config.ts`; `X-Powered-By` is suppressed.
- Server Actions get Next.js's built-in same-origin CSRF protection; the only state-changing endpoints outside Server Actions are the cron route (bearer-token protected, fails closed without `CRON_SECRET` in production) — every CSV/PDF export route is a read-only, authenticated GET.

**Input handling & data integrity**
- Every mutating Server Action validates its input with `zod` (or an equivalent explicit check) before it reaches the service layer — including payment amounts, dates, and enum fields, which previously relied on a raw Postgres constraint error rather than a clean validation message.
- All database access goes through Drizzle's parameterized query builder or tagged `sql` templates — no raw string-concatenated SQL anywhere, so there's no SQL injection surface.
- All monetary values are `NUMERIC` columns in Postgres and are only ever manipulated through `decimal.js` — never native floating point.
- No `dangerouslySetInnerHTML`, `eval`, or `new Function` anywhere in the codebase.

**Secrets & infrastructure**
- No secrets are ever committed; `.env*` is git-ignored except `.env.example`. `AUTH_SECRET` must be at least 32 characters (enforced at startup) and SMTP credentials live only in environment variables, never in the database.
- Database credentials never reach the browser — all DB access is server-only (`server-only` package enforced at the module level).
- `npm audit` currently reports 4 moderate advisories, all in `drizzle-kit`'s own dev-time dependency chain (an `esbuild` dev-server CORS issue) — this only affects `drizzle-kit`'s local CLI tooling (e.g. `db:studio`), never ships in the app, and the only available fix is a major downgrade of `drizzle-kit` itself, which isn't a good trade for a dev-only, low-relevance issue. Re-check this periodically with `npm audit`.

## GDPR & data protection

- **Data minimisation**: client records capture only what's needed to invoice (name/company, billing address, tax number, contact details) — no unnecessary tracking or analytics are built in.
- **Archiving**: clients and services are archived (soft-deleted), never hard-deleted by default, so financial history stays intact.
- **Right to erasure**: a client with no invoices can be safely deleted at the database level (foreign key from `invoices.client_id` uses `ON DELETE RESTRICT`, so this is only possible once their invoice history is dealt with — which is itself a GDPR-compliant safeguard against silently destroying financial records). For a client *with* invoice history, anonymise personal fields (name, email, phone, address) directly via SQL or Drizzle Studio rather than deleting the row, preserving the financial record.
- **Audit trail**: every financial change is logged in `audit_logs` with who/what/when.
- **No client data is ever sent to an AI service** — this application makes no calls to any LLM/AI API at runtime.
- **Dev/prod separation**: seed data is clearly fictional and marked development-only; production and development should always use separate `DATABASE_URL`s.

## Extending the system

The service-layer boundaries were kept clean specifically so these can be added later without a rewrite:

- **Stripe / online payments** — add a provider alongside `src/lib/services/payments.ts`'s `recordPayment`, triggered by a webhook instead of a form.
- **Xero / QuickBooks** — a sync job reading from the same `invoices`/`payments` tables the accounting export already uses.
- **Client portal** — the `invoiceEvents` table already has a `VIEWED` event type ready to wire up; add a public, token-authenticated route.
- **Recurring invoices** — a scheduled job calling `createInvoice` with a saved template, the same function the UI already uses.
- **Quotes/estimates** — a new `quotes` table + a "convert to invoice" action reusing `createInvoice`.

## Troubleshooting

- **`DATABASE_URL is not set`** — copy `.env.example` to `.env.local` and fill in a real Postgres connection string (see [Database setup](#database-setup)).
- **`AUTH_SECRET is not set (or too short)`** — generate one: `openssl rand -base64 32`.
- **Login succeeds but every page 500s** — almost always a database connectivity issue (wrong `DATABASE_URL`, database asleep on a free-tier host, or — if you're using the experimental `db:dev-server` — its known flakiness under load; switch to Option A or B).
- **`EMAIL_PROVIDER=smtp` but nothing arrives** — check `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`EMAIL_FROM` are all set; the app throws a clear configuration error rather than silently failing if they're missing.
- **Invoice numbers look wrong after changing the format in Settings** — the format only applies going forward; already-issued invoice numbers are never rewritten (by design — see [Data integrity](#security)).

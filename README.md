# Hostel Mess Access Control System

Admin / warden / resident portal for managing hostel mess access: hostel &
mess management, resident onboarding, QR + PIN mess entry with an atomic
4-entries-per-day cap, entry history, reports, and an audit log.

Built with Next.js (App Router) + TypeScript + Tailwind CSS on the frontend,
Next.js API routes + `pg` (node-postgres) on the backend, and standard
PostgreSQL for storage (tested against Render PostgreSQL). No ORM, no
Supabase, no Bolt.

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- `pg` for raw SQL against PostgreSQL
- `bcryptjs` for password/PIN hashing
- Custom server-side session auth (random token, SHA-256 hash stored in DB,
  HttpOnly/Secure/SameSite cookie) — no third-party auth provider
- `qrcode` to render each resident's QR code
- `zod` for request validation

## Project layout

```
migrations/           Plain SQL migrations, applied in filename order
scripts/migrate.mjs    Migration runner (tracks applied files in schema_migrations)
scripts/seed.mjs        Creates/updates the bootstrap admin account
src/lib/                 db, auth, session, password, audit, id helpers
src/middleware ("proxy") Coarse redirect gate for /admin, /warden, /resident
src/app/api/**           Route handlers (real authorization happens here)
src/app/{admin,warden,resident}/  Role dashboards (server-guarded layouts)
src/app/login, /invite/[token], /change-password  Public/auth pages
src/components/**        Client-side panels used by the dashboards
```

## Environment variables

Copy `.env.example` to `.env.local` for development:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
PGSSL=                       # set to "disable" only for local Postgres without SSL
SESSION_COOKIE_NAME=hmac_session
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_ADMIN_NAME=System Admin
```

In production (e.g. Render), set `DATABASE_URL` from your Render PostgreSQL
instance's connection string and leave `PGSSL` unset (SSL is required and
enabled by default).

## Setup

```bash
npm install
npm run migrate   # applies migrations/*.sql, tracked in schema_migrations
npm run seed      # creates/updates the bootstrap admin from SEED_ADMIN_* env vars
npm run dev       # http://localhost:3000
```

Log in as the seeded admin, then from the Admin dashboard:

1. Create a hostel and a mess under it.
2. Either create a resident directly (a one-time temporary password is
   shown once) or send an invite link (Admin → Invites, or Warden →
   "Invite resident") for self-registration.
3. Invite a warden and assign them to a hostel (Admin → Invites → role
   "warden").

Residents set their own mess-entry PIN and view their QR code from their
dashboard after first login. Wardens (or admins) use the "Mess entry" tab
to scan/paste a resident's QR code, enter the resident's PIN, choose the
meal and mess, and record the entry.

## Data model highlights

- `users` holds all three roles (`admin` | `warden` | `resident`); `wardens`
  and `residents` extend it with role-specific fields (hostel assignment,
  room number, QR token, PIN hash).
- `sessions` stores only a SHA-256 hash of the session token; the raw token
  lives solely in the HttpOnly cookie.
- The 4-entries-per-day cap is enforced **atomically** in Postgres via a
  single `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE approved_count < 4
  RETURNING` statement against `resident_daily_counters` — concurrent scans
  cannot race past the limit. A partial unique index on `mess_entries`
  additionally prevents two approved entries for the same resident/date/meal.
- Every mess-entry attempt (approved or rejected, and why) is recorded in
  `mess_entries`; every security-relevant action (logins, entry
  approvals/rejections, resident/hostel/mess changes, invites) is recorded
  in `audit_log`.

## Authorization model

- Every API route independently re-verifies the session against the
  database and checks the caller's role — the `proxy.ts` redirect gate is a
  UX convenience only, never the source of truth.
- Wardens are scoped to their assigned hostel at the query level (residents,
  messes, invites, reports, entry history all filter by `hostel_id`).
- Residents can only read their own profile/QR/PIN/history; they have no
  access to admin/warden endpoints (enforced server-side, verified in
  testing — see below).

## Testing performed

Type-checking (`tsc --noEmit`), linting (`next lint`), and a full production
build (`next build`) all pass. The complete flow was smoke-tested against a
live Render PostgreSQL database via the running dev server:

- Admin login, hostel/mess/resident creation
- Resident login, forced password change, PIN setup, QR retrieval
- Warden onboarding via invite link, hostel-scoped resident/mess visibility
- Mess entry: approved entry, duplicate-meal rejection, wrong-PIN rejection,
  and confirmed the 4th entry succeeds while a 5th same-day entry is
  rejected with `daily_limit_reached`
- Authorization boundaries: resident blocked (403) from admin endpoints and
  redirected away from `/admin`; warden blocked (403) from hostel-creation

No automated test suite was added (not requested); the above was verified
manually end-to-end against real Postgres, not mocked.

## Production configuration notes

- Set `DATABASE_URL` to your Render PostgreSQL instance.
- Run `npm run migrate` (and `npm run seed` once) as part of your deploy step.
- `NODE_ENV=production` makes session cookies `Secure` (HTTPS required).
- Nothing in this project has been deployed by the assistant — deploy when
  you're ready.

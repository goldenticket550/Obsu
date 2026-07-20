# CURRENT STATE

**As of:** OBSIDIAN RIDES MVP — M3 (Database layer) **complete and verified** (2026-07-19).
**Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`).
**Current sub-phase:** M3 — Database. ✅ **Complete and verified against live Supabase.**
**Next sub-phase:** M4 — Basic CRUD (do NOT start until the owner says go).

## What exists right now

**Documentation:** the Phase-0 doc set + `CUSTOMER_ZERO_FEEDBACK.md`.

**Application — `apps/web`, a single Next.js 14 app:**
```
apps/web/
  config: package.json, tsconfig (strict), next/tailwind/postcss/eslint, .env.local.example
  .env.local                            # LOCAL ONLY, git-ignored — real Supabase keys
  src/
    middleware.ts                       # M2: session refresh + route protection
    app/
      layout.tsx, globals.css
      page.tsx                          # dashboard — M2: protected + personalized w/ business name
      login/    page.tsx, actions.ts    # M2: sign in / sign up / sign out
      onboarding/ page.tsx, actions.ts  # M2: create your business (org)
    components/ dashboard.tsx           # pure UI
    lib/
      db/  env.ts, supabase-client.ts, supabase-server.ts, supabase-middleware.ts
      types/ index.ts                   # MVP domain types — M3: aligned to the 0002 columns (cents)
supabase/
  migrations/
    0001_organizations.sql              # M2: organizations + memberships + RLS + create_organization()
    0002_business_tables.sql            # M3: customers, vehicles, trips, expenses + RLS (is_member_of)
  seed_dev.sql                          # M3: OPTIONAL removable dev seed — NOT run
```

**Folder scaffold (placeholders for later extraction):** `packages/*`, `verticals/*`, `integrations/*` (ADR-010).

## What works / what does NOT yet

- **M1 (verified):** app boots; styled dashboard shell renders; Next.js 14.2.35.
- **M2 (verified running):** email/password auth, first-run business creation, protected personalized dashboard, sign out. RLS on organizations/memberships; org creation via SECURITY DEFINER `create_organization()` RPC. Confirmed end-to-end on the owner's machine: sign in → create "Midnight Rydes" → dashboard.
- **M3 (verified):** the business data model — `customers`, `vehicles`, `trips`, `expenses` (migration `0002_business_tables.sql`). Money is integer **cents** (`revenue_cents`, `hourly_rate_cents`, `amount_cents`); timestamps UTC; trips support both flat and hourly pricing (`revenue_cents` is the source-of-truth total; `hours`+`hourly_rate_cents` optional). All four tables have RLS `for all` policies scoped via the existing `public.is_member_of(organization_id)` (reused from M2, not redefined). `src/lib/types/index.ts` matches the columns exactly; derived `last_booking_date`/`lifetime_revenue` are intentionally NOT stored on `Customer` (computed in M5, ADR-011). `tsc --noEmit` clean; app boots on 3001.
  - **Verified against live Supabase (2026-07-19):** an authenticated Midnight Rydes member can insert + read a row in each of the four tables (RLS self-test, rolled back — no residue); an anonymous/anon-key read of each table returns empty (`200 []`). RLS working.
- **Not yet:** CRUD UI (M4), business calc services + tests (M5), live dashboard numbers (M6), Ask OBSIDIAN (M7), NL trip entry (M8), customer intelligence (M9). No voice/SMS/other excluded features.

## Environment / setup notes (owner's machine)

- **Runs on port 3001** (`npm run dev -- -p 3001` from `apps/web`) — port 3000 is the owner's Trading Scanner.
- Node 24.x, npm 11.x, Next.js 14.2.35.
- **Supabase project `hspfhyundcytxginsovh` (labeled "Obsidian Rides") is intentionally SHARED with the Trading Scanner** (owner's explicit decision). RIDES tables + RLS live in that DB. Keys come from `apps/web/.env.local` only (git-ignored). Deliberate Customer-Zero convenience; revisit before any real multi-tenant launch.
- **DDL is applied by hand in the Supabase SQL Editor** — the owner's `.env5.txt` has empty `DATABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, and there's no local `psql`/`pg`, so migrations can't be applied programmatically from here. Both `0001` and `0002` are applied. Migrations are idempotent/safe to re-run.
- **Auth gotcha:** sign-in only succeeds for a **confirmed** user; if it fails with "Email not confirmed", confirm the user (Authentication → Users) or turn off Providers → Email → "Confirm email". Use **Sign in** (user pre-created).

## Fixes / changes made in the M2–M3 sessions

- M2: typed the Supabase `setAll` cookie callbacks in `lib/db/supabase-server.ts` and `lib/db/supabase-middleware.ts` (strict TS).
- M3: renamed money fields to `*_cents` in `types/index.ts` and removed derived fields from the base `Customer` type. No code referenced the old names. `tsc --noEmit` clean.

## ⛔ Deferred — must-do before going multi-user (HARD GATE)

- **Negative second-user tenant-isolation test.** Confirm a *second* user (in a second org) cannot see Midnight Rydes' rows in `organizations/memberships` **and** in `customers/vehicles/trips/expenses`. Structurally enforced today (RLS on, `is_member_of()` policies, anon reads return empty), but a **live second-user check has not been run**. It needs a second login (owner to run).
- **This is intentionally paused** until the MVP works end-to-end for the single Customer-Zero user (Midnight Rydes) — it is not a blocker for M4–M9 single-tenant work.
- **HARD GATE:** do **NOT** onboard any second real user or business until this test passes. First real multi-user/multi-tenant step is blocked on it.

## Decisions locked in

ADR-001…011 (see `docs/DECISIONS.md`). Key: modular monolith; AI calls tools not tables; answers from structured data; tenancy via RLS; RIDES-first single app (ADR-010); lean data model (ADR-011); one Transaction concept but MVP splits trips/expenses per the pasted M3 schema.

## Next action

**M4 — Basic CRUD:** add/view/edit for Customers, Trips, Expenses (and Vehicles), tested with real Midnight Rydes data. **Only after the owner confirms M3 and says go.** One sub-phase at a time; stop and verify. See `docs/ROADMAP.md`.

## Git

Repository initialized. Commits: Phase 0 foundation; RIDES-MVP planning; M1 foundation; Next.js 14.2.35 security patch; M2 auth + organization (verified); **M3 database layer (verified)**.

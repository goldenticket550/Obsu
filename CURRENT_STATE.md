# CURRENT STATE

**As of:** OBSIDIAN RIDES MVP — M4 (Basic CRUD) **code complete + statically verified** (2026-07-19).
**Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`).
**Current sub-phase:** M4 — Basic CRUD. ✅ **Built & statically verified; owner to confirm real-data round-trips.**
**Next sub-phase:** M5 — Business engine (do NOT start until the owner says go).

## What exists right now

**Documentation:** the Phase-0 doc set + `CUSTOMER_ZERO_FEEDBACK.md`.

**Application — `apps/web`, a single Next.js 14 app:**
```
apps/web/
  .env.local                            # LOCAL ONLY, git-ignored — real Supabase keys
  src/
    middleware.ts                       # M2: session refresh + route protection
    app/
      layout.tsx, globals.css
      page.tsx                          # dashboard — M2 protected; M4 wires Quick Actions,
                                        #   nav, and a Recent Activity feed (raw rows, no math)
      login/    page.tsx, actions.ts    # M2
      onboarding/ page.tsx, actions.ts  # M2
      customers/  page.tsx, actions.ts, new/page.tsx, [id]/edit/page.tsx   # M4
      trips/      page.tsx, actions.ts, new/page.tsx, [id]/edit/page.tsx   # M4
      expenses/   page.tsx, actions.ts, new/page.tsx, [id]/edit/page.tsx   # M4
    components/
      dashboard.tsx                     # pure UI (QuickAction now supports an href)
      form.tsx                          # M4: form + page-chrome primitives (Field, Select, TopBar…)
      customer-form.tsx, trip-form.tsx, expense-form.tsx                    # M4 forms
    lib/
      money.ts                          # M4: dollarsToCents / centsToDollars / optionalDollarsToCents
      enums.ts                          # M4: enum option lists + labelize()
      form.ts                           # M4: FormData parse/validate helpers
      db/  env.ts, supabase-client.ts, supabase-server.ts, supabase-middleware.ts,
           org.ts (getCurrentOrgId), customers.ts, trips.ts, expenses.ts    # M4 data access
      types/ index.ts                   # domain types (cents)
supabase/
  migrations/ 0001_organizations.sql, 0002_business_tables.sql
  seed_dev.sql                          # OPTIONAL — NOT run
```

**Folder scaffold (placeholders):** `packages/*`, `verticals/*`, `integrations/*` (ADR-010).

## What works / what does NOT yet

- **M1–M3 (verified):** boot + styled shell (M1); auth + org + protected dashboard (M2); customers/vehicles/trips/expenses tables + RLS (M3).
- **M4 (built + statically verified):** CRUD **screens** for Customers, Trips, Expenses (add / view / edit — **no delete, no vehicle screen, no analytics** this phase, by scope).
  - **Money boundary:** forms take dollars, store integer cents via `src/lib/money.ts`; displayed back as `$x.xx`. Negatives/invalid rejected.
  - **Org stamping:** every insert/update sets `organization_id` from `getCurrentOrgId()` (read from memberships via RLS) so `WITH CHECK (is_member_of(...))` passes. Client-supplied org ids are never trusted.
  - **Trips:** one easy `/trips/new` form — customer by name (**find-or-create**, case-insensitive, per org), route/type/payment/status, revenue ($, source of truth), optional hours + hourly rate, mileage, notes, and **inline costs** (gas/tolls/other → linked expense rows for amounts > $0). Edit form omits inline costs (linked expenses are edited on the Expenses screens).
  - **Reads in server components, writes in server actions**, all via the RLS-enforced Supabase server client. Business logic in `src/lib`, not components.
  - **Dashboard:** Quick Actions link to the new pages; a nav (Customers/Trips/Expenses) added; Recent Activity shows the latest trips/expenses (raw rows). This-Month stat cards stay `—` (M6); Ask OBSIDIAN stays disabled (M7).
  - **Verified:** `tsc --noEmit` clean; `next build` compiles all 12 routes; dev boots on 3001; protected routes redirect to `/login`; money/validation logic unit-tested (17/17). **Owner-pending:** the signed-in functional round-trips (add customer, log trip w/ inline costs, reuse existing customer, edit) — the assistant can't enter the owner's password; owner will test with real Midnight Rydes data.
- **Not yet:** business calc services + tests (M5), live dashboard numbers (M6), Ask OBSIDIAN (M7), NL trip entry (M8), customer intelligence (M9).

## ⛔ Deferred — must-do before going multi-user (HARD GATE)

- **Negative second-user tenant-isolation test.** A second user (second org) must see **none** of Midnight Rydes' rows in `organizations/memberships` **and** `customers/vehicles/trips/expenses`. Structurally enforced (RLS on, `is_member_of()` policies, anon reads empty), but **not yet run live**. Needs a second login (owner).
- **Intentionally paused** until the MVP works end-to-end for the single Customer-Zero user; not a blocker for single-tenant M5–M9.
- **HARD GATE:** do **NOT** onboard any second real user/business until this test passes.

## Environment / setup notes (owner's machine)

- **Runs on port 3001** (`npm run dev -- -p 3001` from `apps/web`) — port 3000 is the Trading Scanner.
- Node 24.x, npm 11.x, Next.js 14.2.35. Supabase project `hspfhyundcytxginsovh` ("Obsidian Rides") is intentionally **shared** with the Trading Scanner (owner's decision). Keys in `apps/web/.env.local` (git-ignored).
- **DDL applied by hand in the Supabase SQL Editor** (empty `DATABASE_URL`/service-role in `.env5.txt`; no local `psql`/`pg`). Migrations 0001 + 0002 applied.
- **Auth gotcha:** sign-in needs a **confirmed** user; else "Email not confirmed" → confirm in Authentication → Users. Use **Sign in** (user pre-created).

## Next action

**M5 — Business engine:** deterministic calc services (revenue, expenses, est. profit, trip/customer stats, date ranges) **+ unit tests**, in `src/lib` (business logic separate from UI). Money stays in cents. **Only after the owner confirms M4 with real data and says go.** One sub-phase at a time; stop and verify.

## Git

Commits: Phase 0; RIDES-MVP planning; M1 foundation; Next.js 14.2.35 patch; M2 auth + organization (verified); M3 database layer (verified); multi-user HARD GATE doc; **M4 basic CRUD**.

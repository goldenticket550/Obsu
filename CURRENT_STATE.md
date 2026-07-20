# CURRENT STATE

**As of:** OBSIDIAN RIDES MVP — M5 (Business engine) **complete** (2026-07-20).
**Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`).
**Current sub-phase:** M5 — Business engine. ✅ **Complete: pure calc functions + unit tests (30 passing).**
**Next sub-phase:** M6 — Dashboard (wire these calcs into real numbers). Do NOT start until the owner says go.

## What exists right now

**Documentation:** the Phase-0 doc set + `CUSTOMER_ZERO_FEEDBACK.md`.

**Application — `apps/web`, a single Next.js 14 app:**
```
apps/web/
  vitest.config.ts                      # M5: test config (@ alias -> ./src)
  .env.local                            # LOCAL ONLY, git-ignored
  src/
    middleware.ts                       # M2 route protection
    app/  layout, globals, page.tsx (dashboard), login/, onboarding/,
          customers/, trips/, expenses/  (M2 + M4)
    components/ dashboard.tsx, form.tsx, {customer,trip,expense}-form.tsx
    lib/
      money.ts, enums.ts, form.ts
      business/                         # M5 — PURE calc engine (no DB, no clock inside calcs)
        revenue.ts       totalRevenueCents / tripCount / averageTripValueCents
        expenses.ts      totalExpensesCents / expensesByCategoryCents
        profit.ts        estimatedTripProfitCents / estimatedOperatingProfitCents
        trip-rates.ts    revenuePerHourCents / revenuePerMileCents
        customers.ts     customerLifetimeRevenueCents / customerTripCount / topCustomers
        date-range.ts    filterByDateRange (pure) + currentMonthRange (thin, clock-aware)
        index.ts         re-exports
        __factories.ts   test-only row builders
        *.test.ts        vitest unit tests (30 cases)
      db/  env, supabase-client, supabase-server, supabase-middleware, org, customers, trips, expenses
      types/ index.ts
supabase/ migrations/0001, 0002 ; seed_dev.sql (NOT run)
```

**Folder scaffold (placeholders):** `packages/*`, `verticals/*`, `integrations/*` (ADR-010).

## What works / what does NOT yet

- **M1–M4 (verified):** boot + shell; auth + org + protected dashboard; DB tables + RLS; CRUD screens for Customers/Trips/Expenses (owner-confirmed with real data).
- **M5 (complete):** deterministic business-calc engine in `src/lib/business`, all **pure** (inputs = already-fetched arrays + explicit date bounds; outputs = integer cents / counts / null). Definitions (owner-confirmed): revenue counts **completed** trips only; estimated trip profit = `revenue_cents − sum(linked expenses)`; estimated operating profit = completed revenue − **all** expenses in scope (incl. overhead). Averages/ratios use `Math.round`; per-hour/mile return `null` when the divisor is missing. The only clock-aware piece, `currentMonthRange` (America/New_York), is isolated for M6 callers to pass into the pure calcs.
  - **Verified:** `tsc --noEmit` clean; **`npm test` → 30/30 pass** (empty inputs, canceled excluded, linked-expense subtraction, non-round amounts like a $7.50 toll, rounding, null per-hour/mile, operating profit incl. standalone overhead, NY month boundary); `next build` OK; dev boots on 3001. **No UI/dashboard wiring** (that is M6) — nothing added to components.
- **Not yet:** live dashboard numbers (M6 — wire M5 calcs into the widgets), Ask OBSIDIAN (M7), NL trip entry (M8), customer intelligence (M9).

## ⛔ Deferred — must-do before going multi-user (HARD GATE)

- **Negative second-user tenant-isolation test.** A second user (second org) must see **none** of Midnight Rydes' rows in any table. Structurally enforced (RLS + `is_member_of()`, anon reads empty) but **not yet run live**. Needs a second login (owner). Intentionally paused until the MVP works end-to-end; not a blocker for single-tenant M6–M9. **HARD GATE:** do NOT onboard a second real user/business until it passes.

## Environment / setup notes (owner's machine)

- **Port 3001** (`npm run dev -- -p 3001` from `apps/web`); port 3000 is the Trading Scanner. Node 24, npm 11, Next 14.2.35.
- **Tests:** `npm test` (vitest, added M5). Supabase project `hspfhyundcytxginsovh` shared with the Trading Scanner (owner's decision); keys in `apps/web/.env.local` (git-ignored).
- **DDL applied by hand in the Supabase SQL Editor** (empty `DATABASE_URL`/service-role; no local `psql`/`pg`). Migrations 0001 + 0002 applied.
- **Auth gotcha:** sign-in needs a **confirmed** user; use **Sign in** (user pre-created).

## Next action

**M6 — Dashboard:** wire the M5 calc engine into the dashboard widgets (This-Month revenue/expenses/est. profit/trips, recent trips, customer insights) using real org-scoped data + `currentMonthRange`. Keep calcs in `src/lib/business` (pure); the dashboard only fetches + formats. Money formatted to dollars at the view layer. **Only after the owner says go.** One sub-phase at a time; stop and verify.

## Git

Commits: Phase 0; RIDES-MVP planning; M1; Next.js 14.2.35 patch; M2 (verified); M3 (verified); multi-user HARD GATE doc; M4 CRUD; M4 verified; **M5 business engine**.

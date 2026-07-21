# CURRENT STATE

**As of:** OBSIDIAN RIDES MVP — M6 (Dashboard wiring) **built + statically verified** (2026-07-20).
**Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`).
**Current sub-phase:** M6 — Dashboard. ✅ **Built & statically verified; owner to confirm the live This-Month numbers with real data.**
**Next sub-phase:** M7 — Ask OBSIDIAN (do NOT start until the owner says go).

## What exists right now

**Documentation:** the Phase-0 doc set + `CUSTOMER_ZERO_FEEDBACK.md`.

**Application — `apps/web`, a single Next.js 14 app:**
```
apps/web/
  vitest.config.ts
  src/
    middleware.ts
    app/
      page.tsx          # dashboard — M6: live This-Month numbers, avg trip, top customers
      login/, onboarding/, customers/, trips/, expenses/    (M2 + M4)
    components/ dashboard.tsx, form.tsx, {customer,trip,expense}-form.tsx
    lib/
      money.ts          # centsToDollars (now grouped) + formatUsd (M6)
      enums.ts, form.ts
      business/         # M5 pure calc engine (used by the dashboard in M6) + tests
      db/  env, supabase-client, supabase-server, supabase-middleware, org,
           customers, trips, expenses
      types/ index.ts
supabase/ migrations/0001, 0002 ; seed_dev.sql (NOT run)
```

## What works / what does NOT yet

- **M1–M5 (verified):** boot/shell; auth+org+protected dashboard; DB tables+RLS; CRUD screens (owner-confirmed); pure business-calc engine + 30 unit tests.
- **M6 (built + statically verified):** the dashboard now shows **real numbers**. The server component fetches this org's trips/expenses/customers (RLS-scoped), computes the current month via `currentMonthRange()` (America/New_York) + `filterByDateRange()`, and calls the M5 pure calcs:
  - **This Month cards:** Revenue = `totalRevenueCents(monthTrips)`; Recorded Expenses = `totalExpensesCents(monthExpenses)`; Est. Operating Profit (accent, "Estimated" label) = `estimatedOperatingProfitCents(monthTrips, monthExpenses)`; Trips = `tripCount(monthTrips)`.
  - **Average trip value line** = `averageTripValueCents(monthTrips)`; kept the "estimate … not audited net income" note.
  - **Customer Insights:** `topCustomers(allTrips, customers, 3)` (name, lifetime revenue, trip count; zero-revenue filtered out). No retention/inactive detection (that's M9).
  - **Recent Activity:** unchanged from M4 (latest raw trips/expenses).
  - Money formatted via `formatUsd` (thousands separators, `$7.50` for 750¢, `-$5.00` for negatives). Empty month → `$0.00` / `0` gracefully. **All math stays in `src/lib/business`; the dashboard only fetches + formats.**
  - **Verified:** `tsc --noEmit` clean; M5 tests 30/30; money formatting checked; `next build` (12 routes) OK; dev boots on 3001; routes protected. **Owner-pending:** confirm the live This-Month numbers are correct against real Midnight Rydes data (assistant can't drive the signed-in dashboard).
- **Not yet:** Ask OBSIDIAN (M7 — Claude API + safe tools), NL trip entry (M8), customer intelligence (M9), field test (M10).

## ⛔ Deferred — must-do before going multi-user (HARD GATE)

- **Negative second-user tenant-isolation test.** A second user (second org) must see **none** of Midnight Rydes' rows in any table. Structurally enforced (RLS + `is_member_of()`, anon reads empty) but **not yet run live**; needs a second login (owner). Intentionally paused until the MVP works end-to-end; not a blocker for single-tenant M7–M9. **HARD GATE:** do NOT onboard a second real user/business until it passes.

## Environment / setup notes (owner's machine)

- **Port 3001** (`npm run dev -- -p 3001` from `apps/web`); 3000 is the Trading Scanner. Node 24, npm 11, Next 14.2.35. `npm test` = vitest.
- Supabase project `hspfhyundcytxginsovh` shared with the Trading Scanner (owner's decision); keys in `apps/web/.env.local` (git-ignored). DDL applied by hand in the SQL Editor; migrations 0001 + 0002 applied.
- **Auth gotcha:** sign-in needs a **confirmed** user; use **Sign in** (user pre-created).

## Next action

**M7 — Ask OBSIDIAN:** Claude API + a safe, schema-typed tool layer (getRevenueSummary, getExpenseSummary, getTopCustomers, getCustomerHistory, getTripSummary, getInactiveCustomers, getBusinessPerformance) so the assistant answers from **structured data via tools, never fabricated numbers** (ADR-002/003). Reuse the M5 calcs behind the tools. **Only after the owner confirms M6 and says go.** One sub-phase at a time; stop and verify.

## Git

Commits: Phase 0; planning; M1; Next 14.2.35 patch; M2; M3; HARD GATE doc; M4; M4 verified; M5 business engine; **M6 dashboard wiring**.

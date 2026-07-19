# CURRENT STATE

**As of:** OBSIDIAN RIDES MVP — M2 (Auth + Organization) **verified running** (2026-07-19).
**Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`).
**Current sub-phase:** M2 — Auth + Organization. ✅ **Complete and verified end-to-end on the owner's machine.**
**Next sub-phase:** M3 — Database (do NOT start until the owner says go).

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
      types/ index.ts                   # MVP domain types
supabase/
  migrations/0001_organizations.sql     # M2: organizations + memberships + RLS + create_organization()
```

**Folder scaffold (placeholders for later extraction):** `packages/*`, `verticals/*`, `integrations/*` (ADR-010).

## What works / what does NOT yet

- **M1 (verified):** app boots; styled dashboard shell renders; Next.js 14.2.35.
- **M2 (verified running):** email/password auth (Supabase), first-run business creation, protected dashboard greeting the user by business name + email, sign out. Tenant isolation via RLS on organizations/memberships; org creation via SECURITY DEFINER `create_organization()` RPC.
  - **Confirmed end-to-end on the owner's machine (2026-07-19):** sign in → create the business **"Midnight Rydes"** → land on the protected dashboard (greeting "Midnight Rydes at a glance", owner email shown). Route protection verified: unauthenticated `/` and `/onboarding` → 307 `/login`; `/login` → 200.
- **Not yet:** customers/trips/expenses tables + CRUD (M3–M4), business calc services + tests (M5), live dashboard numbers (M6), Ask OBSIDIAN (M7), NL trip entry (M8), customer intelligence (M9). No voice/SMS/other excluded features.

## Environment / setup notes (owner's machine)

- **Runs on port 3001** (`npm run dev -- -p 3001` from `apps/web`) — port 3000 is taken by the owner's separate Trading Scanner.
- Node 24.x, npm 11.x, Next.js 14.2.35.
- **Supabase project `hspfhyundcytxginsovh` is intentionally SHARED with the Trading Scanner** (owner's explicit decision). The RIDES `organizations`/`memberships` tables + RLS live in that same database alongside the trader's tables. Keys come from `apps/web/.env.local` only (git-ignored; sourced from the owner's `.env5.txt`). This is a deliberate exception to project separation for Customer-Zero convenience — revisit before any real multi-tenant launch.
- `supabase/migrations/0001_organizations.sql` was already applied in that project (verified via REST: `organizations`/`memberships` exist with expected columns; `create_organization()` rejects unauthenticated calls). Safe to re-run.
- **Auth gotcha:** sign-in only succeeds for a **confirmed** user. If sign-in fails with "Email not confirmed", confirm the user in Supabase → Authentication → Users (or turn OFF Providers → Email → "Confirm email" for dev). Use the **Sign in** button (the user was pre-created), not "Create account".

## Fixes made this session

- Typed the Supabase `setAll` cookie callbacks in `lib/db/supabase-server.ts` and `lib/db/supabase-middleware.ts` (7 implicit-`any` errors under strict TS). `npm run typecheck` (`tsc --noEmit`) is clean.

## Outstanding for M2 (recommended before M3)

- **Negative tenant-isolation test:** confirm a *second* user cannot see Midnight Rydes. Structurally enforced (RLS on, `is_member_of()` policies, anon reads return empty), but a live second-user check is the last box to tick. Needs a second login (owner to run).

## Decisions locked in

ADR-001…011 (see `docs/DECISIONS.md`). Key: modular monolith; AI calls tools not tables; answers from structured data; tenancy via RLS; RIDES-first single app (ADR-010); lean data model (ADR-011).

## Next action

**M3 — Database (rest of the model):** Customers, Trips, Expenses, Vehicles tables + migrations + RLS + optional seed data. **Only after the owner confirms M2 and says go.** One sub-phase at a time; stop and verify. See `docs/ROADMAP.md`.

## Git

Repository initialized. Commits: Phase 0 foundation; RIDES-MVP planning; M1 foundation; Next.js 14.2.35 security patch; **M2 auth + organization (verified)**.

# CURRENT STATE

**As of:** OBSIDIAN RIDES MVP — M7 (Ask OBSIDIAN) **built + statically verified** (2026-07-20).
**Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`).
**Current sub-phase:** M7 — Ask OBSIDIAN. ✅ **Built & statically verified; owner to test with an ANTHROPIC_API_KEY set.**
**Next sub-phase:** M8 — Natural-language trip entry (do NOT start until the owner says go).

## What exists right now

**Documentation:** the Phase-0 doc set + `CUSTOMER_ZERO_FEEDBACK.md`.

**Application — `apps/web`, a single Next.js 14 app:**
```
apps/web/
  vitest.config.ts
  src/
    middleware.ts
    app/
      page.tsx          # dashboard (M6 live numbers) — Ask box + Quick Action now link to /ask
      ask/  page.tsx, actions.ts        # M7: Ask OBSIDIAN page + server action
      login/, onboarding/, customers/, trips/, expenses/
    components/ dashboard.tsx, form.tsx, ask-obsidian.tsx (client), {customer,trip,expense}-form.tsx
    lib/
      ai/               # M7 — Claude tool-use chat (server-only)
        config.ts       ASK_MODEL (claude-haiku-4-5), MAX_TOOL_ITERATIONS, ASK_SYSTEM_PROMPT
        tools.ts        6 read-only tools + executors (org-scoped, compute via M5)
        ask.ts          tool-use loop (call model → run tool → feed back → repeat)
      money.ts, enums.ts, form.ts
      business/         # M5 pure calc engine + tests (used by M6 dashboard AND M7 tools)
      db/  env, supabase-client, supabase-server, supabase-middleware, org, customers, trips, expenses
      types/ index.ts
supabase/ migrations/0001, 0002 ; seed_dev.sql (NOT run)
```

## What works / what does NOT yet

- **M1–M6 (verified):** boot/shell; auth + org + protected dashboard; DB tables + RLS; CRUD screens (owner-confirmed); pure business-calc engine + 30 unit tests; dashboard wired to live numbers (owner-confirmed).
- **M7 (built + statically verified):** **Ask OBSIDIAN** — a Claude-powered chat that answers business questions **only through schema-typed, read-only (Level 1) tools** backed by the M5 calcs. Architecture: user question → Claude (tool-use) → tool runs **server-side, org-scoped (RLS)**, fetches data + computes via `src/lib/business` → verified numbers returned → Claude phrases the answer. No writes/actions this phase.
  - **Tools:** `get_business_performance`, `get_revenue_summary`, `get_expense_summary` (optional per-category), `get_trip_summary`, `get_top_customers`, `get_customer_history` (case-insensitive). Periods `this_month`/`last_month`/`all_time` via `currentMonthRange()`+`filterByDateRange()`.
  - **No fabricated numbers:** the system prompt forbids inventing/estimating/calculating figures. Each tool returns money as **both** integer cents **and** a pre-formatted USD string (`formatUsd`); Claude is instructed to present the pre-formatted dollar string verbatim and never do arithmetic — so a figure matches the dashboard exactly and can't drift.
  - **Model:** `claude-haiku-4-5` (low cost), a single config constant (`ASK_MODEL`) — swap to `claude-sonnet-5` if answers need more reasoning.
  - **UI:** `/ask` page with a chat island (`components/ask-obsidian.tsx`), example-question chips, graceful errors (missing key → friendly message, not a crash). Dashboard "Ask OBSIDIAN" box + Quick Action link to `/ask`.
  - **Secrets:** `ANTHROPIC_API_KEY` is read server-side only (never `NEXT_PUBLIC`, never committed); the SDK + AI code stay server-side. Verified: the built client static bundle contains no key/SDK/prompt.
  - **Verified:** `tsc --noEmit` clean; M5 tests 30/30; `next build` (13 routes) OK; dev boots on 3001; `/ask` is auth-protected. **Owner-pending:** functional test with a real `ANTHROPIC_API_KEY` — "How much did I make this month?" should match the dashboard; "Who's my top customer?" correct; "How much on gas?" correct; an unsupported question should decline rather than invent a number.
- **Not yet:** natural-language trip entry (M8), customer intelligence / inactive detection (M9), field test (M10).

## ⛔ Deferred — must-do before going multi-user (HARD GATE)

- **Negative second-user tenant-isolation test.** A second user (second org) must see **none** of Midnight Rydes' rows in any table (and get no cross-org answers from Ask OBSIDIAN — the tools are RLS-scoped, so this holds structurally). Not yet run live; needs a second login (owner). Intentionally paused until the MVP works end-to-end; not a blocker for single-tenant M8–M9. **HARD GATE:** do NOT onboard a second real user/business until it passes.

## Environment / setup notes (owner's machine)

- **Port 3001** (`npm run dev -- -p 3001` from `apps/web`); 3000 is the Trading Scanner. Node 24, npm 11, Next 14.2.35. `npm test` = vitest.
- **`apps/web/.env.local` now needs a third value for M7:** `ANTHROPIC_API_KEY=sk-ant-...` (server-only). Without it, `/ask` shows a friendly "not configured" message instead of crashing.
- Supabase project `hspfhyundcytxginsovh` shared with the Trading Scanner (owner's decision); keys in `.env.local` (git-ignored). DDL applied by hand in the SQL Editor; migrations 0001 + 0002 applied.
- **Auth gotcha:** sign-in needs a **confirmed** user; use **Sign in** (user pre-created).

## Next action

**M8 — Natural-language trip entry:** parse free text ("log a $320 ride from Brooklyn to JFK for Ashley, $40 gas") → a structured trip proposal → owner confirms/edits/cancels → save only on confirm (reuse the M4 create path + find-or-create customer + inline costs). Claude proposes; nothing is written without confirmation. **Only after the owner confirms M7 and says go.** One sub-phase at a time; stop and verify.

## Git

Commits: Phase 0; planning; M1; Next 14.2.35 patch; M2; M3; HARD GATE doc; M4; M4 verified; M5 business engine; M6 dashboard wiring; **M7 Ask OBSIDIAN**.

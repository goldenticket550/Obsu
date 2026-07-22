# CURRENT STATE

**As of:** OBSIDIAN RIDES MVP — M11 (Voice + Orb) **built + statically verified** (2026-07-21). The RIDES MVP build (M1–M9) is complete; M11 adds the voice/orb interface (an owner-approved scope expansion — see ADR-012).
**Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`).
**Current sub-phase:** M11 — OBSIDIAN Voice + Orb. ✅ **Built & statically verified; owner tests voice on desktop Chrome/Edge with a mic.**
**Next:** M10 — Customer-Zero field test (real usage, NOT a build phase). Queued follow-ups: (a) ElevenLabs premium voice via the swappable TTS layer, (b) voice trip-logging (speech → the M8 parse flow).

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
  - **Verified:** `tsc --noEmit` clean; M5 tests 30/30; `next build` (13 routes) OK; dev boots on 3001; `/ask` is auth-protected. **Owner-confirmed live (2026-07-21)** via server-side tracing of the tool-use loop: revenue ($2,065.00), top customer (jojo, $1,595.00), gas ($120.00), and trips (3) each came straight from a tool result; "What's the weather?" declined (no tool called, no fabricated number); zero tool errors across the session.
- **M8 (built + statically verified):** **natural-language trip entry** on `/trips/new`. A "Log a trip by text" box sends the note to a **server** parse action (`src/lib/ai/parse-trip.ts`, reuses `ANTHROPIC_API_KEY` + `ASK_MODEL`, forced `record_trip` tool). The parser is Level-2 "prepare" — **read-only, writes nothing, invents nothing**: it extracts only values explicitly stated (unstated → null), does no arithmetic (reports dollars as written), and validates enums. The parsed values **prefill the existing M4 `TripForm`** (now a client component accepting `defaults`) under a banner: "Here's what OBSIDIAN understood — review it and press Log trip to save…". The owner reviews/edits and submits the **normal form → existing `createTrip`** (find-or-create customer + inline gas/tolls/other → linked expenses; dollars→cents via `money.ts`). No write logic duplicated; leaving the page = cancel. Missing key or unusable text → friendly message, blank form. `ANTHROPIC_API_KEY`/SDK stay server-side (verified absent from the client bundle). **Verified:** `tsc` clean, M5 tests 30/30, `next build` (13 routes) OK, boots on 3001, `/trips/new` auth-protected. **Owner-pending:** on-screen review — "logged a ride for Ashley, Brooklyn to JFK, $240, $18 gas, $12 tolls" should prefill customer/pickup/dropoff/revenue/gas/tolls; submit saves via M4; vaguer input leaves unstated fields blank.
- **M9 (complete):** **customer intelligence.** `src/lib/business/customer-intel.ts` — `inactiveCustomers(trips, customers, thresholdDays, asOfDate)`: **pure**, returns repeat customers (>= 2 completed trips) whose most recent completed trip is older than the threshold (default `INACTIVE_THRESHOLD_DAYS = 30`), each with name / daysSinceLastTrip / lastTripDate / tripCount / lifetimeRevenueCents; canceled trips ignored; sorted most-overdue first. `asOfDate` is passed in (clock-free); the thin `todayInNewYork()` helper feeds it. **Unit-tested** (9 cases: <2 trips, recently-active, threshold boundary, canceled handling, sort, empty). **Dashboard Customer Insights** now shows "N repeat customers due for follow-up" + the list (name, days since last ride, lifetime value), with a calm empty state when 0 (correct with fresh data), keeping the Top-customers list. **Follow-up drafts** (`components/follow-up-drafts.tsx`, client) are Level-2 "prepare": a per-customer "Draft follow-up" reveals an editable, name-personalized message with a **Copy** button and **NO send button / no messaging integration** — the owner sends it himself. **Ask OBSIDIAN** gained the read-only `get_inactive_customers` tool (reuses `inactiveCustomers`), so "who hasn't booked recently?" works. **Verified:** logic unit tests green; `tsc` clean; **41/41** tests; `next build` (13 routes) OK; boots on 3001; no key leakage. Owner reviews the panel/drafts/Ask on screen.
- **M11 (built + statically verified):** **OBSIDIAN Voice + Orb** — the `/obsidian` route gives the Ask brain a voice and a face. **Voice IN:** browser Web Speech API (`src/lib/voice/speech-recognition.ts`) transcribes speech → text (free, no key; Chrome/Edge); typed fallback everywhere. **Same brain:** the transcript routes through the **existing M7 `askAction`** — same tools, same no-fabrication guarantee, **no second answer path, no new tools, no new key**. **Voice OUT:** a **swappable** `ObsidianTts` interface (`src/lib/voice/tts.ts`); default = browser SpeechSynthesis; an ElevenLabs impl can drop in without touching the UI. **The orb** (`components/obsidian-orb.tsx`, canvas): a cluster of glowing cyan points around a soft core with idle-breathe / listening (reacts to live mic amplitude via a Web Audio `AnalyserNode`) / thinking / speaking states. Flow (`components/obsidian-voice.tsx`): tap orb → listen → transcript → `/ask` brain → answer shown + spoken → idle. Mic-denied / unsupported → friendly fallback to the typed box. Dashboard Ask section links to `/obsidian`. All browser-side; `ANTHROPIC_API_KEY`/SDK stay server-only (verified absent from the client bundle). **Verified:** `tsc` clean, **41/41** tests, `next build` (14 routes) OK, boots on 3001, `/obsidian` auth-protected, no key leakage. **Owner-pending:** on desktop Chrome/Edge with a mic — tap the orb, say "How much did I make this month?" → transcribes, answer **matches the dashboard**, spoken aloud, orb animates; "what's the weather?" still declines; typed fallback works.
- **Not yet:** the M10 Customer-Zero field test (30-day real usage + feedback log). Queued follow-ups: ElevenLabs voice; voice trip-logging.

## ⛔ Deferred — must-do before going multi-user (HARD GATE)

- **Negative second-user tenant-isolation test.** A second user (second org) must see **none** of Midnight Rydes' rows in any table (and get no cross-org answers from Ask OBSIDIAN — the tools are RLS-scoped, so this holds structurally). Not yet run live; needs a second login (owner). Intentionally paused until the MVP works end-to-end; not a blocker for single-tenant M8–M9. **HARD GATE:** do NOT onboard a second real user/business until it passes.

## Environment / setup notes (owner's machine)

- **Port 3001** (`npm run dev -- -p 3001` from `apps/web`); 3000 is the Trading Scanner. Node 24, npm 11, Next 14.2.35. `npm test` = vitest.
- **`apps/web/.env.local` now needs a third value for M7:** `ANTHROPIC_API_KEY=sk-ant-...` (server-only). Without it, `/ask` shows a friendly "not configured" message instead of crashing.
- Supabase project `hspfhyundcytxginsovh` shared with the Trading Scanner (owner's decision); keys in `.env.local` (git-ignored). DDL applied by hand in the SQL Editor; migrations 0001 + 0002 applied.
- **Auth gotcha:** sign-in needs a **confirmed** user; use **Sign in** (user pre-created).

## Next action

**M10 — Customer-Zero field test (NOT a build phase):** the owner (Midnight Rydes) runs OBSIDIAN on real business for ~30 days — logging trips/expenses, trusting the dashboard numbers, asking OBSIDIAN, and using follow-up drafts. Findings go in `CUSTOMER_ZERO_FEEDBACK.md`. This is the "prove on a real business before scaling" step (ROADMAP). **Before any second real user/business:** the deferred **negative second-user tenant-isolation test** (the HARD GATE above) must pass. Fixes/tweaks that surface during the field test are small follow-up changes, not a new milestone.

## Git

Commits: Phase 0; planning; M1; Next 14.2.35 patch; M2; M3; HARD GATE doc; M4; M4 verified; M5 business engine; M6 dashboard wiring; M7 Ask OBSIDIAN; M7 verified; M8 natural-language trip entry; M9 customer intelligence; **M11 Voice + Orb**.

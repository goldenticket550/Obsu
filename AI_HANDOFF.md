# AI_HANDOFF

> **Read this first if you are a coding agent (Claude Code, Codex, Cursor, or any other).**
> Do not start building the full product. Do not guess. This file is the source of truth for the current state and the exact next action.

## What OBSIDIAN is

OBSIDIAN is a **modular AI operating ecosystem** for individuals and small service businesses. Tagline: *Your Business. Our A.I.* Positioning: *The AI Operating System for Service Businesses.* It is **not a chatbot** — it is an intelligent operating layer over **structured business data** that remembers the business, tracks money, understands customers, surfaces proactive insight, and takes permissioned action.

Long-term concept: **one AI core, multiple business operating systems.** Read `README.md`, then `docs/VISION.md` and `docs/VERTICALS.md` for the full picture.

## Layers (see `docs/VERTICALS.md`)

- **OBSIDIAN CORE** (`packages/*`) — shared kernel: orchestration, auth, tenancy, permissions, memory, tools, events, analytics, audit, billing, voice. Depends on no vertical.
- **OBSIDIAN PERSONAL** — the founder's private single-tenant command center (business + trading + comms + project intelligence).
- **OBSIDIAN BUSINESS** — the commercial multi-tenant SaaS.
- **Verticals** (`verticals/*`) — RIDES (first), TOWING (future integration), BEAUTY (future).

## Current architecture (see `docs/ARCHITECTURE.md`)

Modular monolith. One deployable app (`apps/web`), internal modules in `src/lib/*` (packages/verticals scaffold is documentation only — ADR-010). The AI orchestrator flow is: user → interface → orchestrator → context → permissions → tools → data/APIs → result → response. **The AI calls schema-typed tools, never raw tables** (ADR-002). Business answers come from queries, not conversation memory (ADR-003). Tenancy is enforced with PostgreSQL RLS (ADR-006).

## Current phase & milestone

- **Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`). This supersedes the old abstract "Phase 1 CORE MVP" — CORE is built *through* RIDES (ADR-010).
- **Current sub-phase:** **M11.1 — Real Voice plus the interactive Command Center design pass. ✅ BUILT, verified, and deployed to production on 2026-08-02.** Supersedes M11's browser SpeechRecognition (ADR-013). RIDES MVP build (M1–M9) complete; voice is an owner-approved scope expansion (ADR-012/013).
- **Next sub-phase:** **M10 — Customer-Zero field test (NOT a build phase). Remaining queued follow-up: voice trip-logging (speech → M8 parse).**

## Completed work

- Phase 0 foundation: 13 docs + modular-monolith folder scaffold + `.gitignore`/`.env.example`.
- RIDES-MVP planning: `docs/ROADMAP.md` (10 sub-phases M1–M10); ADR-010 (RIDES-first, single app not monorepo) and ADR-011 (lean 6-entity model).
- **M1 — Foundation:** Next.js 14 (App Router) + TypeScript (strict) + Tailwind app in `apps/web`. Dashboard shell. Supabase client/server modules. Verified booting (Next.js 14.2.35).
- **M2 — Auth + Organization (verified):** Supabase email/password auth (`src/app/login`), first-run business creation via the SECURITY DEFINER `create_organization()` RPC (`src/app/onboarding`), session refresh + route protection (`src/middleware.ts` + `src/lib/db/supabase-middleware.ts`), and a protected, personalized dashboard (`src/app/page.tsx`). Schema + RLS in `supabase/migrations/0001_organizations.sql` (organizations, memberships, `is_member_of()`, policies). Confirmed on the owner's machine against live Supabase: sign in → create "Midnight Rydes" → protected dashboard.
- **M3 — Database layer (verified):** `customers`, `vehicles`, `trips`, `expenses` in `supabase/migrations/0002_business_tables.sql`, each `organization_id`-scoped with an RLS `for all` policy reusing the existing `public.is_member_of(organization_id)` (NOT redefined). Money is integer cents (`revenue_cents`/`hourly_rate_cents`/`amount_cents`); trips carry both flat (`revenue_cents`, source of truth) and optional hourly (`hours`+`hourly_rate_cents`) pricing; timestamps UTC. `src/lib/types/index.ts` matches the columns exactly; derived `last_booking_date`/`lifetime_revenue` stay OUT of the `Customer` row type (computed in M5, ADR-011). Optional `supabase/seed_dev.sql` exists but is NOT run. Verified against live Supabase: authenticated member insert+read in all four tables (RLS self-test, rolled back), anon read of each returns empty.
- **M4 — Basic CRUD (built, static-verified):** add/view/edit screens for Customers, Trips, Expenses (`src/app/{customers,trips,expenses}` — list + `new` + `[id]/edit`, server actions in each `actions.ts`). **No delete, no vehicle screen, no analytics** this phase (scope). Money boundary in `src/lib/money.ts` (dollars in UI ↔ integer cents in DB); org stamping via `src/lib/db/org.ts` `getCurrentOrgId()` on every write; trip form does **find-or-create customer by name** + optional **inline costs** → linked expense rows. Reads in server components, writes in server actions, all via the RLS-enforced server client; enum lists + `labelize` in `src/lib/enums.ts`; shared form UI in `src/components/form.tsx` + entity forms. Dashboard Quick Actions/nav wired; Recent Activity shows raw latest trips/expenses. Verified: `tsc --noEmit` clean, `next build` (12 routes) OK, dev boots on 3001, protected routes → `/login`, money/validation unit tests 17/17. **Owner-confirmed (2026-07-20):** created a customer, trip, and expense against live Supabase (all succeeded).
- **M5 — Business engine (complete):** deterministic **pure** calc functions in `src/lib/business/*` (revenue, expenses/by-category, estimated trip & operating profit, per-hour/mile rates, customer lifetime revenue/trip-count/top-customers, `filterByDateRange`), plus a thin clock-aware `currentMonthRange` (America/New_York) kept separate. All money in integer cents; `Math.round` on averages/ratios; per-hour/mile `null` when the divisor is missing. Confirmed definitions: revenue = completed trips only; trip profit = revenue − linked expenses; operating profit = completed revenue − all in-scope expenses (incl. overhead). **Vitest** added (`npm test`); 30 unit tests pass. `tsc --noEmit` clean; `next build` OK; dev boots. **No UI/dashboard wiring** — that is M6.
- **M6 — Dashboard wiring (built, static-verified):** `src/app/page.tsx` now fetches the org's trips/expenses/customers (RLS-scoped) and calls the M5 pure calcs to fill the This-Month cards (Revenue / Recorded Expenses / Est. Operating Profit [accent, "Estimated"] / Trips), the average-trip line, and Customer Insights (`topCustomers(allTrips, customers, 3)`, zero-revenue filtered). Current month from `currentMonthRange()` + `filterByDateRange()`. Money via `formatUsd` (grouped, `$7.50`, `-$5.00`); empty month → `$0.00`/`0`. All math stays in `src/lib/business`; the component only fetches + formats. Verified: `tsc` clean, M5 tests 30/30, money-format checked, `next build` (12 routes) OK, boots on 3001. **Owner-pending:** confirm live This-Month numbers vs real data.
- **M7 — Ask OBSIDIAN (built, static-verified):** Claude tool-use chat that answers ONLY through schema-typed, read-only (Level 1) tools backed by the M5 calcs — `src/lib/ai/{config,tools,ask}.ts`, page `src/app/ask`, client island `src/components/ask-obsidian.tsx`. Flow: question → Claude picks a tool → tool runs server-side, org-scoped (RLS), fetches + computes via `src/lib/business` → returns verified numbers → Claude phrases the answer (ADR-002/003). 6 tools (business performance / revenue / expenses±by-category / trips / top-customers / customer-history) over periods this_month/last_month/all_time. **Never fabricates numbers:** system prompt forbids inventing/estimating/calculating, and tools return money as both integer cents AND a pre-formatted USD string (`formatUsd`) so Claude echoes the exact figure, no arithmetic. Model `claude-haiku-4-5` behind the single constant `ASK_MODEL` (swap to `claude-sonnet-5` if needed). `@anthropic-ai/sdk` added. `ANTHROPIC_API_KEY` server-only (never NEXT_PUBLIC/committed); verified absent from the client static bundle. Verified: `tsc` clean, M5 tests 30/30, `next build` (13 routes) OK, boots on 3001, `/ask` auth-protected. **Owner-confirmed live (2026-07-21):** revenue/top-customer/gas/trips each answered from a tool result; "what's the weather?" declined; no tool errors.
- **M8 — Natural-language trip entry (built, static-verified):** `/trips/new` has a "Log a trip by text" box → server action `parseTripText` → `src/lib/ai/parse-trip.ts` (reuses `ANTHROPIC_API_KEY` + `ASK_MODEL`, forced `record_trip` tool). **Parse is Level-2 prepare — read-only, writes nothing, invents nothing:** extracts only stated values (unstated → null), no arithmetic (dollars as written), enum-validated; then **prefills the existing M4 `TripForm`** (now a client component taking a `defaults` prop) under a review banner. Owner reviews/edits and submits the normal form → the existing `createTrip` (find-or-create customer + inline gas/tolls → linked expenses; dollars→cents). No write logic duplicated; leaving the page cancels. Missing key / unusable text → friendly message + blank form. SDK + key server-only (verified absent from the client bundle). Verified: `tsc` clean, M5 tests 30/30, `next build` (13 routes) OK, boots on 3001. **Owner-pending:** on-screen review (the Ashley example prefills correctly; submit saves via M4; vague input leaves blanks).
- **M9 — Customer intelligence (complete):** `src/lib/business/customer-intel.ts` `inactiveCustomers(trips, customers, thresholdDays, asOfDate)` — **pure**, flags repeat customers (>= 2 completed trips) whose last completed trip is older than `INACTIVE_THRESHOLD_DAYS` (default 30); returns name/daysSinceLastTrip/lastTripDate/tripCount/lifetimeRevenueCents, canceled ignored, most-overdue first. `asOfDate` injected; clock-aware `todayInNewYork()` added to `date-range.ts`. **9 unit tests** (boundary, <2 trips, canceled, sort, empty). Dashboard Customer Insights shows the follow-up count/list (calm empty state at 0 — correct with fresh data) alongside top customers. **Follow-up drafts** (`components/follow-up-drafts.tsx`, client) are copy-only, name-personalized, **no send** button/integration (auto-send stays excluded). Ask OBSIDIAN gained read-only `get_inactive_customers` (reuses `inactiveCustomers`). Verified: `tsc` clean, **41/41** tests, `next build` (13 routes) OK, boots on 3001, no key leakage.
- **M11 — OBSIDIAN Voice + Orb (built, static-verified):** `/obsidian` gives the Ask brain a voice + a face. Voice IN = browser Web Speech API (`src/lib/voice/speech-recognition.ts`, free/no-key); Voice OUT = swappable `ObsidianTts` (`src/lib/voice/tts.ts`, default browser SpeechSynthesis, ElevenLabs-ready). The transcript routes through the **existing M7 `askAction`** — same tools, same no-fabrication guarantee, **no second answer path, no new tools, no new API key**. Canvas orb (`components/obsidian-orb.tsx`) reacts to live mic amplitude (Web Audio) + TTS state; flow in `components/obsidian-voice.tsx` (tap → listen → transcript → answer → speak → idle); typed fallback for mic-denied/unsupported. All browser-side; SDK/key stay server-only (verified absent from the client bundle). Verified: `tsc` clean, 41/41 tests, `next build` (14 routes) OK, boots on 3001. **Owner-pending:** desktop Chrome/Edge voice test (answer matches dashboard; weather declines; typed fallback works). See ADR-012.

## Incomplete / not started

- **Residual — negative second-user tenant-isolation test:** intentionally deferred (single-tenant MVP), but a **HARD GATE before multi-user** — see the "⛔ Deferred — must-do before going multi-user" section below.
- **M10:** Customer-Zero 30-day field test — real usage + findings in `CUSTOMER_ZERO_FEEDBACK.md`. Not a build phase.
- **Production deployment:** complete on 2026-08-02 at `https://obsidian-mvp.vercel.app`. The Vercel production environment includes the required Supabase, Anthropic, and ElevenLabs variables. Live auth was repaired by adding the missing public Supabase anonymous key and replacing an obsolete, non-resolving Supabase project URL with the current project URL.
- Excluded (do NOT build without explicit approval): **ElevenLabs premium voice** — now APPROVED & built in M11.1 (ADR-013; server-side STT + TTS, key server-only); **auto-SMS / any message sending** (M9 does drafts only), social automation, trading/towing/beauty, native apps, complex fleet, accounting/banking, multi-agent.

## ⛔ Deferred — must-do before going multi-user (HARD GATE)

The **negative second-user tenant-isolation test** is intentionally **paused** until the RIDES MVP works end-to-end for the single Customer-Zero user (Midnight Rydes). It is *not* a blocker for the single-tenant M4–M9 work.

**The test:** a second user in a second organization must be able to see **none** of Midnight Rydes' rows — in `organizations`/`memberships` **and** in `customers`/`vehicles`/`trips`/`expenses`. RLS structurally enforces this today (policies via `is_member_of()`, anon reads return empty), but it has **not** been exercised with a live second user. Needs a second login — owner to run.

**HARD GATE:** do **NOT** onboard any second real user or business — i.e. do not take OBSIDIAN multi-user/multi-tenant in any real capacity — until this test passes. Any coding agent reaching the multi-user step must stop and get this run first.

## Important constraints (build rules — follow all)

1. Build in small verified milestones. 2. Don't generate hundreds of unnecessary files. 3. Don't install packages without justification. 4. Every milestone must run before moving on. 5. Strong TypeScript typing. 6. Business logic separate from UI. 7. Vertical logic modular. 8. Never expose secrets. 9. Use environment variables. 10. Maintain Git commits. 11. Tests for critical business logic. 12. Maintain DB migrations. 13. Maintain documentation. 14. Avoid premature microservices. 15. Modular monolith unless scale requires otherwise. 16. Prefer APIs over browser automation. 17. Webhooks/events for async where appropriate. 18. Maintain audit logs. 19. Enforce multi-tenant isolation. 20. Explain major architecture changes before implementing.

Additional hard rules: **do not merge the Trading Scanner or Towing codebases** (ADR-007). **No autonomous financial trades or transfers** (Level-4 only, with strong auth + confirmation + audit). **Do not hard-code pricing** (ADR-009).

## Intended stack (evaluate before committing — `docs/DECISIONS.md`)

Next.js + TypeScript + Tailwind (frontend); Supabase + PostgreSQL (data + auth + RLS); Claude API (AI); Stripe (billing); ElevenLabs + STT (voice); background-job runner deferred (ADR-005). Use Python selectively (trading scanner, analytics), not for the whole ecosystem.

## How to run the system

```
cd apps/web
npm install
# Create apps/web/.env.local (git-ignored) with:
#   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co     (base URL, NO /rest/v1/ suffix)
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
#   ANTHROPIC_API_KEY=sk-ant-...   (M7 Ask OBSIDIAN; server-only, never NEXT_PUBLIC)
npm run dev -- -p 3001     # http://localhost:3001 — 3000 is used by the Trading Scanner
npm run build              # production build
npm run typecheck          # tsc --noEmit — must stay clean (strict)
npm test                   # vitest — business-engine unit tests (M5), must stay green
```

Requires Node 18.17+ (developed on Node 22–24). From M2 onward a live Supabase project + `.env.local` are required.

### Machine/config notes (owner)

- **Supabase project `hspfhyundcytxginsovh` is intentionally SHARED with the Trading Scanner** (owner's explicit decision). RIDES tables + RLS live in that DB alongside trader tables. Deliberate Customer-Zero convenience; revisit before any real multi-tenant launch. Keys live only in `apps/web/.env.local` (sourced from the owner's `.env5.txt`; the raw value there carries a `/rest/v1/` suffix that MUST be stripped for `@supabase/ssr`).
- **DDL is applied by hand in the Supabase SQL Editor** (the owner's `.env5.txt` has empty `DATABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, and there's no local `psql`/`pg`). Migrations `0001` and `0002` are already applied (idempotent, safe to re-run).

## Known bugs / gotchas

- **Sign-in requires a confirmed user.** Repeated `POST /login 303` back to `/login` = auth failure (the action redirects to `/login?error=…`). If it says "Email not confirmed", confirm the user in Supabase → Authentication → Users, or turn OFF Providers → Email → "Confirm email" for dev. Use **Sign in** (user pre-created), not "Create account".
- Next.js dev request logs can stop flushing to a redirected log file after the dev worker recompiles — don't rely solely on a tailed log to confirm behavior; verify in the browser.

## EXACT next recommended task

**The RIDES MVP build (M1–M9) is complete, plus M11 (Voice + Orb) and M11.1 (Real Voice — server-side STT + ElevenLabs TTS, ADR-013).**

**EXACT next step — M10 Customer-Zero field test:** use the production site at `https://obsidian-mvp.vercel.app` for real Midnight Rydes work, record findings in `CUSTOMER_ZERO_FEEDBACK.md`, and keep the deferred second-user isolation test as a hard gate before onboarding another business.

**Before deploy works fully, the owner must add `ELEVENLABS_API_KEY` to `apps/web/.env.local`** (server-only, git-ignored) to test locally — without it STT returns a friendly error (typed box still works) and TTS falls back to the browser voice.

**Remaining queued follow-up (only when the owner says go):**

> **Voice trip-logging** — feed the `/obsidian` transcript into the M8 parse flow (`parseTripText`) so trips can be logged by voice → prefilled M4 form for review (nothing saved without confirmation). (ElevenLabs premium voice — the other former follow-up — is now DONE in M11.1.)

**M10 — Customer-Zero field test (NOT a build phase):** the owner runs OBSIDIAN on Midnight Rydes ~30 days — logging (form + natural language + voice), trusting the numbers, asking OBSIDIAN, using follow-up drafts. Findings in `CUSTOMER_ZERO_FEEDBACK.md`; only small fixes as issues surface.

**Before onboarding any second real user/business:** run the deferred **negative second-user tenant-isolation test** (the HARD GATE above). Remaining excluded features (ElevenLabs except via follow-up (a), auto-SMS/send, Towing/Beauty, etc.) stay excluded until explicitly approved. See `docs/ROADMAP.md` and `RETURN_CHECKLIST.md`.

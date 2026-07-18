# ROADMAP

Development is **sequential and validated** — one vertical is not built while another is unproven. Each phase must run and be verified before the next begins.

## Sequencing principle

Build in small verified milestones. Every milestone must run before moving forward. Do not build every vertical simultaneously. Prove on a real business (Customer Zero) before scaling.

---

## ⭐ NEAR-TERM FOCUS — OBSIDIAN RIDES MVP  ← **active track**

> **This is the current build.** The old ecosystem "Phase 1 (CORE MVP)" and "Phase 2 (RIDES MVP)" below have been **collapsed into a single focused product build**: we build CORE's capabilities (auth, tenancy, tools, dashboard) *through* RIDES rather than as a separate abstract phase. See `DECISIONS.md` ADR-010. The lettered ecosystem phases (3–8) remain the long-term horizon and are unchanged in intent.

The RIDES MVP has its own 10 sub-phases. The goal is the smallest version of OBSIDIAN that Midnight Rydes (Customer Zero) will use every day.

| # | Sub-phase | Goal / "done when" |
|---|---|---|
| M1 | **Foundation** | App boots: Next.js + TS + Tailwind + Supabase client configured, Git, env template, base layout. Runs with no errors. |
| M2 | **Auth + Organization** | Signup / login / logout; create a business (Organization); protected dashboard. |
| M3 | **Database** | Customers, Trips, Expenses, Vehicles tables; migrations; **RLS**; optional seed data. |
| M4 | **Basic CRUD** | Add/view/edit for Customers, Trips, Expenses. Tested with real Midnight Rydes data. |
| M5 | **Business engine** | Deterministic calc services (revenue, expenses, est. profit, trip/customer stats, date ranges) + **unit tests**. |
| M6 | **Dashboard** | Real data wired into This-Month, Performance, Recent Trips, Customer Insights widgets. |
| M7 | **Ask OBSIDIAN** | Claude API + safe tool layer (getRevenueSummary, getExpenseSummary, getTopCustomers, getCustomerHistory, getTripSummary, getInactiveCustomers, getBusinessPerformance). AI never fabricates numbers. |
| M8 | **Natural-language trip entry** | Parse free text → structured proposal → confirm/edit/cancel → save only on confirm. |
| M9 | **Customer intelligence** | Inactive-customer detection, repeat-customer insight, lifetime value, follow-up *drafts* (no auto-send). |
| M10 | **Customer #0 field test** | Production beta; Midnight Rydes uses it 30 days; log findings in `CUSTOMER_ZERO_FEEDBACK.md`. |

**Discipline:** one sub-phase at a time; each must run and be verified before the next; no excluded features (see `../README.md` and MVP exclusion list) without explicit approval.

---

## PHASE 0 — Foundation

Documentation, architecture, repository structure, design decisions.

**Done when:** the 13 docs exist and are coherent; the modular-monolith folder scaffold exists; the shared data model, layer definitions, roadmap, and return checklist are written; architecture risks and key decisions are recorded. **No application code, no installed dependencies.**

**Status:** ✅ complete. The active build is now the **OBSIDIAN RIDES MVP** track above.

## (Long-term horizon) PHASE 1 — OBSIDIAN CORE MVP

> Superseded for near-term work by the RIDES MVP track above (ADR-010). Retained to document the eventual generalized CORE product.

Authentication, organization accounts, database, AI text chat, tool framework, dashboard shell.

**Scope:** Next.js app shell (`apps/web`); Supabase auth + Users/Organizations/Memberships + roles; the base data model + migrations + **Row-Level Security**; a minimal AI text chat wired through the orchestrator; the tool-calling framework with at least one real tool; the Command Center dashboard shell.

**Done when:** a user can sign up, create/join an organization, see an (empty) dashboard, and ask the AI a question that is answered via a tool + DB query — with tenant isolation verified (no cross-org leakage) and audit logging on any write.

## (Long-term horizon) PHASE 2 — OBSIDIAN RIDES MVP  (Customer Zero: Midnight Rydes)

## PHASE 1 — OBSIDIAN CORE MVP

Authentication, organization accounts, database, AI text chat, tool framework, dashboard shell.

**Scope:** Next.js app shell (`apps/web`); Supabase auth + Users/Organizations/Memberships + roles; the base data model + migrations + **Row-Level Security**; a minimal AI text chat wired through the orchestrator; the tool-calling framework with at least one real tool; the Command Center dashboard shell.

**Done when:** a user can sign up, create/join an organization, see an (empty) dashboard, and ask the AI a question that is answered via a tool + DB query — with tenant isolation verified (no cross-org leakage) and audit logging on any write.

## PHASE 2 — OBSIDIAN RIDES MVP  (Customer Zero: Midnight Rydes)

Customers, Trips, Revenue, Expenses, basic analytics, AI questions, trip logging.

**Scope:** RIDES data extensions; trip logging by text/form; expense capture; customer records + history; basic monthly performance analytics; AI answers to the canonical owner questions ("how much did I make this month?", "who hasn't booked recently?").

**Done when:** the founder runs Midnight Rydes on it for real — logs trips and expenses, trusts the revenue/profit numbers, and gets at least basic customer intelligence. This is the first real-world deployment.

## PHASE 3 — VOICE

Voice input, voice responses, natural-language data entry.

**Scope:** microphone capture in the web app; speech-to-text; the orchestrator turning speech into structured proposals ("Obsidian, log a $320 ride from Brooklyn to Manhattan"); original OBSIDIAN TTS voice (calm/intelligent/concise) via ElevenLabs — no copyrighted-character imitation.

**Done when:** the founder can log a trip and get a briefing hands-free, faster than typing.

## PHASE 4 — BUSINESS INTELLIGENCE

Customer retention, revenue insights, profitability, automated alerts.

**Scope:** the insight-rule engine in `packages/analytics`; the event model wired for real (`TRIP_COMPLETED` → analytics → insight); retention/inactivity detection; profitability comparisons; disciplined proactive alerts (high-value only).

**Done when:** OBSIDIAN proactively surfaces insights the owner acts on, without flooding them.

## PHASE 5 — COMMUNICATION AUTOMATION

Draft follow-ups, SMS integration, customer reminders.

**Scope:** Level-2 drafting of follow-up/rebooking messages; `integrations/messaging` for SMS; Level-3 confirm-before-send everywhere; reminder workflows.

**Done when:** the owner approves an OBSIDIAN-drafted follow-up and it sends, fully audited — nothing sends without confirmation.

## PHASE 6 — TOWING INTEGRATION

Connect the independently validated Towing AI system.

**Scope:** integrate the now-proven standalone towing system via APIs / shared services / shared auth / shared data models / events (`CALL_COMPLETED`). Do **not** attempt before the towing MVP is validated on its own.

**Done when:** towing jobs/calls flow into CORE analytics without a codebase merge that couples the two prematurely.

## PHASE 7 — BEAUTY VERTICAL

Adapt shared CORE to beauty businesses.

**Scope:** BEAUTY data extensions (appointments, product cost, rebooking cycle, tips); service-profitability and rebooking-due detection; validate CORE carries a second consumer vertical cleanly.

**Done when:** a beauty operator can run appointment tracking, revenue, retention, and rebooking on the same CORE with no vertical coupling.

## PHASE 8 — ADVANCED PLATFORM

Multi-agent workflows, marketplace/integrations, advanced analytics, commercial scale.

**Scope:** multi-agent workflows; an integrations/marketplace surface; advanced analytics; the commercial subscription machinery at scale (tiers, usage limits, entitlements per `SAAS_MODEL.md`).

**Done when:** OBSIDIAN operates as a commercial, multi-tenant platform serving paying operators across verticals.

---

## Parallel track — OBSIDIAN PERSONAL

PERSONAL is developed alongside CORE/RIDES as the founder's own tool and a forcing function for CORE. Trading intelligence is added when the **separate** Trading Scanner is ready to expose an API/event feed (`TRADING_ALERT_TRIGGERED`) — analysis and risk assistance only, never autonomous execution.

## Cross-phase discipline (applies to every phase)

Milestones must run before moving on. Strong TypeScript typing. Business logic separate from UI. Vertical logic modular. Secrets in env vars, never committed. Git commits maintained. Tests for critical business logic. Database migrations maintained. Docs kept current. Tenant isolation enforced. Audit logs maintained. Major architecture changes explained before implementing. Full list in `AI_HANDOFF.md`.

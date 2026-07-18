# ROADMAP

Development is **sequential and validated** — one vertical is not built while another is unproven. Each phase must run and be verified before the next begins. Phase 0 is where this repository sits today.

## Sequencing principle

Build in small verified milestones. Every milestone must run before moving forward. Do not build every vertical simultaneously. Prove on a real business (Customer Zero) before scaling.

---

## PHASE 0 — Foundation  ← **current**

Documentation, architecture, repository structure, design decisions.

**Done when:** the 13 docs exist and are coherent; the modular-monolith folder scaffold exists; the shared data model, layer definitions, roadmap, and return checklist are written; architecture risks and key decisions are recorded. **No application code, no installed dependencies.**

**Status:** complete (this repository). See `CURRENT_STATE.md`.

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

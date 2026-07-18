# DECISIONS & RISKS

This file records **Architecture Decision Records (ADRs)** and the **architectural risks** identified during the Phase-0 review, with recommended corrections. Add a new ADR (don't rewrite history) whenever a major decision changes — build rule #20 (explain major changes before implementing).

---

## Architecture Decision Records

### ADR-001 — Modular monolith, not microservices
**Decision:** Start as a single deployable app (`apps/web`) with clean internal modules (`packages/*`, `verticals/*`), not distributed services.
**Why:** Pre-PMF, microservices add deployment, networking, and data-consistency overhead with no benefit. A modular monolith gives simple deployment now and clean seams to extract services later if scale demands. Avoid premature microservices (build rule #14/#15).
**Status:** Accepted.

### ADR-002 — AI calls tools, never tables
**Decision:** The `ai` package converts natural language into calls against schema-typed **tools**; it has no direct database access.
**Why:** Safety, validation, permission enforcement, auditability, and reuse (mobile/voice/external agents call the same tools). Prevents the AI from performing arbitrary writes.
**Status:** Accepted.

### ADR-003 — Answer from structured data, not conversation memory
**Decision:** Business answers come from database queries via tools, not from the model's recollection of chat.
**Why:** Correctness and trust. "How much did I make?" must be a query, not a guess. Conversation is an interface, not a source of truth.
**Status:** Accepted.

### ADR-004 — One Transaction table for money
**Decision:** Model Revenue and Expense as a single `Transaction` table with a `type` and `category`, rather than two tables.
**Why:** Uniform money math (net, margin, per-mile, per-hour) across all verticals; simpler analytics; fewer divergent code paths.
**Status:** Accepted. (Revisit only if a vertical needs radically different money semantics.)

### ADR-005 — Defer the background-job runner choice
**Decision:** Define event *names and payloads* now; pick the runner (Inngest / Trigger.dev / Supabase Edge Functions / server workers) at implementation time (Phase 4+). Early events may run in-process.
**Why:** The contract is what other modules depend on; the execution engine is swappable and shouldn't be chosen before we feel the real workload.
**Status:** Accepted (deferred).

### ADR-006 — Tenant isolation via PostgreSQL RLS
**Decision:** Enforce multi-tenancy with Row-Level Security at the database (Supabase), not application code alone.
**Why:** A single query bug shouldn't leak tenants. DB-level enforcement is the safety net. (See `SECURITY.md`.)
**Status:** Accepted.

### ADR-007 — Keep Trading Scanner and Towing AI separate
**Decision:** Do not merge either sibling codebase into OBSIDIAN now. Integrate later via APIs/events/shared auth/shared data models.
**Why:** Prove each system independently; premature coupling entangles three unproven products. (See `PRODUCT_STRATEGY.md`.)
**Status:** Accepted.

### ADR-008 — Web-first, PWA, native later
**Decision:** Ship a responsive, PWA-installable web app first; defer native iOS/Android until after PMF.
**Why:** Fastest path to a testable product; API-first design keeps native cheap later.
**Status:** Accepted.

### ADR-009 — Pricing is data, not code
**Decision:** Represent plans, entitlements, and usage limits as configuration/records; check entitlements, not tier names.
**Why:** Pricing will change; the architecture must not need surgery when it does. (See `SAAS_MODEL.md`.)
**Status:** Accepted.

### ADR-010 — RIDES MVP is the first build; collapse CORE + RIDES into one focused app
**Decision:** The first thing built is the **OBSIDIAN RIDES MVP** for Midnight Rydes (Customer Zero), not a separate abstract "CORE MVP." CORE capabilities (auth, tenancy, tools, dashboard, AI chat) are built *through* RIDES. The app is a **single self-contained Next.js application** (in `apps/web`) with internal module folders for business logic (`src/lib/business`, `src/lib/db`, `src/lib/ai`, …), **not** a multi-package monorepo (no pnpm/turbo workspaces) yet. The `packages/*` and `verticals/*` scaffold from Phase 0 remains as documentation of the eventual extraction boundaries.
**Why:** Fastest path to something genuinely useful to a real business; avoids over-engineering a monorepo before there's a second consumer; keeps the codebase understandable for a beginner developer (MVP rule #6). Module boundaries are preserved as folders now and can be extracted into packages later when a second vertical actually needs them.
**Status:** Accepted. (Revisit when BEAUTY or TOWING is built — that's when real package extraction earns its cost.)

### ADR-011 — MVP uses a lean data-model subset
**Decision:** The MVP implements only **Users, Organizations, Customers, Trips, Expenses, Vehicles**. The fuller shared model in `DATA_MODEL.md` (Leads, Bookings, Appointments, Services, Messages, Tasks, Notes, Documents, Alerts, AIInsight, Event, AuditLog) is deferred. `last_booking_date` and `lifetime_revenue` on Customer are computed by the business-engine services, not trusted as raw stored truth (may be cached later).
**Why:** Build the smallest model that answers the Customer-Zero questions; add entities only when a validated need appears. Avoids schema bloat and premature abstraction.
**Status:** Accepted. Audit logging (from the fuller model) is **not** dropped in principle — it's simply not needed for the read/prepare-only MVP, which sends nothing and moves no money. Reintroduce with Level-3 actions (Phase 5 / auto-send), per `SECURITY.md`.

---

## Architectural risks & recommended corrections

These are the risks surfaced in the Phase-0 review. Each has a recommendation folded into the docs above.

### R1 — Scope/ambition vs. execution capacity (HIGH)
The vision spans an AI core, two products, three-plus verticals, voice, trading, billing, and multi-agent workflows. The dominant risk is building breadth before any depth is validated.
**Correction:** Ruthless sequencing. Ship CORE → RIDES on Customer Zero before anything else. The roadmap enforces this; resist parallel vertical work. **This is the single most important risk.**

### R2 — AI answering from memory instead of data (HIGH)
If the AI answers money/customer questions from conversation, numbers will be wrong and trust collapses.
**Correction:** ADR-002/ADR-003 — tools + structured queries only. Non-negotiable.

### R3 — Multi-tenant leakage (HIGH)
Cross-org data leakage would be catastrophic for a SaaS. App-code-only checks are fragile.
**Correction:** ADR-006 — RLS at the DB, plus an explicit negative isolation test in Phase 1 and every data-touching phase (`SECURITY.md`).

### R4 — Voice complexity pulled in too early (MEDIUM)
Real-time voice is genuinely hard and can stall the core product.
**Correction:** Voice is Phase 3, *after* RIDES works by text/form. Don't let it block the MVP.

### R5 — Premature integration of sibling projects (MEDIUM)
Merging the Trading Scanner or Towing codebase now would couple three unproven systems.
**Correction:** ADR-007 — keep separate; integrate via APIs/events later. Documented paths, no merge.

### R6 — Over-eager proactive notifications (MEDIUM)
A flood of insights gets muted, killing the differentiator.
**Correction:** Insight bar is "would this change a decision?" Disciplined, high-value only (`PRODUCT_STRATEGY.md`, `ROADMAP.md` Phase 4).

### R7 — Autonomous financial action (HIGH if mishandled)
Any autonomous money movement or trade execution is a severe risk.
**Correction:** Level-4 permissions; strong auth + explicit confirmation + audit; **no autonomous trades or transfers, ever, without explicit future authorization and safeguards** (`SECURITY.md`, `VERTICALS.md`).

### R8 — Vector-store overreach (LOW/MEDIUM)
Dumping everything into embeddings makes facts fuzzy and queries unreliable.
**Correction:** Relational-first memory; vectors only where semantic retrieval genuinely helps (`ARCHITECTURE.md` §5).

### R9 — Hard-coded pricing/business assumptions (MEDIUM)
Baking prices/limits into code forces re-architecture on every packaging change.
**Correction:** ADR-009 — plans/entitlements/limits as data.

### R10 — Documentation drift across coding agents (MEDIUM)
Multiple agents (Claude Code, Codex, Cursor) risk diverging from the plan.
**Correction:** `AI_HANDOFF.md` + `CURRENT_STATE.md` are the source of truth; keep them current every session; never leave the next agent guessing.

### R11 — Event architecture over-engineering (LOW/MEDIUM)
Building a full event/broker system before there's load is wasted effort.
**Correction:** ADR-005 — define contracts now, implement incrementally, in-process first.

### R12 — Module-boundary erosion (MEDIUM)
Over time, verticals reach into each other or into `core`'s internals, recreating a big ball of mud.
**Correction:** Enforce dependency rules (`ARCHITECTURE.md` §1): verticals depend on core, core depends on no vertical, ai calls tools not tables. Consider lint/boundary tooling in Phase 1.

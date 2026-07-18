# ARCHITECTURE

> **Status:** Target architecture for Phase 0. Nothing here is built yet. Implementation details may change after the Phase-1 spike; changes are recorded in [`DECISIONS.md`](./DECISIONS.md).

## 1. Guiding principle — modular monolith

OBSIDIAN starts as a **modular monolith**, not a fleet of microservices. One deployable application with clear internal module boundaries. This gives simple deployment now, clean seams for later extraction, and avoids premature distributed-systems complexity for a pre-product-market-fit project. (See ADR-001 in `DECISIONS.md`.)

```
obsidian/
  apps/web/            One Next.js app: Command Center UI, dashboards, Ask OBSIDIAN, auth.
  packages/
    core/              Kernel: orchestrator entry, permission engine, event bus, memory, audit, tenant context.
    ai/                Model routing, tool-calling framework, tool schema registry, context assembly.
    database/          Schema, migrations, RLS policies, typed repositories.
    auth/              Users, orgs, memberships, roles, sessions.
    billing/           Plans, entitlements, usage limits (Stripe behind integrations/stripe).
    analytics/         Aggregations + insight-rule engine.
    notifications/     Alert fan-out + outbound delivery.
  verticals/
    rides/             OBSIDIAN RIDES (first). Extends the shared data model.
    towing/            OBSIDIAN TOWING (future; integrate the standalone system later).
    beauty/            OBSIDIAN BEAUTY (future).
  integrations/
    stripe/ elevenlabs/ messaging/ calendar/   Thin provider adapters.
```

### Dependency rules (enforced by module boundaries)

- Verticals depend on `core`; **core never depends on a vertical.**
- The `ai` package calls **tools**, not tables. It has no direct database access.
- `integrations/*` are thin adapters hidden behind a `packages/*` interface (e.g. Stripe behind `billing`) so a provider can be swapped without touching business logic.
- Business logic lives in `packages`/`verticals`; `apps/web` is presentation + wiring only.
- Vertical-specific logic never leaks into `core`. Shared logic never hard-codes vertical assumptions.

## 2. The AI Orchestrator flow

The orchestrator is the heart of OBSIDIAN. It **must not** access everything directly — every step is mediated by context and permission.

```
USER
  ↓  (text / voice / form)
OBSIDIAN INTERFACE  (apps/web)
  ↓
AI ORCHESTRATOR  (packages/ai)
  ↓
CONTEXT           assemble: user, org/tenant, business memory, relevant records
  ↓
PERMISSIONS       resolve caller role + action permission level (1–4)
  ↓
TOOLS             call an explicit, schema-typed tool — never raw table access
  ↓
DATABASE / APIs / MODULES   (packages/database, integrations/*, verticals/*)
  ↓
RESULT            structured result, validated against business rules
  ↓
AI RESPONSE       natural-language answer + any proposed action for confirmation
```

Key constraints: tools have explicit schemas; all state-changing actions are logged to the audit trail; the AI converts natural language into **safe, structured, validated actions** rather than free-form database writes.

### Natural-language → structured action (example)

> User: "Log $76 in gas for the Suburban."
> 1. Orchestrator selects the `addExpense` tool (schema: amount, category, vehicle, date, org).
> 2. It proposes a structured transaction: `{ type: expense, category: fuel, amount: 76.00, vehicle: "Suburban", org: <tenant> }`.
> 3. The system validates it (vehicle exists in this org, amount well-formed, permission level = Level 2/3).
> 4. If confirmation is required, the owner confirms.
> 5. The transaction is stored; an `EXPENSE_ADDED` event fires; the audit log records who/what/when.

## 3. AI permission levels

Every AI-invokable action is classified. This is a first-class architectural concept, not an afterthought (see `SECURITY.md` for enforcement detail).

- **Level 1 — Read.** Read revenue, bookings, customer history; analyze trends. No confirmation.
- **Level 2 — Prepare.** Draft a message, prepare an invoice or social post, suggest a booking response. Produces a proposal; nothing leaves the system.
- **Level 3 — Confirm before action.** Send message/email, schedule a post, modify or create a booking/appointment. Requires explicit owner confirmation.
- **Level 4 — High-risk.** Financial transfers, bank actions, major destructive actions, sensitive account changes. Requires strong authentication **and** explicit confirmation, always audited. **OBSIDIAN never autonomously places financial trades or moves money.**

## 4. Event-driven architecture

OBSIDIAN reacts to business events. This is documented now and implemented incrementally (Phase 4+); it is **not** over-engineered up front. Early phases may implement these as in-process handlers within the monolith, moving to a durable job runner only when justified.

Canonical events: `BOOKING_CREATED`, `TRIP_COMPLETED`, `PAYMENT_RECEIVED`, `CUSTOMER_INACTIVE`, `APPOINTMENT_COMPLETED`, `CALL_COMPLETED`, `EXPENSE_ADDED`, `TRADING_ALERT_TRIGGERED`.

Example reaction chain:

```
TRIP_COMPLETED
  → update revenue
  → update customer history
  → calculate estimated profitability
  → update analytics
  → check follow-up rules
  → generate insight (only if high-value)
```

Background execution options to evaluate at implementation time: Inngest, Trigger.dev, Supabase Edge Functions, or plain server workers. The choice is deferred (see `DECISIONS.md`, ADR-005) — the *contract* (event names + payloads) is what matters now.

## 5. Memory architecture

Memory is **typed and mostly relational**, not "throw everything into embeddings." Vector search is used only where semantic retrieval genuinely helps (e.g. searching free-text notes or call transcripts), never as the primary store of facts.

- **Session memory** — the current conversation. Ephemeral.
- **User memory** — stable user preferences.
- **Business memory** — business rules and facts (rates, routes, policies).
- **Customer memory** — customer relationships and history (relational).
- **Project memory** — software-project state (for PERSONAL's project intelligence).
- **Event history** — the durable log of business events.

Rule of thumb: if it's a fact you'd want to query, filter, or aggregate, it's a **row**. If it's meaning you'd want to search fuzzily, it *may* warrant an **embedding**.

## 6. API-first module design

Modules communicate through clean, explicit interfaces so that mobile apps, external integrations, voice agents, other AI agents, and a future developer API can all reuse the same logic. The AI calls these named services rather than querying random tables.

Illustrative RIDES surface (conceptual — not yet implemented):

```
createTrip()          calculateTripProfit()      getCustomerHistory()
getMonthlyPerformance()    getInactiveCustomers()
```

## 7. Multi-tenant isolation

OBSIDIAN BUSINESS is a secure multi-tenant SaaS. **Every business record belongs to an organization, and data must never leak across organizations.** The intended mechanism is PostgreSQL **Row-Level Security** (Supabase), with tenant context resolved in `auth` and applied at the data layer. Details and threat model in `SECURITY.md`.

## 8. Product delivery

The first commercial product is a **web application** — mobile- and desktop-responsive, PWA-installable ("add to home screen"), accessible by secure login, capable of microphone input, AI chat, dashboards, and notifications. Native iOS/Android apps are deferred until after product-market fit. The API-first design above is what makes those later clients cheap.

## 9. What is intentionally NOT here

No microservices. No message-broker infrastructure. No premature vector database. No merged Trading Scanner or Towing codebase (they remain independent — see `PRODUCT_STRATEGY.md` and `VERTICALS.md` for the integration paths). No hard-coded pricing. These are deliberate omissions, not gaps.

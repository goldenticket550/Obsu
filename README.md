# OBSIDIAN

**Your Business. Our A.I.**
The AI Operating System for Service Businesses.

---

OBSIDIAN is a modular AI operating ecosystem that helps individuals and small service businesses understand, manage, and automate their operations through natural language, voice, structured data, analytics, and AI agents.

It is **not a chatbot**. It is an intelligent operating layer on top of *structured business data* — it remembers the business, tracks the money, understands the customers, manages workflows, and tells the owner what needs attention.

The long-term concept: **one intelligent AI core, multiple specialized business operating systems.**

## Phase status

> **Current phase: PHASE 0 — Foundation.**
> This repository currently contains **documentation, architecture, and folder scaffolding only**. There is no application code, and no dependencies are installed. This is intentional. Two sibling projects (an AI Trading Scanner and an AI Towing/Dispatch system) are being completed first and may later integrate as OBSIDIAN modules. **Do not begin building the full product from this repo yet.** See [`CURRENT_STATE.md`](./CURRENT_STATE.md) and [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Ecosystem at a glance

```
                        OBSIDIAN
                     OBSIDIAN CORE          (shared intelligence + infrastructure)
          ------------------------------------------------
          OBSIDIAN PERSONAL        OBSIDIAN BUSINESS
          (owner command center)   (commercial multi-tenant SaaS)
          ------------------------------------------------
                     Vertical Business Modules
          OBSIDIAN RIDES   OBSIDIAN TOWING   OBSIDIAN BEAUTY   (future verticals)
```

- **OBSIDIAN CORE** — shared kernel: AI orchestration, auth, tenancy, permissions, memory, tools, events, analytics, audit, billing, voice.
- **OBSIDIAN PERSONAL** — the owner's private AI command center (business + trading + comms + project intelligence). A *consumer* of CORE.
- **OBSIDIAN BUSINESS** — the commercial subscription SaaS for service businesses. A multi-tenant *consumer* of CORE.
- **OBSIDIAN RIDES / TOWING / BEAUTY** — vertical modules that extend the shared data model. RIDES ships first with **Midnight Rydes as Customer Zero**.

Full definitions and the exact boundary between these layers are in [`docs/VERTICALS.md`](./docs/VERTICALS.md) and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Documentation map

| Document | Purpose |
|---|---|
| [`docs/VISION.md`](./docs/VISION.md) | What OBSIDIAN is and why it exists |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Modular-monolith design, orchestrator flow, event model, memory model |
| [`docs/PRODUCT_STRATEGY.md`](./docs/PRODUCT_STRATEGY.md) | Personal vs Business, delivery model, go-to-market via Customer Zero |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Phases 0–8, sequencing, and what "done" means per phase |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | Shared entities + per-vertical extensions |
| [`docs/SECURITY.md`](./docs/SECURITY.md) | Multi-tenancy, RLS, AI permission levels, audit, secrets |
| [`docs/SAAS_MODEL.md`](./docs/SAAS_MODEL.md) | Subscription tiers, entitlements, billing architecture |
| [`docs/VERTICALS.md`](./docs/VERTICALS.md) | CORE vs PERSONAL vs BUSINESS vs each vertical |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Architecture Decision Records + identified risks |
| [`AI_HANDOFF.md`](./AI_HANDOFF.md) | **Start here if you are a coding agent** |
| [`CURRENT_STATE.md`](./CURRENT_STATE.md) | Exactly what exists right now |
| [`RETURN_CHECKLIST.md`](./RETURN_CHECKLIST.md) | How to safely resume after the pause |

## Repository layout

```
obsidian/
  apps/
    web/              # the single deployable Next.js app (Command Center UI)
  packages/
    core/             # OBSIDIAN CORE kernel (orchestrator, permissions, events, memory)
    ai/               # model routing + tool-calling framework
    database/         # schema, migrations, RLS, typed queries
    auth/             # users, orgs, memberships, roles
    billing/          # subscriptions, entitlements (Stripe)
    analytics/        # aggregations + insight rules
    notifications/    # alerts + outbound delivery
  verticals/
    rides/            # OBSIDIAN RIDES (first vertical, Customer Zero)
    towing/           # OBSIDIAN TOWING (future; integrate later)
    beauty/           # OBSIDIAN BEAUTY (future)
  integrations/
    stripe/ elevenlabs/ messaging/ calendar/
  docs/               # the documents listed above
```

This is a **modular monolith**: one deployable app with clean internal module boundaries — not microservices. See [`docs/DECISIONS.md`](./docs/DECISIONS.md) (ADR-001).

## How to run

Nothing to run yet — Phase 0 is documentation only. The build begins with **Phase 1 (CORE MVP)** as described in [`docs/ROADMAP.md`](./docs/ROADMAP.md). The intended stack (subject to the evaluation in [`docs/DECISIONS.md`](./docs/DECISIONS.md)) is Next.js + TypeScript + Tailwind on the front end, Supabase/PostgreSQL for data and auth, the Claude API for AI, Stripe for billing, and ElevenLabs for voice.

## Guiding rules

Build in small verified milestones; keep business logic separate from UI; keep vertical logic modular; enforce tenant isolation everywhere; never expose secrets; prefer APIs over browser automation; keep documentation current. The full list is in [`AI_HANDOFF.md`](./AI_HANDOFF.md).

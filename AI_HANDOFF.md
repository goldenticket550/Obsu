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

Modular monolith. One deployable app (`apps/web`), internal modules in `packages/*` and `verticals/*`, provider adapters in `integrations/*`. The AI orchestrator flow is: user → interface → orchestrator → context → permissions → tools → data/APIs → result → response. **The AI calls schema-typed tools, never raw tables** (ADR-002). Business answers come from queries, not conversation memory (ADR-003). Tenancy is enforced with PostgreSQL RLS (ADR-006).

## Current phase & milestone

- **Phase:** PHASE 0 — Foundation.
- **Milestone:** Foundation complete. Documentation, architecture, folder scaffold, data model, roadmap, and decisions are written.

## Completed work

- 13 documentation files written and coherent (list in `README.md`).
- Modular-monolith folder scaffold created (`apps/`, `packages/*`, `verticals/*`, `integrations/*`) with README stubs + `.gitkeep`.
- `.gitignore` and `.env.example` (template only, no secrets).
- Shared data model, layer definitions, phased roadmap, security model, SaaS model, ADRs, and architecture risks documented.

## Incomplete / not started

**Everything executable.** There is **no application code**, no installed dependencies, no database, no migrations, no auth, no AI wiring, no UI. This is intentional for Phase 0.

## Important constraints (build rules — follow all)

1. Build in small verified milestones. 2. Don't generate hundreds of unnecessary files. 3. Don't install packages without justification. 4. Every milestone must run before moving on. 5. Strong TypeScript typing. 6. Business logic separate from UI. 7. Vertical logic modular. 8. Never expose secrets. 9. Use environment variables. 10. Maintain Git commits. 11. Tests for critical business logic. 12. Maintain DB migrations. 13. Maintain documentation. 14. Avoid premature microservices. 15. Modular monolith unless scale requires otherwise. 16. Prefer APIs over browser automation. 17. Webhooks/events for async where appropriate. 18. Maintain audit logs. 19. Enforce multi-tenant isolation. 20. Explain major architecture changes before implementing.

Additional hard rules: **do not merge the Trading Scanner or Towing codebases** (ADR-007). **No autonomous financial trades or transfers** (Level-4 only, with strong auth + confirmation + audit). **Do not hard-code pricing** (ADR-009).

## Intended stack (evaluate before committing — `docs/DECISIONS.md`)

Next.js + TypeScript + Tailwind (frontend); Supabase + PostgreSQL (data + auth + RLS); Claude API (AI, with possible future multi-model routing); Stripe (billing); ElevenLabs + a speech-to-text provider (voice); Inngest / Trigger.dev / Supabase Edge Functions / server workers (background jobs — deferred choice). Use Python selectively (trading scanner, financial analytics, ML/data-science), not for the whole ecosystem.

## How to run the system

Nothing to run yet — Phase 0 is documentation only. The first executable milestone is **Phase 1 (CORE MVP)**.

## Known bugs

None (no code yet).

## EXACT next recommended task

**Do not start until the founder's two sibling projects (AI Trading Scanner and AI Towing/Dispatch MVP) are far enough along that OBSIDIAN work should begin.** When it's time, the first task is **Phase 1 — OBSIDIAN CORE MVP, milestone 1:**

> Scaffold the `apps/web` Next.js + TypeScript + Tailwind application and stand up Supabase auth with the `User` / `Organization` / `Membership` tables and roles, **including Row-Level Security policies and a negative cross-tenant isolation test.** Nothing else. Get it running and committed before moving to the AI chat + tool framework milestone.

Do the smallest runnable slice, verify it runs, commit, update `CURRENT_STATE.md` and this file, then proceed. See `docs/ROADMAP.md` Phase 1 for scope and `RETURN_CHECKLIST.md` for how to resume safely.

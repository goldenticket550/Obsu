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

- **Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`). This supersedes the old abstract "Phase 1 CORE MVP" — CORE is built *through* RIDES (ADR-010).
- **Current sub-phase:** **M1 — Foundation. Code complete; runtime boot to be verified on the owner's machine** (the cloud build session had no npm registry access — see "How to run").

## Completed work

- Phase 0 foundation: 13 docs + modular-monolith folder scaffold + `.gitignore`/`.env.example`.
- RIDES-MVP planning: `docs/ROADMAP.md` updated (10 sub-phases M1–M10); ADR-010 (RIDES-first, single app not monorepo) and ADR-011 (lean 6-entity model) added.
- **M1 — Foundation:** a single Next.js 14 (App Router) + TypeScript (strict) + Tailwind app in `apps/web`. Renders the OBSIDIAN dashboard **shell** (placeholders). Supabase client/server modules configured (not yet live). Core domain types defined. `.env.local.example` template. See `apps/web/README.md`.
- Statically type-checked (all remaining type errors confirmed to be missing-dependency artifacts).

## Incomplete / not started

- **M1 runtime verification** — `npm install` + `npm run dev`/`build` must be run on a machine with npm access (not done in the cloud sandbox; it returned HTTP 403 for all packages).
- **M2 onward:** auth, database + migrations + RLS, CRUD, business-engine calc services + tests, live dashboard, Ask OBSIDIAN (Claude API + tools), natural-language trip entry, customer intelligence, field test. None started.
- Excluded from the whole MVP (do NOT build without explicit approval): voice/ElevenLabs, auto-SMS, social automation, trading/towing/beauty, native apps, complex fleet, accounting/banking, multi-agent.

## Important constraints (build rules — follow all)

1. Build in small verified milestones. 2. Don't generate hundreds of unnecessary files. 3. Don't install packages without justification. 4. Every milestone must run before moving on. 5. Strong TypeScript typing. 6. Business logic separate from UI. 7. Vertical logic modular. 8. Never expose secrets. 9. Use environment variables. 10. Maintain Git commits. 11. Tests for critical business logic. 12. Maintain DB migrations. 13. Maintain documentation. 14. Avoid premature microservices. 15. Modular monolith unless scale requires otherwise. 16. Prefer APIs over browser automation. 17. Webhooks/events for async where appropriate. 18. Maintain audit logs. 19. Enforce multi-tenant isolation. 20. Explain major architecture changes before implementing.

Additional hard rules: **do not merge the Trading Scanner or Towing codebases** (ADR-007). **No autonomous financial trades or transfers** (Level-4 only, with strong auth + confirmation + audit). **Do not hard-code pricing** (ADR-009).

## Intended stack (evaluate before committing — `docs/DECISIONS.md`)

Next.js + TypeScript + Tailwind (frontend); Supabase + PostgreSQL (data + auth + RLS); Claude API (AI, with possible future multi-model routing); Stripe (billing); ElevenLabs + a speech-to-text provider (voice); Inngest / Trigger.dev / Supabase Edge Functions / server workers (background jobs — deferred choice). Use Python selectively (trading scanner, financial analytics, ML/data-science), not for the whole ecosystem.

## How to run the system

```
cd apps/web
npm install
cp .env.local.example .env.local   # M1 boots even if left blank
npm run dev                        # http://localhost:3000  — expect a clean boot
npm run build                      # expect a successful production build
```

Requires Node 18.17+ (developed on Node 22). M1 needs no live Supabase/AI keys. **This has not been run yet** — the cloud build session could not reach the npm registry (HTTP 403 on all packages), so the first person with npm access should run the above to complete M1's "STOP AND VERIFY."

## Known bugs

None known. M1 was type-checked but not yet executed; treat any first-run error as the top priority before M2.

## EXACT next recommended task

**First:** run the commands above and confirm M1 boots + builds cleanly. Fix any first-run issue before proceeding.

**Then — M2 (Auth + Organization):**

> Add Supabase Auth (signup / login / logout), Organization creation, and a protected dashboard route. Introduce the `User` / `Organization` / `Membership` tables with roles and **Row-Level Security**, plus a negative cross-tenant isolation check. Keep to this sub-phase only; stop and verify before M3 (the rest of the database).

Do the smallest runnable slice, verify it runs, commit, update `CURRENT_STATE.md` and this file, then proceed. One sub-phase at a time (build rule #1/#4). See `docs/ROADMAP.md` (RIDES MVP track) and `RETURN_CHECKLIST.md`.

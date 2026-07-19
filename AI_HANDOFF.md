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
- **Current sub-phase:** **M2 — Auth + Organization. ✅ COMPLETE and VERIFIED running end-to-end on the owner's machine (2026-07-19).**
- **Next sub-phase:** **M3 — Database. NOT STARTED. Do not begin until the owner confirms M2 and explicitly says go.**

## Completed work

- Phase 0 foundation: 13 docs + modular-monolith folder scaffold + `.gitignore`/`.env.example`.
- RIDES-MVP planning: `docs/ROADMAP.md` (10 sub-phases M1–M10); ADR-010 (RIDES-first, single app not monorepo) and ADR-011 (lean 6-entity model).
- **M1 — Foundation:** Next.js 14 (App Router) + TypeScript (strict) + Tailwind app in `apps/web`. Dashboard shell. Supabase client/server modules. Verified booting (Next.js 14.2.35).
- **M2 — Auth + Organization (verified):** Supabase email/password auth (`src/app/login`), first-run business creation via the SECURITY DEFINER `create_organization()` RPC (`src/app/onboarding`), session refresh + route protection (`src/middleware.ts` + `src/lib/db/supabase-middleware.ts`), and a protected, personalized dashboard (`src/app/page.tsx`). Schema + RLS in `supabase/migrations/0001_organizations.sql` (organizations, memberships, `is_member_of()`, policies). Confirmed on the owner's machine against live Supabase: sign in → create "Midnight Rydes" → protected dashboard.

## Incomplete / not started

- **M2 residual (recommended before/with M3):** live negative **tenant-isolation** test with a *second* user (a second user must see none of the first's org). RLS structurally enforces it; a live second-user check is still the last box to tick. Needs a second login — owner to run.
- **M3 onward:** database (Customers, Trips, Expenses, Vehicles + migrations + RLS), CRUD, business-engine calc services + tests, live dashboard, Ask OBSIDIAN (Claude API + tools), natural-language trip entry, customer intelligence, field test. None started.
- Excluded from the whole MVP (do NOT build without explicit approval): voice/ElevenLabs, auto-SMS, social automation, trading/towing/beauty, native apps, complex fleet, accounting/banking, multi-agent.

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
npm run dev -- -p 3001     # http://localhost:3001 — 3000 is used by the Trading Scanner
npm run build              # production build
npm run typecheck          # tsc --noEmit — must stay clean (strict)
```

Requires Node 18.17+ (developed on Node 22–24). From M2 onward a live Supabase project + `.env.local` are required.

### Machine/config notes (owner)

- **Supabase project `hspfhyundcytxginsovh` is intentionally SHARED with the Trading Scanner** (owner's explicit decision). RIDES tables + RLS live in that DB alongside trader tables. Deliberate Customer-Zero convenience; revisit before any real multi-tenant launch. Keys live only in `apps/web/.env.local` (sourced from the owner's `.env5.txt`; the raw value there carries a `/rest/v1/` suffix that MUST be stripped for `@supabase/ssr`).
- Migration `0001` is already applied in that project (safe to re-run).

## Known bugs / gotchas

- **Sign-in requires a confirmed user.** Repeated `POST /login 303` back to `/login` = auth failure (the action redirects to `/login?error=…`). If it says "Email not confirmed", confirm the user in Supabase → Authentication → Users, or turn OFF Providers → Email → "Confirm email" for dev. Use **Sign in** (user pre-created), not "Create account".
- Next.js dev request logs can stop flushing to a redirected log file after the dev worker recompiles — don't rely solely on a tailed log to confirm behavior; verify in the browser.

## EXACT next recommended task

**First (optional, closes M2):** run the second-user tenant-isolation negative test (owner, needs a second login).

**Then — M3 (Database):**

> Add the Customers, Trips, Expenses, Vehicles tables as `supabase/migrations/0002_*.sql`, each with `organization_id` + RLS policies scoped via `is_member_of(organization_id)` (writes gated to org members). Add typed query helpers in `src/lib/db`. Optional seed data. Keep to this sub-phase only; stop and verify before M4 (CRUD UI).

Do the smallest runnable slice, verify it runs, commit, update `CURRENT_STATE.md` and this file, then proceed. One sub-phase at a time (build rule #1/#4). **Do not start M3 until the owner confirms M2 and says go.** See `docs/ROADMAP.md` (RIDES MVP track) and `RETURN_CHECKLIST.md`.

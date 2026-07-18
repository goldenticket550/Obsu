# CURRENT STATE

**As of:** Phase 0 foundation session (July 2026).
**Phase:** PHASE 0 — Foundation.
**Status:** Foundation complete. Safe to pause.

## What exists right now

**Documentation (13 files):**
`README.md`, `AI_HANDOFF.md`, `CURRENT_STATE.md`, `RETURN_CHECKLIST.md` at the repo root; `VISION.md`, `ARCHITECTURE.md`, `PRODUCT_STRATEGY.md`, `ROADMAP.md`, `DATA_MODEL.md`, `SECURITY.md`, `SAAS_MODEL.md`, `VERTICALS.md`, `DECISIONS.md` in `docs/`.

**Folder scaffold (empty modules, README stubs + `.gitkeep`):**
```
apps/web
packages/{core,ai,database,auth,billing,analytics,notifications}
verticals/{rides,towing,beauty}
integrations/{stripe,elevenlabs,messaging,calendar}
docs/
```

**Config:** `.gitignore`, `.env.example` (template only — no secrets, no real values).

## What does NOT exist

No application code. No installed dependencies (`node_modules` absent by design). No `package.json` manifests. No database, schema, or migrations. No auth. No AI orchestrator or tools. No UI beyond the concept. No tests. No CI. No deployment.

This is intentional — Phase 0 is documentation and architecture only.

## Decisions locked in

Modular monolith (ADR-001); AI calls tools not tables (ADR-002); answers from structured data (ADR-003); one Transaction table for money (ADR-004); background-job runner deferred (ADR-005); tenancy via PostgreSQL RLS (ADR-006); sibling projects stay separate (ADR-007); web-first + PWA (ADR-008); pricing is data (ADR-009). Full text in `docs/DECISIONS.md`.

## Blocked on / waiting for

OBSIDIAN build is intentionally paused while the founder completes two sibling projects first: the **AI Trading Scanner** and the **AI Towing/Dispatch MVP**. Neither is merged here; both have documented future integration paths (`docs/VERTICALS.md`, `docs/PRODUCT_STRATEGY.md`).

## Next action

Phase 1 — OBSIDIAN CORE MVP, milestone 1: scaffold `apps/web` (Next.js + TS + Tailwind) and Supabase auth with `User`/`Organization`/`Membership` + roles + **RLS** + a cross-tenant isolation test. Details in `AI_HANDOFF.md` and `docs/ROADMAP.md`.

## Git

Initialize a repository and make the first commit ("Phase 0: OBSIDIAN foundation") if not already done. Keep commits per build rule #10.

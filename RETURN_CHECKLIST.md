# RETURN CHECKLIST

Use this when you (or any coding agent) come back to OBSIDIAN after the pause. It exists so no one has to reconstruct context from memory.

## 1. Re-orient (read, in order)

1. `CURRENT_STATE.md` — what exists right now and what's next.
2. `AI_HANDOFF.md` — full constraints + the exact next task.
3. `docs/ROADMAP.md` — the phase you're entering and its "done when."
4. `docs/DECISIONS.md` — locked decisions and known risks (don't re-litigate silently).

## 2. Confirm the preconditions before building

- [ ] Are the two sibling projects ready? OBSIDIAN's build is meant to start after the **AI Trading Scanner** and **AI Towing/Dispatch MVP** are far enough along. If not, stay in Phase 0.
- [ ] Do **not** merge the Trading Scanner or Towing codebases (ADR-007). Confirm you're integrating via API/events later, not merging.
- [ ] Confirm the current phase in `CURRENT_STATE.md` — don't skip ahead of the roadmap.

## 3. Environment setup (when starting Phase 1)

- [ ] Node + package manager available; decide npm/pnpm and record it.
- [ ] Copy `.env.example` → `.env.local`; fill only the keys the current milestone needs. **Never commit real secrets.**
- [ ] Create the Supabase project; capture URL + keys in `.env.local` (service-role key server-only).
- [ ] Initialize Git if not already; ensure `.gitignore` is respected (no `.env`, no `node_modules`).

## 4. Build discipline (every session)

- [ ] Work the **smallest runnable slice** of the current milestone.
- [ ] It must **run** before you move on (build rule #4).
- [ ] Strong TypeScript typing; business logic out of the UI; vertical logic modular.
- [ ] Enforce tenant isolation (RLS) and add/keep a **negative cross-tenant test** for any data work.
- [ ] Audit-log all Level 3–4 actions; classify any new AI action by permission level (1–4).
- [ ] Don't install packages without justification; don't generate unnecessary files.
- [ ] Keep secrets in env vars only.

## 5. Close out (every session)

- [ ] Commit with a clear message.
- [ ] Update `CURRENT_STATE.md` (what now exists, what's next).
- [ ] Update `AI_HANDOFF.md` (completed/incomplete + exact next task).
- [ ] Add an ADR to `docs/DECISIONS.md` if a major decision changed (build rule #20 — explain before implementing).
- [ ] Update `docs/ROADMAP.md` if a phase's status changed.
- [ ] Note any known bugs in `AI_HANDOFF.md`.

## 6. Guardrails that never expire

- No autonomous financial trades or transfers — Level 4, strong auth + explicit confirmation + audit, only with explicit future authorization.
- Answer from structured data, never conversation memory alone.
- The AI calls tools, not tables.
- Data must never leak across organizations.
- Pricing/limits are data, never hard-coded.
- Original OBSIDIAN identity and voice — no copyrighted-character imitation.

## Quick status line

> Phase 0 complete. Foundation established. Next: Phase 1 CORE MVP milestone 1 (auth + orgs + RLS + isolation test) — but only once the Trading Scanner and Towing MVP are ready. **Safe to pause.**

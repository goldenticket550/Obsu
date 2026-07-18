# CURRENT STATE

**As of:** OBSIDIAN RIDES MVP — M1 (Foundation) session (July 2026).
**Active track:** OBSIDIAN RIDES MVP (see `docs/ROADMAP.md`).
**Current sub-phase:** M1 — Foundation.
**Status:** M1 code complete; runtime boot verification pending on the owner's machine (see note below).

## What exists right now

**Documentation:** the Phase-0 doc set (`README`, `AI_HANDOFF`, `CURRENT_STATE`, `RETURN_CHECKLIST` at root; `VISION`, `ARCHITECTURE`, `PRODUCT_STRATEGY`, `ROADMAP`, `DATA_MODEL`, `SECURITY`, `SAAS_MODEL`, `VERTICALS`, `DECISIONS` in `docs/`), plus `CUSTOMER_ZERO_FEEDBACK.md` (empty log, ready for the field test).

**Application (M1) — `apps/web`, a single Next.js app:**
```
apps/web/
  package.json, tsconfig.json (strict), next.config.mjs,
  tailwind.config.ts, postcss.config.mjs, .eslintrc.json,
  .env.local.example, next-env.d.ts, README.md
  src/
    app/        layout.tsx, page.tsx (dashboard shell), globals.css
    components/ dashboard.tsx (pure UI: StatCard, Panel, QuickAction, …)
    lib/
      db/       env.ts, supabase-client.ts, supabase-server.ts
      types/    index.ts (MVP domain types: Org, User, Membership, Customer, Vehicle, Trip, Expense)
```

**Folder scaffold (still placeholders for later extraction):** `packages/*`, `verticals/*`, `integrations/*` — documentation of future module boundaries; not wired as a monorepo (ADR-010).

## What works / what does NOT yet

- **Works (by design, static):** the app renders a styled OBSIDIAN dashboard **shell** — greeting, This-Month stat cards (placeholder "—"), Customer Insights / Recent Activity empty states, Quick Actions (disabled), a disabled Ask-OBSIDIAN input. Dark graphite/platinum theme, mobile-first.
- **Does NOT exist yet:** auth, database/tables, migrations, RLS, real data, business calculations, the AI chat, natural-language entry. Those are M2–M9.

## ⚠️ Verification note (important)

M1 code was written and **statically type-checked** (all type-checker errors were confirmed to be missing-dependency artifacts only). It was **NOT** possible to run `npm install` / `npm run dev` in the cloud build session because that sandbox had **no access to the npm registry** (all installs returned HTTP 403). The runtime "STOP AND VERIFY — app boots" step must therefore be completed on the owner's machine:

```
cd apps/web
npm install
cp .env.local.example .env.local   # boots even if blank
npm run dev                        # expect a clean boot at http://localhost:3000
npm run build                      # expect a successful production build
```

If any error appears, capture it — it's the first thing to fix before M2.

## Decisions locked in

ADR-001…009 (see `docs/DECISIONS.md`), plus:
- **ADR-010** — RIDES MVP is the first build; CORE built *through* RIDES; single Next.js app, not a monorepo yet.
- **ADR-011** — MVP uses the lean 6-entity data model; audit logging returns with Level-3 actions.

## Next action

**M2 — Auth + Organization** (only after M1 boots clean on the owner's machine): Supabase Auth signup/login/logout, Organization creation, protected dashboard, with RLS groundwork. Do **one sub-phase at a time**; stop and verify. Details in `AI_HANDOFF.md` and `docs/ROADMAP.md`.

## Git

Repository initialized. Commits: Phase 0 foundation; RIDES-MVP planning (roadmap + ADR-010/011); **M1 foundation**.

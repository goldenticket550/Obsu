# apps/web — OBSIDIAN RIDES

The single Next.js application for the OBSIDIAN RIDES MVP (Customer Zero: Midnight Rydes).
Modular monolith — one deployable app; business logic lives in `src/lib/*`, never in React components.

## Current milestone

**M1 — Foundation (complete).** The app boots and renders the OBSIDIAN dashboard *shell* (static placeholders). No auth, no database, no real data yet. See `../../docs/ROADMAP.md` for the 10 RIDES-MVP sub-phases and `../../AI_HANDOFF.md` for the exact next step.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · Supabase (client configured, not yet live) · Claude API (added at M7).

## Getting started

```bash
cd apps/web
npm install
cp .env.local.example .env.local   # M1 boots even if left blank
npm run dev                        # http://localhost:3000
```

Other scripts: `npm run build` (production build), `npm run start` (serve the build), `npm run lint`, `npm run typecheck`.

You'll need Node 18.17+ (developed on Node 22).

## Layout

```
src/
  app/
    layout.tsx        # root layout, metadata, theme
    page.tsx          # dashboard shell (M1 placeholder)
    globals.css       # Tailwind + OBSIDIAN theme tokens
  components/
    dashboard.tsx     # pure presentational UI (StatCard, Panel, …)
  lib/
    db/
      env.ts              # reads Supabase env vars with clear errors
      supabase-client.ts  # browser client (anon key + RLS)
      supabase-server.ts  # server client bound to request cookies
    types/
      index.ts        # core domain types (MVP data model)
```

## Conventions

Money is stored as integer **cents**; timestamps are **UTC ISO** strings. Keep financial/business logic in `src/lib` (services are added at M5), not in components. TypeScript stays strict. Secrets only in `.env.local`.

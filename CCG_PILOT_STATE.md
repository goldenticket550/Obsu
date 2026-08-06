# Covered by CCG — pilot state (LIVE)

**Status:** Live in production and handed off to the pilot customer.
**As of:** 2026-08-06. Repo `master` @ `328ab69`, pushed to `origin` (github.com/goldenticket550/Obsu).

## What this is
Covered by CCG is the first external customer of **Obsidian Rides** — an isolated
organization (tenant) *inside* the existing Rides app, not a separate application. It
reuses the shared Obsidian core: auth, organizations/memberships, RLS, the Eclipse Iris
orb, and the ElevenLabs voice.

## What was built for this pilot
- **Migration 0006** (applied to prod): organization pilot lifecycle — `status`, `plan`,
  `billing_enabled`, `slug`, `pilot_started_at`, `pilot_ends_at`; the `business_profile`
  table; `is_org_active()`; `activate_pilot()` (idempotent, 14-day, service-role only);
  `extend_pilot()`.
- **Migration 0007** (applied to prod): `pilot_feedback` + `activity_event`
  (append-only, allowlisted event names, size-capped JSON metadata), both RLS-scoped.
- **Expiration enforcement:** `assertOrgWriteAllowed()` (lib/db/org-access.ts) gates every
  write path — trips, customers, action-log, all proposal executors, voice tools, trip
  server actions — **fail-closed** via the `is_org_active()` RPC. Expired pilot = read-only;
  data preserved; billing never touched.
- **CCG design pass:** profile-driven gold "COVERED BY CCG" identity + CCG chip; cinematic
  hero (orb + skyline + route line); honest next-ride, readiness (shows "Unavailable" — no
  readiness schema yet), timeline, business pulse, performance trend; Ask Obsidian bar;
  mobile nav Home/Trips/Clients/More/Feedback. No fabricated data anywhere. Suburban image
  intentionally omitted.
- **setup-ccg-workspace.mjs:** safe, idempotent CCG org setup (billing off, pilot unstarted).

## Tenant isolation — HARD GATE PASSED
The live cross-tenant RLS proof (`apps/web/scripts/rls-cross-tenant-proof.mjs`) passed:
read / update / delete / spoofed-insert against another org's rows were all **REFUSED by
Postgres**, across every org-scoped table plus `business_profile`. The database refuses,
not just the app. This was the required gate before onboarding a second real customer.

## Customer / pilot
- **Org:** "Covered by CCG", slug `covered-by-ccg` (id `28b37e31-a5ea-49f0-ba59-12fc554b3516`).
- **Owner:** Red — login `ccgbookings@gmail.com`. Password is owner-managed (set via the
  app's Forgot-password flow; not stored here).
- **Pilot:** active, 14 days — started 2026-08-05 19:52 EDT, ends **2026-08-19 19:52 EDT**.
- **Billing:** OFF (`free_pilot`). No auto-conversion, no payment method.

## Deployment
- **Repo:** github.com/goldenticket550/Obsu, branch `master` @ `328ab69`.
- **Production:** https://obsidian-mvp.vercel.app (Vercel project `obsidian-mvp`).
- **IMPORTANT:** Vercel is **not** connected to GitHub for auto-deploy. Deploys are manual:
  `cd apps/web && npx vercel --prod`. A `git push` alone does **not** update production.
  Recommended fix: connect the Vercel project to the `Obsu` repo (root directory `apps/web`)
  so push = deploy.

## Open / deferred
- Rotate the API keys that were shown on screen during setup (Anthropic, ElevenLabs, Supabase).
- Connect Vercel ↔ GitHub so pushes auto-deploy.
- Confirm password-recovery works in prod (needs `NEXT_PUBLIC_SITE_URL` set on Vercel).
- Real "requests need a response" inbox + vehicle-readiness fields = future schema additions.
- Remove any lingering `ZZ-RLS-TEST` fixtures via the append-only cleanup procedure if any remain.
- Platform-admin UI (activate/extend from the app) deferred — currently service-role only.

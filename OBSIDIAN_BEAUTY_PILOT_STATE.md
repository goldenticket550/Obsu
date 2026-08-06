# Obsidian Beauty — pilot state (Infinite Beauty Palace)

**Status:** LIVE with the full mobile design. `0008`+`0009` applied, gate re-passed, mobile
redesign shipped. Owner account linked. Pilot NOT yet activated. **As of:** 2026-08-06.
**Repo:** github.com/goldenticket550/Obsu, branch `master`. **App:** `apps/web`.

## What this is
Obsidian Beauty is the second Obsidian vertical — the same operating-system idea as
Obsidian Rides, for beauty businesses (lash/brow/lip). It is a **product module inside the
Rides app** (`apps/web`, routes under `/beauty/*`), NOT a separate app. It reuses the shared
core unchanged: `organizations` + `memberships` + RLS via `is_member_of()`, the
`create_organization` RPC, the pilot lifecycle (0006), `business_profile`,
`assertOrgWriteAllowed()`, the Eclipse Iris orb, the ElevenLabs voice + `/api/voice/*`,
`action_log`/`activity_event`, and the design tokens. Rides was not modified.

Customer zero is **Infinite Beauty Palace**, a lash tech in a salon suite in Bed-Stuy,
Brooklyn NY.

## Architecture
- A per-org `organizations.vertical` column selects which command center the shell renders
  (`beauty` vs `rides`). Existing orgs default `rides`.
- Clients ARE the shared `customers` table; beauty-only fields (allergy/patch-test/natural-
  lash notes) live in a 1:1 `beauty_client_details` extension.
- New Beauty tables (all `organization_id`-scoped, RLS via `is_member_of`): `services`,
  `appointments`, `appointment_services` (add-on line items with a `category` snapshot),
  `working_hours`, `time_off`, `beauty_client_details`.
- Writes go through `assertOrgWriteAllowed` (fail-closed) and, for appointments/clients,
  through atomic `SECURITY INVOKER` RPCs (see 0009) that derive the org server-side and
  serialize scheduling per org with a `pg_advisory_xact_lock` to prevent double-booking.

## Migrations
- **`0008_beauty_core.sql` — APPLIED** to production (2026-08-06). Adds `vertical`, the two
  enums, and the six Beauty tables + RLS. Idempotent, ships with `_down`.
- **`0009_beauty_atomic_writes.sql` — APPLIED** to production (2026-08-06). Adds
  `appointment_services.category` (backfilled) and the
  `save_beauty_appointment` / `save_beauty_client` atomic RPCs (org derived server-side,
  `is_org_active` gate, advisory lock, server-side validation, category snapshots).
  Idempotent, ships with `_down`. The app shows a friendly "apply 0009" message if missing.

## Tenant isolation — GATE PASSED (re-run after 0009)
`apps/web/scripts/rls-cross-tenant-proof.mjs` was extended to all six Beauty tables and
passed live 2026-08-06: cross-tenant read/update/delete/spoofed-insert were all **REFUSED by
Postgres**. The proof now also throws on query errors and handles `beauty_client_details`'s
`customer_id` key. Re-run after `0009` on 2026-08-06 — passed again with a full REFUSED
matrix across all eleven org-scoped tables (the append-only `action_log` leaves inert,
marked `ZZ-RLS-TEST` fixtures, which is expected and harmless).

## Customer / pilot
- **Org:** "Infinite Beauty Palace", slug `infinite-beauty-palace`,
  id `2ef95ccb-7632-4fad-b1c4-eecdf5d5d538`, `vertical=beauty`, `status=pilot`,
  `plan=free_pilot`, `billing_enabled=false`.
- **Owner:** login `infinitebeautypalace@yahoo.com`, user id
  `4d4f98bb-9511-45e2-88a2-c2c86fd25f0`, role `owner`. Password owner-managed (set via the
  app's Forgot-password flow).
- **Pilot:** NOT activated (no countdown yet). `is_org_active` returns true because
  `pilot_ends_at` is NULL (not started = still usable). Run `activate_pilot(org, 14)` to
  start the 14-day clock when ready.
- **Billing:** OFF.

## Seeded workspace (from her intake)
Salon suite, Bed-Stuy Brooklyn; IG `Minks_byiris`; phone 516-846-8444; email
`infinitebeautypalace@yahoo.com`; **cash only**; hours **Tue–Sat 11:00–19:00**; policies in
`business_profile.settings` (grace 10 min, late fee $15 after 10 min, cancel after 15 min,
24h lead). Repeat clients every 2–3 weeks; ~25–30 appts/week. **22 services** seeded across
lash sets, 2-week fills, bottom lashes, cleansing, removal, brows, and lip filler (see
`scripts/setup-beauty-workspace.mjs` for the authoritative list + prices). Deposits: only
volume $20 / light volume $15 were given; others left NULL. No prices fabricated.

## Build / verification (Codex)
`npx tsc --noEmit` clean; `npm test` 707 tests pass (55 files); `npm run build` OK; all
Beauty routes compile; `git diff --check` clean. Included the orb/voice reuse, vertical-aware
shell + AI tools, server-side validation, DST-correct NY timezone/month boundaries, atomic
RPCs, and the hardened RLS proof.

## Deployment
- Production: **https://obsidian-mvp.vercel.app** (Vercel project `obsidian-mvp`, aliased).
  The live build includes `0009`'s atomic write RPCs (redeployed 2026-08-06, Vercel `READY`) —
  login, reads, and the booking/client write forms all work.
- Backed up to GitHub: commit `ac9cc4967e4133de8cb7b72ed5dd054152905942` on `origin/master`.
- Vercel is NOT git-connected: a git push does NOT deploy. Deploy manually with
  `cd apps/web` then `npx vercel --prod`.

## Done (2026-08-06)
`0008` + `0009` applied; isolation gate re-passed (full REFUSED matrix); full mobile design
system shipped across all `/beauty` screens (cream cards, antique-gold, serif headings,
day-timeline appointments, ranked Fills Due, category-filtered services, code-native nav
icons, orb intact as `ObsidianIntelligence`); the corrupted Rides mobile nav icons were also
fixed in the same pass (CCG benefits). Production deployed to https://obsidian-mvp.vercel.app
(Vercel `READY`). Latest commit `de6bead716e3857f60bbdac02ed07f766ef8136e` on `origin/master`
(prior milestones: `ac9cc496` build, `3f0dd37e` docs, `5a353736` assistant).

## Remaining (owner)
1. Owner logs in: https://obsidian-mvp.vercel.app → Forgot password →
   `infinitebeautypalace@yahoo.com` → set password → sign in. Booking/client forms are live.
2. `select public.activate_pilot('2ef95ccb-7632-4fad-b1c4-eecdf5d5d538', 14);` when ready to
   start the 14-day clock (the workspace already works without it).

## Housekeeping (non-blocking)
- Delete the placeholder auth account `her-real-email@example.com` (created during
  onboarding by pasting a placeholder; it was made owner then superseded) —
  Supabase → Authentication → Users → Delete.
- The RLS proof leaves inert, marked `ZZ-RLS-TEST-...` rows in the live DB (append-only
  `action_log` pins 2 throwaway orgs + users). Harmless; remove later with the controlled
  append-only-lift procedure if desired. Same footprint as the CCG gate.

## Out of scope for the pilot
Autonomous Instagram/SMS sending (her stated wish — a separate future phase with its own
approval; the pilot ships draft-and-copy reminders only), public client-facing booking page +
online deposits/payments (phase 2), billing/Stripe, replacing Acuity, and any refactor of the
Rides `Trip` type / tools switch / business engine.

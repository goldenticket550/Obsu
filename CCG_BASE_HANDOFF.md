# Covered by CCG — pilot base (built) + finish plan for Codex

This is the base for the two-week **Covered by CCG** pilot inside **Obsidian Rides**.
It was written against the *real* repo, not the mockups. Read this before building.

Repo: `~/Downloads/obsidian-rides-mvp/obsidian`  ·  App: `apps/web`  ·  Remote: `Obsu` (branch `master`).

---

## 0. What is already TRUE and VERIFIED (do not rebuild)

- **Multi-tenancy works.** Orgs are created by the `create_organization(org_name)` RPC
  (SECURITY DEFINER) which atomically makes the org + the caller's `owner` membership.
  Every business table (`customers`, `vehicles`, `trips`, `expenses`, `action_log`)
  is `organization_id`-scoped with RLS via `is_member_of(org)`.
- **RLS is proven at the DATABASE layer.** The live cross-tenant proof
  (`apps/web/scripts/rls-cross-tenant-proof.mjs`) passed on 2026-08-05: read/update/
  delete/spoof of another org's rows were all REFUSED by Postgres. The HARD GATE is met.
- **The command center already renders per-org.** `apps/web/src/app/page.tsx` reads the
  signed-in user's org via `memberships → organizations` and renders `org.name` as the
  title (`SkylineTopBar businessName={org.name}`), plus orb, voice, next-ride, pulse.
- **The orb + voice are real and reused.** `components/command/eclipse-iris-canvas.tsx`
  (orb, canvas), `components/command/obsidian-intelligence.tsx`, and server voice routes
  `/api/voice/transcribe` + `/api/voice/speak` (ElevenLabs, keys server-only). DO NOT
  build a second orb or voice path.
- **`action_log` is append-only** — enforced by policy + REVOKE + trigger. Never weaken it.

### Consequence — the pilot is a second org, not a new app.
An org simply **named "Covered by CCG"** already renders the whole command center for the
friend, scoped to his own data, titled "Covered by CCG", with **zero code changes**. What
this base adds on top is only the *pilot lifecycle* (time box + billing-off) and a
*branding profile*. Everything else is reuse.

---

## 1. What THIS BASE ships (apply these)

**Migration** `supabase/migrations/0006_pilot_lifecycle.sql` (+ `_down.sql`) — additive,
guarded, safe to re-run in the Supabase SQL Editor. Classification: **SHARED_CORE**.
- `organizations` gains: `status` (pilot|active|suspended|archived, default **active**),
  `plan` (free_pilot|internal|paid, default **internal**), `billing_enabled` (default
  **false**), `slug` (unique-when-present), `pilot_started_at`, `pilot_ends_at`.
  Existing Midnight Rydes row is untouched (active, never expires).
- `business_profile` table (1:1 with org): display_name, workspace_label, vehicle_
  description, colors, service_area, timezone, settings jsonb. RLS = members only.
- `is_org_active(org)` — active orgs always on; pilots on until `pilot_ends_at`
  (NULL = not started yet = still usable); suspended/archived off.
- `activate_pilot(org, days=14)` — **idempotent**, sets the window ONCE using server
  time (`coalesce` guards mean re-running NEVER resets dates), flips plan→free_pilot,
  billing→false. Service-role only (revoked from members).
- `extend_pilot(org, days=14)` — admin-only extension/reactivation.

**Setup** `apps/web/scripts/setup-ccg-workspace.mjs` — idempotent, service-role, prints
no secrets. Creates the CCG org (status pilot, billing off) + branding profile with
**placeholder** contact info. Deliberately does NOT create the friend's account, add a
real membership, or activate the pilot. Optional `CCG_PREVIEW_MEMBER_EMAIL` attaches an
existing user (e.g. you) as owner to preview.

### Apply order
1. Paste `0006_pilot_lifecycle.sql` into Supabase SQL Editor → Run. (Re-runnable.)
2. `cd apps/web && node scripts/setup-ccg-workspace.mjs`
   (optionally `CCG_PREVIEW_MEMBER_EMAIL=you@example.com node scripts/setup-ccg-workspace.mjs`).
3. Verify `next build` + `npm test` still green (base is additive; nothing should break).

---

## 2. What Codex should FINISH (remaining build)

Small, reviewable stages. After each: `tsc --noEmit`, `npm test`, `next build` stay green.

**A. Expiration enforcement (SHARED_CORE) — the one with teeth.**
`is_org_active(org)` exists but nothing calls it yet. Gate every WRITE server-side so an
expired pilot becomes read-only without deleting data or touching billing:
- write paths: `lib/db/trips.ts`, `customers.ts`, `expenses.ts`, `proposal-writes.ts`,
  `action-log.ts`; the trip API routes; and the voice tool executors (mutating tools).
- On expiry: reject the mutation with a clear error; show a friendly "pilot ended"
  state on the dashboard; keep all reads working. Reads stay allowed.
- Acceptance: an org whose `pilot_ends_at` is in the past cannot create/update/cancel a
  trip via UI, API, or voice; reads and the dashboard still render.

**B. CCG branding polish (PRODUCT_MODULE + CUSTOMER_SPECIFIC).**
Drive display from `business_profile`, not hardcoded strings:
- `SkylineTopBar` / header: show `workspace_label` ("CCG") + `display_name`
  ("COVERED BY CCG") alongside "OBSIDIAN RIDES". Fall back to `org.name` when no profile.
- Vehicle readiness uses `vehicle_description` ("blacked-out Chevrolet Suburban").
- Optional: apply `primary_color`/`secondary_color` as CSS variables for the CCG theme.
- Reuse the existing scene/orb — do not restyle the whole design system.

**C. Platform-admin separation (SHARED_CORE, can defer).**
`activate_pilot`/`extend_pilot` are service-role only today. If you want an in-app admin
control, add a real `platform_admin` concept (NOT org membership — an org owner must never
become a platform admin). Until then, activation is a deliberate SQL/service-role action.

**D. Pilot feedback + activity events (optional for the pilot).**
`pilot_feedback` table (org-scoped) + a discreet feedback action; allowlisted events
(`pilot_activated`, `orb_question_asked`, `feedback_submitted`, …). No transcripts, no PII.

**E. Tests.**
- Extend `rls-cross-tenant-proof.mjs` to include `business_profile`.
- Add expiration tests: active org write succeeds; expired pilot write refused; reads OK;
  `activate_pilot` twice does not move the dates.
- Keep the existing 643 tests green.

---

## 3. Guardrails (carry forward)

- Reuse the existing orb, voice, and command center. No second orb/voice. No ElevenLabs
  replacement. Keys stay server-only.
- Billing stays OFF: `billing_enabled=false`, `plan=free_pilot`, no payment method, no
  auto-conversion. Do not add billing middleware that could block the workspace.
- Migrations additive only. Never weaken `action_log` append-only. No destructive schema
  changes; ship a `_down.sql` with each.
- No hardcoded CCG PII in source — it lives in `business_profile` as data.
- Don't provision the *real* friend account or `activate_pilot` until explicitly told
  (Stage 9). Setup uses placeholders and leaves the pilot unstarted.

---

## 4. Housekeeping (separate, not blocking)

The RLS proof left inert, marked test data in the LIVE db that its own cleanup couldn't
delete because `action_log` is append-only (it pins 2 orgs + 2 users by FK). Marked
`ZZ-RLS-TEST-2026-08-05T06-08-46-902Z`. Removing it means deliberately, reversibly lifting
the append-only trigger, deleting in dependency order, and restoring it — a separate task,
not part of this build. It harms nothing meanwhile (RLS just proved it can't leak).

# OBSIDIAN — Production Migration Ledger

Last verified: 2026-08-06

Status values in this provisional object inventory: `objects present`, `end state present`.

Applied-status confirmed by production schema END STATE via PostgREST on 2026-08-06. Execution history, RLS policies, constraints, triggers, grants, and function bodies are NOT yet verified (requires SQL access). No CONFIRM rows remain for object existence.

These statuses describe only the observed production schema end state. They do not prove that any particular migration file ran.

| File | Purpose | Production status | Applied on | Evidence |
|---|---|---|---|---|
| `0001_organizations.sql` | Organizations, memberships, membership roles, tenant RLS, and organization-creation RPC | objects present | unknown | PostgREST exposes `organizations`, `memberships`, `is_member_of`, and `create_organization`. |
| `0002_business_tables.sql` | Tenant-scoped customers, vehicles, trips, and expenses with RLS | objects present | unknown | PostgREST exposes `customers`, `vehicles`, `trips`, `expenses`, and `payment_method`. |
| `0003_trip_payment_and_confirmation.sql` | Add `amount_paid_cents`, `confirmed_at`, `passenger_count`, and temporary singular `note` to trips | objects present | unknown | PostgREST exposes `amount_paid_cents`, `confirmed_at`, `payment_method`, and `passenger_count`. Constraint state and file execution are not proven. |
| `0004_drop_redundant_trip_note.sql` | Safely remove redundant `trips.note` while preserving `trips.notes` | end state present | unknown | PostgREST exposes `notes` and does not expose singular `note`. This proves the intended end state, not that this file ran. |
| `0005_action_log.sql` | Append-only tenant action log with RLS, restricted grants, foreign-key behavior, and rewrite-prevention trigger | objects present | unknown | PostgREST exposes `action_log`; append-only enforcement details are not yet verified. |
| `0006_pilot_lifecycle.sql` | Organization pilot lifecycle, business profile, active-window checks, and pilot administration RPCs | objects present | unknown | PostgREST exposes lifecycle columns, `business_profile`, and `is_org_active`. |
| `0007_pilot_feedback_events.sql` | Tenant-scoped pilot feedback and append-only activity events | objects present | unknown | PostgREST exposes `pilot_feedback` and `activity_event`; append-only enforcement details are not yet verified. |
| `0008_beauty_core.sql` | Beauty vertical discriminator, services, client details, appointments, scheduling tables, and RLS | objects present | unknown | PostgREST exposes `vertical`, `services`, `beauty_client_details`, `appointments`, `appointment_services`, `working_hours`, and `time_off`. |
| `0009_beauty_atomic_writes.sql` | Stable appointment service-category snapshots and atomic appointment/client write RPCs | objects present | unknown | PostgREST exposes `save_beauty_appointment` and `save_beauty_client`; function bodies and enforcement details are not yet verified. |

The 16 confirmed public tables are: `action_log`, `activity_event`, `appointment_services`, `appointments`, `beauty_client_details`, `business_profile`, `customers`, `expenses`, `memberships`, `organizations`, `pilot_feedback`, `services`, `time_off`, `trips`, `vehicles`, and `working_hours`.

The confirmed routines are: `create_organization`, `is_member_of`, `is_org_active`, `save_beauty_appointment`, and `save_beauty_client`.

Rollback files ending in `_down.sql` are reversal procedures and are not forward production migrations; their presence does not establish that either direction ran.
## Rule going forward

Production schema changes require a numbered migration committed here first. After approval and application, update this ledger on the same day with the date and verification evidence. Never record an estimated date as fact.

-- Reverses 0006_pilot_lifecycle.sql. Guarded; safe to run.
-- Note: leaves public.touch_updated_at() in place in case other objects use it.

drop function if exists public.extend_pilot(uuid, int);
drop function if exists public.activate_pilot(uuid, int);
drop function if exists public.is_org_active(uuid);

drop trigger if exists business_profile_touch on public.business_profile;
drop table if exists public.business_profile;

drop index if exists public.organizations_slug_key;

alter table public.organizations
  drop column if exists pilot_ends_at,
  drop column if exists pilot_started_at,
  drop column if exists slug,
  drop column if exists billing_enabled,
  drop column if exists plan,
  drop column if exists status;

drop type if exists public.org_plan;
drop type if exists public.org_status;

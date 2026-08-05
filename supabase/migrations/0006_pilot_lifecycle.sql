-- OBSIDIAN RIDES — 0006: Pilot lifecycle + business profile.
--
-- Purpose: let an organization be a time-boxed, billing-disabled PILOT
-- (e.g. "Covered by CCG") without changing anything for existing orgs.
--
-- Style matches 0001–0005: run ONCE in the Supabase SQL Editor. Additive and
-- idempotent — every statement is guarded, existing rows keep working, nothing
-- is dropped. Safe to re-run.
--
-- Existing orgs (Midnight Rydes) receive status='active', plan='internal',
-- billing_enabled=false and NO pilot dates, so they are unaffected and never
-- expire. Only an explicit activate_pilot() call starts a countdown.

-- 1. Status + plan enums ------------------------------------------------------
do $$ begin
  create type public.org_status as enum ('pilot','active','suspended','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.org_plan as enum ('free_pilot','internal','paid');
exception when duplicate_object then null; end $$;

-- 2. Lifecycle columns on organizations (additive, safe defaults) -------------
alter table public.organizations
  add column if not exists status           public.org_status not null default 'active',
  add column if not exists plan             public.org_plan   not null default 'internal',
  add column if not exists billing_enabled  boolean           not null default false,
  add column if not exists slug             text,
  add column if not exists pilot_started_at timestamptz,
  add column if not exists pilot_ends_at    timestamptz;

-- slug is unique only when present, so existing NULL-slug rows are fine.
create unique index if not exists organizations_slug_key
  on public.organizations (slug) where slug is not null;

-- 3. Business profile (1:1 with an org) — branding + operating identity --------
--    Customer-specific display data lives HERE, never hardcoded in source.
create table if not exists public.business_profile (
  organization_id     uuid primary key references public.organizations(id) on delete cascade,
  display_name        text,        -- "COVERED BY CCG"
  legal_name          text,
  owner_name          text,
  phone               text,
  email               text,
  service_area        text,        -- "New York City"
  timezone            text not null default 'America/New_York',
  vehicle_description text,        -- "New-model fully blacked-out Chevrolet Suburban"
  primary_color       text,        -- warm orbital gold, e.g. '#E8B04B'
  secondary_color     text,        -- electric cyan, e.g. '#37E8FF'
  workspace_label     text,        -- "CCG"
  settings            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.business_profile enable row level security;

-- Same is_member_of predicate the rest of the schema uses.
drop policy if exists "members manage business profile" on public.business_profile;
create policy "members manage business profile" on public.business_profile for all
  using (public.is_member_of(organization_id))
  with check (public.is_member_of(organization_id));

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists business_profile_touch on public.business_profile;
create trigger business_profile_touch
  before update on public.business_profile
  for each row execute function public.touch_updated_at();

-- 4. Is this org currently within an active window? ---------------------------
--    'active' orgs are always on. A 'pilot' is on until its end date (a NULL
--    end date = not yet started = still usable). suspended/archived are off.
--    App + API + voice use this to gate mutations after expiry.
create or replace function public.is_org_active(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when o.status = 'active' then true
    when o.status = 'pilot'  then (o.pilot_ends_at is null or now() < o.pilot_ends_at)
    else false
  end
  from public.organizations o
  where o.id = org;
$$;

-- 5. Activate a pilot — idempotent, trusted server time -----------------------
--    Sets the window ONCE. Re-running NEVER resets the dates (coalesce guards).
--    Service-role / platform-admin only (see grants below): an org owner must
--    not be able to self-extend their own pilot.
create or replace function public.activate_pilot(org uuid, days int default 14)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare o public.organizations;
begin
  update public.organizations
     set status           = 'pilot',
         plan             = 'free_pilot',
         billing_enabled  = false,
         pilot_started_at = coalesce(pilot_started_at, now()),
         pilot_ends_at    = coalesce(pilot_ends_at, now() + days * interval '1 day')
   where id = org
   returning * into o;
  if not found then raise exception 'organization % not found', org; end if;
  return o;
end;
$$;

-- 6. Extend / reactivate — admin only, deliberate -----------------------------
create or replace function public.extend_pilot(org uuid, days int default 14)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare o public.organizations;
begin
  update public.organizations
     set status        = 'pilot',
         pilot_ends_at  = greatest(coalesce(pilot_ends_at, now()), now()) + days * interval '1 day'
   where id = org
   returning * into o;
  if not found then raise exception 'organization % not found', org; end if;
  return o;
end;
$$;

-- 7. Permissions --------------------------------------------------------------
grant execute on function public.is_org_active(uuid) to authenticated;
-- activate_pilot / extend_pilot are intentionally NOT granted to members.
-- They run from the service role (setup / platform admin) only.
revoke execute on function public.activate_pilot(uuid, int) from anon, authenticated;
revoke execute on function public.extend_pilot(uuid, int)   from anon, authenticated;

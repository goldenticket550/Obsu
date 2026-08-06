-- OBSIDIAN BEAUTY — 0008: Beauty vertical core (appointments, services, schedule).
--
-- Purpose: add the Obsidian Beauty domain (lash/brow/etc.) BESIDE Obsidian Rides
-- in the same app + database, without touching a single rides table. Everything
-- here is organization_id-scoped with the SAME RLS predicate the rest of the
-- schema uses: public.is_member_of(organization_id). A beauty business is just
-- another org; its rows are invisible to every other org at the database layer.
--
-- Style matches 0001–0007: run ONCE in the Supabase SQL Editor. Additive and
-- idempotent — every statement is guarded (if not exists / duplicate_object),
-- existing rows keep working, nothing is dropped. Safe to re-run. Ships with
-- 0008_beauty_core_down.sql.
--
-- REUSED AS-IS (no change here): organizations, memberships, is_member_of(),
-- create_organization(), the pilot lifecycle + is_org_active() (0006),
-- business_profile (branding + timezone + settings jsonb for policies),
-- customers (used directly as lash CLIENTS), expenses (product/supply costs),
-- action_log, activity_event (0007).

-- 1. Vertical discriminator on organizations (SHARED_CORE, additive) ----------
--    Lets the app shell render the Beauty command center for a beauty org and
--    the Rides one for a rides org. Existing orgs default to 'rides', which is
--    correct for Midnight Rydes and Covered by CCG. The beauty setup script
--    sets 'beauty' explicitly. No enum (kept as text) so adding future verticals
--    needs no migration.
alter table public.organizations
  add column if not exists vertical text not null default 'rides';

-- 2. Enums --------------------------------------------------------------------
do $$ begin
  create type public.service_category as enum
    ('lash_set','lash_fill','bottom_lash','cleansing','removal','brow','lip_filler','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum
    ('booked','completed','canceled','no_show');
exception when duplicate_object then null; end $$;
-- NOTE: public.payment_method (0002: cash/zelle/cashapp/venmo/card/invoice/other)
-- is REUSED for appointments — no new payment enum.

-- 3. Service menu (each lash set / fill / brow / filler with duration + price) -
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  category         public.service_category not null default 'other',
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents      integer not null check (price_cents >= 0),
  deposit_cents    integer check (deposit_cents is null or deposit_cents >= 0),
  description      text,
  active           boolean not null default true,
  sort_order       integer,
  created_at       timestamptz not null default now()
);
create index if not exists services_org_idx on public.services(organization_id);

-- 4. Beauty client details — 1:1 EXTENSION of the shared customers table ------
--    Lash clients ARE public.customers (name/phone/email/notes). Beauty-only
--    fields (allergy / patch test / natural-lash notes) live here so the shared
--    customers table stays clean. organization_id is denormalized so this table
--    carries the SAME RLS predicate directly.
create table if not exists public.beauty_client_details (
  customer_id        uuid primary key references public.customers(id) on delete cascade,
  organization_id    uuid not null references public.organizations(id) on delete cascade,
  allergy_notes      text,
  patch_test_date    date,
  patch_test_result  text,
  natural_lash_notes text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists beauty_client_details_org_idx on public.beauty_client_details(organization_id);

-- 5. Appointments (the core object — a booked/served visit) -------------------
--    price_cents is the recorded total (source of truth), detailed by the line
--    items in 6. deposit / late_fee / amount_paid are honest recorded numbers,
--    NOT a payments integration (she takes cash; deposits via her own channels).
create table if not exists public.appointments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  client_id         uuid references public.customers(id) on delete set null,
  service_id        uuid references public.services(id) on delete set null,   -- primary service
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  status            public.appointment_status not null default 'booked',
  price_cents       integer not null default 0 check (price_cents >= 0),
  deposit_cents     integer check (deposit_cents is null or deposit_cents >= 0),
  deposit_paid      boolean not null default false,
  amount_paid_cents integer check (amount_paid_cents is null or amount_paid_cents >= 0),
  payment_method    public.payment_method,
  late_fee_cents    integer check (late_fee_cents is null or late_fee_cents >= 0),
  notes             text,
  created_at        timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists appointments_org_idx      on public.appointments(organization_id);
create index if not exists appointments_client_idx   on public.appointments(client_id);
create index if not exists appointments_start_idx    on public.appointments(organization_id, starts_at);

-- 6. Appointment line items (set + add-ons: lash bath, bottom lashes, removal) -
--    Directly addresses her "people forgetting to add add-ons" pain: every
--    add-on is its own line. name/price/duration are SNAPSHOTS taken at booking
--    so later menu edits never rewrite past bills. The app keeps
--    appointments.price_cents in sync with the sum of these lines.
create table if not exists public.appointment_services (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  appointment_id   uuid not null references public.appointments(id) on delete cascade,
  service_id       uuid references public.services(id) on delete set null,
  name             text not null,
  price_cents      integer not null default 0 check (price_cents >= 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  created_at       timestamptz not null default now()
);
create index if not exists appointment_services_org_idx on public.appointment_services(organization_id);
create index if not exists appointment_services_appt_idx on public.appointment_services(appointment_id);

-- 7. Working hours (her weekly template) --------------------------------------
--    Times are local wall-clock (`time`), interpreted in the org's
--    business_profile.timezone. Beauty uses calendar days (no rides 4 AM
--    rollover). weekday: 0=Sunday .. 6=Saturday.
create table if not exists public.working_hours (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  weekday          smallint not null check (weekday between 0 and 6),
  start_time       time not null,
  end_time         time not null,
  created_at       timestamptz not null default now(),
  check (end_time > start_time),
  unique (organization_id, weekday, start_time)
);
create index if not exists working_hours_org_idx on public.working_hours(organization_id);

-- 8. Time off / blocks (dated exceptions to the weekly template) --------------
create table if not exists public.time_off (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  reason           text,
  created_at       timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists time_off_org_idx on public.time_off(organization_id);

-- 9. Row-Level Security — same predicate as every other org-scoped table ------
alter table public.services              enable row level security;
alter table public.beauty_client_details enable row level security;
alter table public.appointments          enable row level security;
alter table public.appointment_services  enable row level security;
alter table public.working_hours         enable row level security;
alter table public.time_off              enable row level security;

drop policy if exists "members manage services" on public.services;
create policy "members manage services" on public.services for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));

drop policy if exists "members manage beauty_client_details" on public.beauty_client_details;
create policy "members manage beauty_client_details" on public.beauty_client_details for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));

drop policy if exists "members manage appointments" on public.appointments;
create policy "members manage appointments" on public.appointments for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));

drop policy if exists "members manage appointment_services" on public.appointment_services;
create policy "members manage appointment_services" on public.appointment_services for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));

drop policy if exists "members manage working_hours" on public.working_hours;
create policy "members manage working_hours" on public.working_hours for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));

drop policy if exists "members manage time_off" on public.time_off;
create policy "members manage time_off" on public.time_off for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));

-- 10. updated_at touch on the one table that has it ---------------------------
--     Reuses public.touch_updated_at() defined in 0006.
drop trigger if exists beauty_client_details_touch on public.beauty_client_details;
create trigger beauty_client_details_touch
  before update on public.beauty_client_details
  for each row execute function public.touch_updated_at();

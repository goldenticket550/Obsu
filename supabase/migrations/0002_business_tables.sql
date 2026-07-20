do $$ begin create type public.trip_type as enum
  ('airport','hourly','event','prom','photoshoot','nightlife','special_occasion','other');
exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_method as enum
  ('cash','zelle','cashapp','venmo','card','invoice','other');
exception when duplicate_object then null; end $$;
do $$ begin create type public.trip_status as enum ('completed','scheduled','canceled');
exception when duplicate_object then null; end $$;
do $$ begin create type public.expense_category as enum
  ('gas','tolls','parking','cleaning','maintenance','supplies','marketing','other');
exception when duplicate_object then null; end $$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text, email text, notes text,
  created_at timestamptz not null default now()
);
create index if not exists customers_org_idx on public.customers(organization_id);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nickname text not null,
  make text, model text, year int,
  created_at timestamptz not null default now()
);
create index if not exists vehicles_org_idx on public.vehicles(organization_id);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  trip_date date not null default (now() at time zone 'utc')::date,
  pickup_location text, dropoff_location text,
  trip_type public.trip_type,
  start_time timestamptz, end_time timestamptz,
  hours numeric(6,2) check (hours is null or hours >= 0),
  hourly_rate_cents integer check (hourly_rate_cents is null or hourly_rate_cents >= 0),
  revenue_cents integer not null default 0 check (revenue_cents >= 0),
  payment_method public.payment_method,
  mileage numeric(8,1) check (mileage is null or mileage >= 0),
  notes text,
  status public.trip_status not null default 'completed',
  created_at timestamptz not null default now()
);
create index if not exists trips_org_idx on public.trips(organization_id);
create index if not exists trips_customer_idx on public.trips(customer_id);
create index if not exists trips_date_idx on public.trips(organization_id, trip_date);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  expense_date date not null default (now() at time zone 'utc')::date,
  category public.expense_category not null default 'other',
  amount_cents integer not null check (amount_cents >= 0),
  description text,
  created_at timestamptz not null default now()
);
create index if not exists expenses_org_idx on public.expenses(organization_id);
create index if not exists expenses_trip_idx on public.expenses(trip_id);
create index if not exists expenses_date_idx on public.expenses(organization_id, expense_date);

alter table public.customers enable row level security;
alter table public.vehicles  enable row level security;
alter table public.trips     enable row level security;
alter table public.expenses  enable row level security;

drop policy if exists "members manage customers" on public.customers;
create policy "members manage customers" on public.customers for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));
drop policy if exists "members manage vehicles" on public.vehicles;
create policy "members manage vehicles" on public.vehicles for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));
drop policy if exists "members manage trips" on public.trips;
create policy "members manage trips" on public.trips for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));
drop policy if exists "members manage expenses" on public.expenses;
create policy "members manage expenses" on public.expenses for all
  using (public.is_member_of(organization_id)) with check (public.is_member_of(organization_id));

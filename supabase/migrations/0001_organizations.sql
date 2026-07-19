-- OBSIDIAN RIDES — M2 schema: Organizations + Memberships with Row-Level Security.
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- It is written to be safe to re-run.

-- 1. Membership role enum ------------------------------------------------------
do $$
begin
  create type public.membership_role as enum
    ('owner', 'admin', 'manager', 'employee', 'driver');
exception
  when duplicate_object then null;
end
$$;

-- 2. Organizations (a business / tenant) --------------------------------------
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- 3. Memberships (which user belongs to which org, and their role) ------------
create table if not exists public.memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            public.membership_role not null default 'owner',
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists memberships_org_id_idx  on public.memberships(organization_id);

-- 4. Turn ON Row-Level Security -----------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships   enable row level security;

-- 5. Helper: is the current user a member of this org? ------------------------
-- SECURITY DEFINER so it bypasses RLS internally (prevents infinite recursion
-- when the memberships policy needs to check membership).
create or replace function public.is_member_of(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = org
      and m.user_id = auth.uid()
  );
$$;

-- 6. Policies: a user can only see orgs/memberships they belong to ------------
drop policy if exists "members can view their orgs"   on public.organizations;
drop policy if exists "members can update their orgs" on public.organizations;
drop policy if exists "view memberships in my orgs"   on public.memberships;

create policy "members can view their orgs"
  on public.organizations for select
  using ( public.is_member_of(id) );

create policy "members can update their orgs"
  on public.organizations for update
  using ( public.is_member_of(id) );

create policy "view memberships in my orgs"
  on public.memberships for select
  using ( public.is_member_of(organization_id) );

-- Note: there are intentionally NO INSERT policies. Rows are only created
-- through the create_organization() function below, so users cannot insert
-- arbitrary orgs/memberships directly.

-- 7. Create-organization RPC --------------------------------------------------
-- Atomically creates the org and the caller's OWNER membership.
create or replace function public.create_organization(org_name text)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'organization name is required';
  end if;

  insert into public.organizations (name)
  values (trim(org_name))
  returning * into new_org;

  insert into public.memberships (organization_id, user_id, role)
  values (new_org.id, auth.uid(), 'owner');

  return new_org;
end;
$$;

-- 8. Permissions --------------------------------------------------------------
grant execute on function public.is_member_of(uuid)        to authenticated;
grant execute on function public.create_organization(text) to authenticated;

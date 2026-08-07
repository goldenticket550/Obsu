-- OBSIDIAN Core - 0011: exclude cross-tenant proof fixture organizations from Core reads.
--
-- Read-only function replacement. No schema or table changes.

create or replace function public.core_portfolio_summary()
returns table (
  organization_id uuid,
  organization_name text,
  display_name text,
  workspace_label text,
  vertical text,
  status text,
  plan text,
  pilot_started_at timestamptz,
  pilot_ends_at timestamptz,
  is_active boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
stable
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'insufficient privilege' using errcode = '42501';
  end if;

  return query
    select
      o.id,
      o.name,
      bp.display_name,
      bp.workspace_label,
      o.vertical,
      o.status::text,
      o.plan::text,
      o.pilot_started_at,
      o.pilot_ends_at,
      public.is_org_active(o.id)
    from public.organizations o
    left join public.business_profile bp on bp.organization_id = o.id
    where not (coalesce(o.slug, '') ilike 'zz-rls-test-%' or o.name ilike 'ZZ-RLS-TEST%')
    order by o.vertical, coalesce(bp.display_name, o.name), o.id;
end;
$$;

create or replace function public.core_open_feedback(
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  feedback_id uuid,
  organization_id uuid,
  organization_name text,
  division text,
  category text,
  priority text,
  status text,
  title text,
  description text,
  page_or_feature text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
stable
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'insufficient privilege' using errcode = '42501';
  end if;
  if page_size < 1 or page_size > 50 or page_offset < 0 then
    raise exception 'invalid pagination' using errcode = '22023';
  end if;

  return query
    select
      pf.id,
      pf.organization_id,
      coalesce(bp.display_name, o.name),
      o.vertical,
      pf.category,
      pf.priority,
      pf.status,
      pf.title,
      pf.description,
      pf.page_or_feature,
      pf.created_at,
      count(*) over ()
    from public.pilot_feedback pf
    join public.organizations o on o.id = pf.organization_id
    left join public.business_profile bp on bp.organization_id = o.id
    where not (coalesce(o.slug, '') ilike 'zz-rls-test-%' or o.name ilike 'ZZ-RLS-TEST%')
      and pf.status in ('new', 'reviewing')
    order by pf.created_at desc, pf.id desc
    limit page_size
    offset page_offset;
end;
$$;

create or replace function public.core_activity_counts(
  since_at timestamptz default (now() - interval '7 days')
)
returns table (
  organization_id uuid,
  organization_name text,
  division text,
  event_name text,
  event_count bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public
stable
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'insufficient privilege' using errcode = '42501';
  end if;
  if since_at is null or since_at > now() or since_at < now() - interval '31 days' then
    raise exception 'invalid activity window' using errcode = '22023';
  end if;

  return query
    select
      ae.organization_id,
      coalesce(bp.display_name, o.name),
      o.vertical,
      ae.event_name,
      count(*)
    from public.activity_event ae
    join public.organizations o on o.id = ae.organization_id
    left join public.business_profile bp on bp.organization_id = o.id
    where not (coalesce(o.slug, '') ilike 'zz-rls-test-%' or o.name ilike 'ZZ-RLS-TEST%')
      and ae.created_at >= since_at
    group by ae.organization_id, coalesce(bp.display_name, o.name), o.vertical, ae.event_name
    order by o.vertical, coalesce(bp.display_name, o.name), ae.event_name;
end;
$$;

create or replace function public.core_recent_notable_activity(
  row_limit integer default 20
)
returns table (
  event_id uuid,
  organization_id uuid,
  organization_name text,
  division text,
  event_name text,
  feature text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
stable
as $$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'insufficient privilege' using errcode = '42501';
  end if;
  if row_limit < 1 or row_limit > 50 then
    raise exception 'invalid row limit' using errcode = '22023';
  end if;

  return query
    select
      ae.id,
      ae.organization_id,
      coalesce(bp.display_name, o.name),
      o.vertical,
      ae.event_name,
      ae.feature,
      ae.created_at
    from public.activity_event ae
    join public.organizations o on o.id = ae.organization_id
    left join public.business_profile bp on bp.organization_id = o.id
    where not (coalesce(o.slug, '') ilike 'zz-rls-test-%' or o.name ilike 'ZZ-RLS-TEST%')
      and ae.event_name in ('pilot_expired', 'pilot_extended', 'feedback_submitted')
    order by ae.created_at desc, ae.id desc
    limit row_limit;
end;
$$;

revoke all on function public.core_portfolio_summary() from public, anon;
revoke all on function public.core_open_feedback(integer, integer) from public, anon;
revoke all on function public.core_activity_counts(timestamptz) from public, anon;
revoke all on function public.core_recent_notable_activity(integer) from public, anon;

grant execute on function public.core_portfolio_summary() to authenticated;
grant execute on function public.core_open_feedback(integer, integer) to authenticated;
grant execute on function public.core_activity_counts(timestamptz) to authenticated;
grant execute on function public.core_recent_notable_activity(integer) to authenticated;

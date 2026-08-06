-- OBSIDIAN BEAUTY — 0009: stable service-category snapshots and atomic writes.
-- Apply manually in the Supabase SQL Editor after review. The app must not use
-- the Beauty write forms until this migration is applied.

alter table public.appointment_services
  add column if not exists category public.service_category;

update public.appointment_services line
set category = coalesce(service.category, 'other'::public.service_category)
from public.services service
where line.service_id = service.id
  and line.category is null;

update public.appointment_services
set category = 'other'::public.service_category
where category is null;

alter table public.appointment_services
  alter column category set default 'other'::public.service_category,
  alter column category set not null;

create or replace function public.save_beauty_appointment(
  p_appointment_id uuid,
  p_client_id uuid,
  p_primary_service_id uuid,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_status public.appointment_status,
  p_deposit_cents integer,
  p_deposit_paid boolean,
  p_amount_paid_cents integer,
  p_payment_method public.payment_method,
  p_late_fee_cents integer,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org_id uuid;
  v_timezone text;
  v_appointment_id uuid;
  v_service_count integer;
  v_total_cents integer;
  v_total_minutes integer;
  v_ends_at timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
begin
  select m.organization_id
    into v_org_id
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
   where m.user_id = auth.uid()
     and o.vertical = 'beauty'
   order by m.created_at
   limit 1;

  if v_org_id is null then
    raise exception 'No Beauty organization found for this user.';
  end if;
  if public.is_org_active(v_org_id) is distinct from true then
    raise exception 'This workspace is read-only because its pilot has ended or access is suspended.';
  end if;
  if p_starts_at is null then raise exception 'A start time is required.'; end if;
  if p_service_ids is null or cardinality(p_service_ids) = 0 then
    raise exception 'Select at least one service.';
  end if;
  if p_primary_service_id is distinct from p_service_ids[1] then
    raise exception 'The primary service must be the first selected service.';
  end if;
  if (select count(distinct selected_id) from unnest(p_service_ids) selected(selected_id)) <> cardinality(p_service_ids) then
    raise exception 'A service can only be selected once.';
  end if;
  if coalesce(p_deposit_cents, 0) < 0 or coalesce(p_amount_paid_cents, 0) < 0 or coalesce(p_late_fee_cents, 0) < 0 then
    raise exception 'Money values cannot be negative.';
  end if;

  select count(*), coalesce(sum(s.price_cents), 0), coalesce(sum(s.duration_minutes), 0)
    into v_service_count, v_total_cents, v_total_minutes
    from public.services s
   where s.organization_id = v_org_id
     and s.active = true
     and s.id = any(p_service_ids);

  if v_service_count <> cardinality(p_service_ids) then
    raise exception 'One or more selected services are inactive or unavailable.';
  end if;
  if p_client_id is not null and not exists (
    select 1 from public.customers c
     where c.id = p_client_id and c.organization_id = v_org_id
  ) then
    raise exception 'The selected client is unavailable.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_total_minutes);
  if v_ends_at <= p_starts_at then raise exception 'Appointment duration is invalid.'; end if;

  -- Serialize schedule decisions per organization so two concurrent requests
  -- cannot both pass the overlap check and create overlapping appointments.
  perform pg_advisory_xact_lock(hashtextextended(v_org_id::text, 0));

  if p_status <> 'canceled'::public.appointment_status then
    if exists (
      select 1 from public.appointments a
       where a.organization_id = v_org_id
         and a.status <> 'canceled'::public.appointment_status
         and a.id is distinct from p_appointment_id
         and a.starts_at < v_ends_at
         and a.ends_at > p_starts_at
    ) then
      raise exception 'This time overlaps another appointment.';
    end if;
    if exists (
      select 1 from public.time_off block
       where block.organization_id = v_org_id
         and block.starts_at < v_ends_at
         and block.ends_at > p_starts_at
    ) then
      raise exception 'This time overlaps a time-off block.';
    end if;

    select coalesce(profile.timezone, 'America/New_York')
      into v_timezone
      from public.business_profile profile
     where profile.organization_id = v_org_id;
    v_timezone := coalesce(v_timezone, 'America/New_York');
    v_local_start := p_starts_at at time zone v_timezone;
    v_local_end := v_ends_at at time zone v_timezone;

    if v_local_start::date <> v_local_end::date or not exists (
      select 1 from public.working_hours hours
       where hours.organization_id = v_org_id
         and hours.weekday = extract(dow from v_local_start)::smallint
         and hours.start_time <= v_local_start::time
         and hours.end_time >= v_local_end::time
    ) then
      raise exception 'This time is outside working hours.';
    end if;
  end if;

  if p_appointment_id is null then
    insert into public.appointments (
      organization_id, client_id, service_id, starts_at, ends_at, status,
      price_cents, deposit_cents, deposit_paid, amount_paid_cents,
      payment_method, late_fee_cents, notes
    ) values (
      v_org_id, p_client_id, p_primary_service_id, p_starts_at, v_ends_at,
      p_status, v_total_cents, p_deposit_cents, p_deposit_paid,
      p_amount_paid_cents, p_payment_method, p_late_fee_cents, p_notes
    ) returning id into v_appointment_id;
  else
    update public.appointments
       set client_id = p_client_id,
           service_id = p_primary_service_id,
           starts_at = p_starts_at,
           ends_at = v_ends_at,
           status = p_status,
           price_cents = v_total_cents,
           deposit_cents = p_deposit_cents,
           deposit_paid = p_deposit_paid,
           amount_paid_cents = p_amount_paid_cents,
           payment_method = p_payment_method,
           late_fee_cents = p_late_fee_cents,
           notes = p_notes
     where id = p_appointment_id
       and organization_id = v_org_id
     returning id into v_appointment_id;
    if v_appointment_id is null then raise exception 'Appointment not found.'; end if;
    delete from public.appointment_services
     where appointment_id = v_appointment_id and organization_id = v_org_id;
  end if;

  insert into public.appointment_services (
    organization_id, appointment_id, service_id, name, category,
    price_cents, duration_minutes
  )
  select v_org_id, v_appointment_id, service.id, service.name,
         service.category, service.price_cents, service.duration_minutes
    from unnest(p_service_ids) with ordinality selected(id, position)
    join public.services service
      on service.id = selected.id and service.organization_id = v_org_id
   order by selected.position;

  return v_appointment_id;
end;
$$;

create or replace function public.save_beauty_client(
  p_customer_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_notes text,
  p_allergy_notes text,
  p_patch_test_date date,
  p_patch_test_result text,
  p_natural_lash_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_org_id uuid;
  v_customer_id uuid;
begin
  select m.organization_id
    into v_org_id
    from public.memberships m
    join public.organizations o on o.id = m.organization_id
   where m.user_id = auth.uid()
     and o.vertical = 'beauty'
   order by m.created_at
   limit 1;

  if v_org_id is null then raise exception 'No Beauty organization found for this user.'; end if;
  if public.is_org_active(v_org_id) is distinct from true then
    raise exception 'This workspace is read-only because its pilot has ended or access is suspended.';
  end if;
  if nullif(btrim(p_name), '') is null then raise exception 'Name is required.'; end if;

  if p_customer_id is null then
    insert into public.customers (organization_id, name, phone, email, notes)
    values (v_org_id, btrim(p_name), p_phone, p_email, p_notes)
    returning id into v_customer_id;
  else
    update public.customers
       set name = btrim(p_name), phone = p_phone, email = p_email, notes = p_notes
     where id = p_customer_id and organization_id = v_org_id
    returning id into v_customer_id;
    if v_customer_id is null then raise exception 'Client not found.'; end if;
  end if;

  insert into public.beauty_client_details (
    customer_id, organization_id, allergy_notes, patch_test_date,
    patch_test_result, natural_lash_notes
  ) values (
    v_customer_id, v_org_id, p_allergy_notes, p_patch_test_date,
    p_patch_test_result, p_natural_lash_notes
  )
  on conflict (customer_id) do update
    set allergy_notes = excluded.allergy_notes,
        patch_test_date = excluded.patch_test_date,
        patch_test_result = excluded.patch_test_result,
        natural_lash_notes = excluded.natural_lash_notes;

  return v_customer_id;
end;
$$;

grant execute on function public.save_beauty_appointment(
  uuid, uuid, uuid, uuid[], timestamptz, public.appointment_status, integer,
  boolean, integer, public.payment_method, integer, text
) to authenticated;
grant execute on function public.save_beauty_client(
  uuid, text, text, text, text, text, date, text, text
) to authenticated;

revoke execute on function public.save_beauty_appointment(
  uuid, uuid, uuid, uuid[], timestamptz, public.appointment_status, integer,
  boolean, integer, public.payment_method, integer, text
) from public, anon;
revoke execute on function public.save_beauty_client(
  uuid, text, text, text, text, text, date, text, text
) from public, anon;

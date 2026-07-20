-- OPTIONAL dev seed — removable test data. Do NOT run in production.
-- Run manually only when asked (Supabase SQL Editor or psql).
do $$ declare org uuid;
begin
  select id into org from public.organizations where name = 'Midnight Rydes' order by created_at limit 1;
  if org is null then raise notice 'Midnight Rydes org not found; skipping seed'; return; end if;
  insert into public.vehicles (organization_id, nickname, make, model, year)
    values (org, 'The Suburban', 'Chevrolet', 'Suburban', 2022);
  insert into public.customers (organization_id, name, phone)
    values (org, 'Ashley', '555-0100'), (org, 'Crystal', '555-0142');
  insert into public.trips (organization_id, customer_id, trip_date, pickup_location, dropoff_location, trip_type, revenue_cents, payment_method, status)
    select org, c.id, current_date, 'Brooklyn', 'JFK', 'airport', 24000, 'zelle', 'completed'
    from public.customers c where c.organization_id = org and c.name = 'Ashley' limit 1;
  insert into public.expenses (organization_id, trip_id, expense_date, category, amount_cents, description)
    select org, t.id, current_date, 'gas', 1800, 'Gas for JFK run'
    from public.trips t where t.organization_id = org limit 1;
end $$;

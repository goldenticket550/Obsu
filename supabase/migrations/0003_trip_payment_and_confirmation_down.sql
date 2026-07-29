-- D1 — DOWN migration for 0003_trip_payment_and_confirmation.sql.
--
-- Reverses exactly what the up migration added: four columns and their two
-- check constraints. Nothing else is touched.
--
-- WARNING: dropping these columns DESTROYS any payment, confirmation,
-- passenger-count, or note data recorded since the up migration ran. Take a
-- backup first. This exists so the change is reversible, not because reversing
-- it is routine.
--
-- No policy is dropped: the up migration created none (the existing row-scoped
-- "members manage trips" policy already covered the new columns).

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'trips_amount_paid_cents_check'
  ) then
    alter table public.trips drop constraint trips_amount_paid_cents_check;
  end if;

  if exists (
    select 1 from pg_constraint where conname = 'trips_passenger_count_check'
  ) then
    alter table public.trips drop constraint trips_passenger_count_check;
  end if;
end $$;

alter table public.trips
  drop column if exists amount_paid_cents,
  drop column if exists confirmed_at,
  drop column if exists passenger_count,
  drop column if exists note;

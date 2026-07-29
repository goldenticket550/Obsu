-- D1 — data model expansion. Adds exactly four nullable columns to trips.
-- ADDITIVE ONLY: nothing is altered, dropped, retyped, re-indexed, or
-- re-constrained, and there is NO backfill.
--
-- Why every column is nullable with no default, and why nothing is backfilled:
-- NULL means "not tracked", which is the truth for every ride recorded before
-- this migration. Defaulting amount_paid_cents to 0 would assert the operator
-- is owed money on rides already settled in cash; defaulting it to the fare
-- would assert a payment that may never have happened. Both fabricate, and a
-- fabricated number is worse than an absent one.
--
-- What is deliberately NOT here:
--   * payment status / outstanding balance — both DERIVE from amount_paid_cents
--     against the existing fare (revenue_cents). Storing them would create two
--     sources of truth for one fact. See src/lib/business/payment.ts.
--   * driver_id — a driver column always pointing at the sole operator is a
--     column that lies, and it would teach every downstream query that a driver
--     dimension exists when it does not.
--
-- confirmed_at is a TIMESTAMP, not a boolean: NULL means unconfirmed, and a
-- boolean would lose the "when" and invite a second column later.
--
-- RLS: public.trips already has RLS enabled with the policy
--   "members manage trips" ... for all
--   using (public.is_member_of(organization_id))
--   with check (public.is_member_of(organization_id))
-- That policy is ROW-scoped, not column-scoped. PostgreSQL RLS governs access
-- to rows; new columns on an already-protected table are covered by the
-- existing policy automatically. NO NEW POLICY IS NEEDED for these columns.

alter table public.trips
  add column if not exists amount_paid_cents integer,
  add column if not exists confirmed_at      timestamptz,
  add column if not exists passenger_count   smallint,
  add column if not exists note              text;

-- Constraints are added separately and guarded, so re-running is safe.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trips_amount_paid_cents_check'
  ) then
    alter table public.trips
      add constraint trips_amount_paid_cents_check
      check (amount_paid_cents is null or amount_paid_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'trips_passenger_count_check'
  ) then
    alter table public.trips
      add constraint trips_passenger_count_check
      check (passenger_count is null or passenger_count > 0);
  end if;
end $$;

comment on column public.trips.amount_paid_cents is
  'Integer cents actually received. NULL = payment not tracked for this ride. Payment status and outstanding balance are DERIVED from this against revenue_cents, never stored.';
comment on column public.trips.confirmed_at is
  'When the customer confirmed the booking. NULL = unconfirmed. A timestamp rather than a boolean so the "when" is not lost.';
comment on column public.trips.passenger_count is
  'Number of passengers. NULL = not recorded.';
comment on column public.trips.note is
  'Free-text note about the ride. NULL = none.';

-- D2 — drop the redundant `note` column from public.trips.
--
-- D1 added `note` while the table already had `notes`. Two columns for one
-- idea. `notes` survives: it predates D1, may hold real data, is already the
-- labelled textarea on the ride form, and is the target of the M8
-- natural-language parser (a free-text ride note is extracted into `notes`).
-- `note` had exactly one writer and no readers.
--
-- THIS MIGRATION REFUSES TO DESTROY DATA. It first asserts that `note` is NULL
-- on every row. If any row holds a value the DO block raises, the transaction
-- rolls back, and NOTHING is changed — including the drop below, because a
-- raised exception aborts the whole statement batch. In that case do not force
-- it: report the row count and merge those values into `notes` first.

do $$
declare
  populated bigint;
begin
  select count(*) into populated
  from public.trips
  where note is not null;

  if populated > 0 then
    raise exception
      'D2 aborted: % row(s) in public.trips have a non-null "note". Nothing was changed. Merge those values into "notes" before re-running this migration.',
      populated;
  end if;
end $$;

-- Only reached when every row's `note` is NULL.
alter table public.trips drop column if exists note;

-- D2 — drop the redundant `note` column from public.trips.
--
-- D1 added `note` while the table already had `notes`. Two columns for one
-- idea. `notes` survives: it predates D1, may hold real data, is already the
-- labelled textarea on the ride form, and is the target of the M8
-- natural-language parser (a free-text ride note is extracted into `notes`).
-- `note` had exactly one writer and no readers.
--
-- ALREADY APPLIED BY HAND ON 2026-07-29, in the Supabase SQL Editor, before
-- this file was ever run. The column is gone from the live database.
--
-- The file still exists because it is the record of WHY the column went away.
-- Deleting it would leave a schema change with no explanation anywhere, and
-- would leave any future environment — a rebuild, a second business, a local
-- copy — with no migration that removes the column at all. A migration whose
-- effect was applied manually is still the migration.
--
-- THIS MIGRATION REFUSES TO DESTROY DATA. When the column is present it first
-- asserts that `note` is NULL on every row. If any row holds a value it raises,
-- the transaction rolls back, and NOTHING is changed. In that case do not force
-- it: report the row count and merge those values into `notes` first.
--
-- Safe to run twice and safe to run late. Every check below is a question about
-- the schema as it is right now, not an assumption about what has already run:
-- if the column is gone it says so and stops; if the table is gone it says so
-- and stops; only when the column is really there does it check the data and
-- drop it. The count is issued through EXECUTE so plpgsql never parses a
-- reference to a column that may not exist (that parse is what raises 42703).

do $$
declare
  populated bigint;
begin
  if to_regclass('public.trips') is null then
    raise notice 'D2 skipped: public.trips does not exist. Nothing to drop.';
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'trips'
      and column_name  = 'note'
  ) then
    raise notice 'D2 skipped: public.trips.note is already gone (dropped by hand on 2026-07-29). Nothing to do.';
    return;
  end if;

  execute 'select count(*) from public.trips where note is not null'
    into populated;

  if populated > 0 then
    raise exception
      'D2 aborted: % row(s) in public.trips have a non-null "note". Nothing was changed. Merge those values into "notes" before re-running this migration.',
      populated;
  end if;

  -- Only reached when the column exists and every row's `note` is NULL.
  execute 'alter table public.trips drop column if exists note';
  raise notice 'D2 applied: public.trips.note dropped.';
end $$;

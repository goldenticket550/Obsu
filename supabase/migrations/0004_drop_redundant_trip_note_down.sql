-- D2 — DOWN migration for 0004_drop_redundant_trip_note.sql.
--
-- Re-adds the `note` column: nullable, no default, no backfill — the same
-- shape D1 created.
--
-- HONEST LIMITATION: this restores the COLUMN, not the VALUES. Once dropped,
-- whatever `note` contained is gone, and re-adding it produces a column of
-- NULLs. That asymmetry is exactly why the up migration refuses to run while
-- any row holds a value: the guard is the real protection here, not this file.

alter table public.trips
  add column if not exists note text;

comment on column public.trips.note is
  'Deprecated duplicate of notes; re-added by the D2 down migration. Values are NOT restored.';

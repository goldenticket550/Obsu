-- V3.1 — the action log. Every approved proposal that reaches the executor
-- leaves a row here, whatever happened to it.
--
-- APPLIED BY HAND TO PRODUCTION ON 2026-07-29, in the Supabase SQL Editor,
-- from this file in its corrected form (organization_id ON DELETE RESTRICT).
-- Verified against the live schema by query, all five as expected:
--
--     columns      12
--     rls_on       true
--     org_fk_rule  'r'      -- restrict, not cascade
--     policies     2        -- select + insert, no update, no delete
--     triggers     1        -- non-internal: action_log_no_rewrite
--
-- The cascade→restrict reconciliation block below is therefore already a
-- no-op against production (org_fk_rule is already 'r'). It stays because it
-- is what makes this file correct in an environment built from the earlier
-- draft — a rebuild, a second business, or a local copy.
--
-- Re-running this whole file against production changes nothing. Every
-- statement is guarded; see the per-statement reasoning in TASK_RULES.
--
-- NUMBERED 0005, NOT 0004: the task said 0004, but 0004 is already taken by
-- 0004_drop_redundant_trip_note.sql, which is written and NOT YET APPLIED.
-- Reusing the number would give two different files the same identity and make
-- "which 0004 ran?" unanswerable. The order is what matters, and 0005 is next.
--
-- ADDITIVE ONLY: one new table. Nothing existing is altered or dropped.
--
-- APPEND-ONLY, and enforced rather than promised:
--   * the RLS policy grants INSERT and SELECT only — there is no UPDATE or
--     DELETE policy, so with RLS on, neither is possible for any member.
--   * an explicit REVOKE removes update/delete from the API roles as well, so
--     the restriction does not depend solely on policy absence.
--   * a trigger raises on UPDATE or DELETE, so even a future privileged path
--     (a service-role key, a superuser session) fails loudly instead of
--     quietly rewriting history. A log you can edit is not a log.
--
-- Refusals are rows, not absences. "Nothing was done because the ride had
-- already been completed" is the most interesting thing this table can tell
-- you, and it is only tellable if refusals are written.
--
-- Note: NOT a foreign key to trips.id. A cancelled-then-deleted ride must not
-- take its history with it, and ON DELETE CASCADE on an append-only log is a
-- contradiction. The id is stored as a plain uuid.
--
-- organization_id is ON DELETE RESTRICT for the same reason, made explicit:
-- a cascade here would ask the database to delete log rows, and the
-- append-only trigger below refuses every DELETE. The two would contradict
-- each other, and deleting an organization would fail with a message about
-- append-only logs — a confusing error at the wrong level, for a rule the
-- schema had already declared it would break.
--
-- RESTRICT states the real rule instead: an organization that has history
-- cannot be erased as a side effect of deleting its parent row. Erasing a
-- tenant is a deliberate, separate operation with its own procedure, not
-- something that happens implicitly while removing something else. See the
-- roadmap — that procedure is not built.

create table if not exists public.action_log (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete restrict,
  actor_user_id    uuid not null references auth.users(id),
  proposal_id      text not null,
  action_kind      text not null check (action_kind in (
                     'create_trip','update_trip','complete_trip',
                     'cancel_trip','record_payment')),
  -- The exact words the owner approved. Stored verbatim, never re-derived:
  -- the point of the log is what was AGREED TO, and re-summarizing later from
  -- current code would silently rewrite the past when the wording changes.
  approved_summary text not null,
  outcome          text not null check (outcome in (
                     'succeeded','partially_applied','refused','failed')),
  -- Set only for refusals, so "why not" is queryable without parsing prose.
  refusal_reason   text,
  detail           text,
  trip_id          uuid,
  occurred_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- Reconciles an earlier draft of this file that declared the organization
-- foreign key ON DELETE CASCADE. `create table if not exists` above does
-- nothing when the table already exists, so a table created from that draft
-- would keep the contradictory cascade forever. This asks the schema what the
-- constraint actually is and corrects it only when it is wrong, which is what
-- "safe to run late" means when a change may already be half-applied.
do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class     t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'action_log'
      and c.conname = 'action_log_organization_id_fkey'
      and c.confdeltype = 'c'          -- 'c' = cascade
  ) then
    alter table public.action_log
      drop constraint action_log_organization_id_fkey;
    alter table public.action_log
      add constraint action_log_organization_id_fkey
      foreign key (organization_id) references public.organizations(id)
      on delete restrict;
    raise notice 'action_log: organization_id cascade replaced with restrict.';
  end if;
end $$;

create index if not exists action_log_org_time_idx
  on public.action_log (organization_id, occurred_at desc);

alter table public.action_log enable row level security;

-- Read and append, scoped to the caller's own organization. The same
-- is_member_of predicate the rest of the schema uses.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'action_log'
      and policyname = 'members read own action log'
  ) then
    create policy "members read own action log"
      on public.action_log for select
      using (public.is_member_of(organization_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'action_log'
      and policyname = 'members append to own action log'
  ) then
    create policy "members append to own action log"
      on public.action_log for insert
      with check (public.is_member_of(organization_id));
  end if;
end $$;

-- Deliberately no update or delete policy above. This makes it explicit at the
-- grant level too.
revoke update, delete on public.action_log from anon, authenticated;

create or replace function public.action_log_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'action_log is append-only: % is not permitted', tg_op;
end;
$$;

drop trigger if exists action_log_no_rewrite on public.action_log;
create trigger action_log_no_rewrite
  before update or delete on public.action_log
  for each row execute function public.action_log_is_append_only();

comment on table public.action_log is
  'Append-only record of every approved proposal that reached the executor, including refusals and failures. Enforced append-only by policy, grant, and trigger.';
comment on column public.action_log.approved_summary is
  'The exact wording the owner approved, stored verbatim. Never re-derived from current code.';
comment on column public.action_log.outcome is
  'succeeded | partially_applied | refused | failed. A refusal is a row, not an absence.';

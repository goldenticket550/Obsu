-- STEP 3 — the question underneath the behavioural test.
--
-- Paste into the Supabase SQL Editor. Read-only: it queries the catalog and
-- changes nothing.
--
-- Why this is separate from the behavioural proof: a passing cross-tenant test
-- shows the policies that EXIST are working. It cannot show you a table that
-- has no policy at all, or one where RLS was never enabled — because such a
-- table would not appear in a test that only probes the tables someone
-- remembered to write a test for. This asks the database directly.
--
-- THE FINDING THAT MATTERS MOST: any row below where rls_enabled is false, or
-- where policy_count is 0. Either one means that table is readable and
-- writable by every authenticated user of every organization.

-- 1. Every table in public: is RLS enabled, and does it have any policy?
select
  c.relname                                     as table_name,
  c.relrowsecurity                              as rls_enabled,
  c.relforcerowsecurity                         as rls_forced,
  count(p.polname)                              as policy_count,
  case
    when not c.relrowsecurity then '*** RLS DISABLED ***'
    when count(p.polname) = 0  then '*** NO POLICY ***'
    else 'ok'
  end                                           as verdict
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'          -- ordinary tables only
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by
  (not c.relrowsecurity) desc, -- disabled first
  count(p.polname) asc,        -- then unpolicied
  c.relname;

-- 2. Every policy, in full: what it permits, to whom, and its predicate.
select
  c.relname                                     as table_name,
  p.polname                                     as policy_name,
  case p.polcmd
    when 'r' then 'SELECT'
    when 'a' then 'INSERT'
    when 'w' then 'UPDATE'
    when 'd' then 'DELETE'
    when '*' then 'ALL'
  end                                           as command,
  pg_get_expr(p.polqual, p.polrelid)            as using_predicate,
  pg_get_expr(p.polwithcheck, p.polrelid)       as with_check_predicate,
  array(
    select rolname from pg_roles where oid = any(p.polroles)
  )                                             as roles
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, p.polname;

-- 3. Tables carrying organization_id — the org-scoped set. Any table here that
--    did not appear with a policy above is a tenant-isolation hole.
select
  table_name,
  'has organization_id' as note
from information_schema.columns
where table_schema = 'public'
  and column_name = 'organization_id'
order by table_name;

-- 4. INSERT policies specifically. A SELECT-only policy set still lets a
--    caller write a row claiming another org's id, because nothing checks the
--    inserted row. Any org-scoped table missing a WITH CHECK predicate here is
--    the spoofing hole.
select
  c.relname                               as table_name,
  p.polname                               as policy_name,
  pg_get_expr(p.polwithcheck, p.polrelid) as with_check_predicate
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and p.polcmd in ('a', '*')          -- INSERT or ALL
order by c.relname;

-- 5. Grants to the API roles. RLS governs rows; grants govern whether the role
--    may touch the table at all. Both matter.
select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

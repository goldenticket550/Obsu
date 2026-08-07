-- OBSIDIAN Core — 0010 DOWN: remove the read-only Core layer.
-- Drops dependent RPCs before the platform-admin predicate and table.

drop function if exists public.core_recent_notable_activity(integer);
drop function if exists public.core_activity_counts(timestamptz);
drop function if exists public.core_open_feedback(integer, integer);
drop function if exists public.core_portfolio_summary();
drop function if exists public.is_platform_admin(uuid);
drop table if exists public.platform_admins;

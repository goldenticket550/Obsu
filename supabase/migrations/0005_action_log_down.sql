-- Reverses 0005_action_log.sql.
--
-- WARNING: this DESTROYS the action log. There is no other copy of it, and by
-- design the rows cannot be rewritten anywhere else. Only run this to undo a
-- migration that was just applied by mistake — never to "clean up".

drop trigger if exists action_log_no_rewrite on public.action_log;
drop function if exists public.action_log_is_append_only();
drop table if exists public.action_log;

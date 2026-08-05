-- Reverses 0007_pilot_feedback_events.sql. Destructive; use only to undo an
-- immediately failed migration in a safe environment.

drop trigger if exists activity_event_no_rewrite on public.activity_event;
drop function if exists public.activity_event_is_append_only();
drop table if exists public.activity_event;
drop trigger if exists pilot_feedback_touch on public.pilot_feedback;
drop table if exists public.pilot_feedback;

-- OBSIDIAN BEAUTY — 0008 DOWN: reverse the beauty vertical core.
--
-- Guarded + idempotent, dependency order (children first). Drops ONLY the
-- beauty objects 0008 created. Does not touch any rides table. The
-- organizations.vertical column is removed last; existing orgs are unaffected
-- by its absence (the app falls back to 'rides').

drop trigger if exists beauty_client_details_touch on public.beauty_client_details;

drop policy if exists "members manage time_off"               on public.time_off;
drop policy if exists "members manage working_hours"          on public.working_hours;
drop policy if exists "members manage appointment_services"   on public.appointment_services;
drop policy if exists "members manage appointments"           on public.appointments;
drop policy if exists "members manage beauty_client_details"  on public.beauty_client_details;
drop policy if exists "members manage services"               on public.services;

drop table if exists public.appointment_services;
drop table if exists public.time_off;
drop table if exists public.working_hours;
drop table if exists public.appointments;
drop table if exists public.beauty_client_details;
drop table if exists public.services;

-- Enums last (tables that referenced them are gone).
drop type if exists public.appointment_status;
drop type if exists public.service_category;

-- Shared-core column removed last. Safe: default 'rides' means dropping it only
-- loses the discriminator; no data integrity depends on it.
alter table public.organizations drop column if exists vertical;

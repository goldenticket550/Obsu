-- OBSIDIAN BEAUTY — 0009 DOWN: remove atomic write RPCs and category snapshot.

drop function if exists public.save_beauty_client(
  uuid, text, text, text, text, text, date, text, text
);
drop function if exists public.save_beauty_appointment(
  uuid, uuid, uuid, uuid[], timestamptz, public.appointment_status, integer,
  boolean, integer, public.payment_method, integer, text
);

alter table public.appointment_services drop column if exists category;

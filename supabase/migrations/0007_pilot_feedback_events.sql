-- OBSIDIAN RIDES — 0007: tenant-scoped pilot feedback + privacy-conscious events.
-- Additive only. Apply manually through the Supabase SQL Editor after review.

create table if not exists public.pilot_feedback (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete restrict,
  submitted_by_user_id  uuid references auth.users(id) on delete set null,
  category              text not null check (category in (
                          'bug','improvement','feature_request','question','other')),
  title                 text not null check (char_length(title) between 1 and 120),
  description           text not null check (char_length(description) between 1 and 4000),
  page_or_feature       text check (char_length(page_or_feature) <= 160),
  priority              text check (priority is null or priority in ('low','normal','high')),
  status                text not null default 'new' check (status in (
                          'new','reviewing','planned','completed','declined')),
  attachment_reference  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists pilot_feedback_org_created_idx
  on public.pilot_feedback (organization_id, created_at desc);

alter table public.pilot_feedback enable row level security;

drop policy if exists "members read own pilot feedback" on public.pilot_feedback;
create policy "members read own pilot feedback"
  on public.pilot_feedback for select
  using (public.is_member_of(organization_id));

drop policy if exists "members submit own pilot feedback" on public.pilot_feedback;
create policy "members submit own pilot feedback"
  on public.pilot_feedback for insert
  with check (
    public.is_member_of(organization_id)
    and submitted_by_user_id = auth.uid()
    and status = 'new'
  );

-- Pilot users submit and read their own tenant's feedback. Status review stays
-- on the service-role/platform-admin side until a real platform-admin UI exists.
revoke update, delete on public.pilot_feedback from anon, authenticated;

drop trigger if exists pilot_feedback_touch on public.pilot_feedback;
create trigger pilot_feedback_touch
  before update on public.pilot_feedback
  for each row execute function public.touch_updated_at();

create table if not exists public.activity_event (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete restrict,
  user_id           uuid references auth.users(id) on delete set null,
  event_name        text not null check (event_name in (
                     'pilot_activated','user_signed_in','orb_session_started',
                     'orb_question_asked','feature_opened','booking_request_reviewed',
                     'core_workflow_started','core_workflow_completed',
                     'feedback_submitted','pilot_expired','pilot_extended')),
  feature           text check (char_length(feature) <= 80),
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  constraint activity_event_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint activity_event_metadata_size check (octet_length(metadata::text) <= 2048)
);

create index if not exists activity_event_org_created_idx
  on public.activity_event (organization_id, created_at desc);

alter table public.activity_event enable row level security;

drop policy if exists "members read own activity events" on public.activity_event;
create policy "members read own activity events"
  on public.activity_event for select
  using (public.is_member_of(organization_id));

drop policy if exists "members append own activity events" on public.activity_event;
create policy "members append own activity events"
  on public.activity_event for insert
  with check (
    public.is_member_of(organization_id)
    and (user_id is null or user_id = auth.uid())
  );

revoke update, delete on public.activity_event from anon, authenticated;

create or replace function public.activity_event_is_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'activity_event is append-only: % is not permitted', tg_op;
end;
$$;

drop trigger if exists activity_event_no_rewrite on public.activity_event;
create trigger activity_event_no_rewrite
  before update or delete on public.activity_event
  for each row execute function public.activity_event_is_append_only();

comment on table public.activity_event is
  'Append-only allowlisted operational events. Metadata must be non-sensitive, bounded JSON.';

create table public.event (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.application(id) on delete restrict,
  dedup_key text not null,
  payload_hash text not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  category text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  payload jsonb not null,
  unique (application_id, dedup_key)
);

create table public.health_report (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.application(id) on delete restrict,
  dedup_key text not null,
  payload_hash text not null,
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  status text not null check (status in ('healthy', 'degraded', 'failing', 'unknown')),
  data_as_of timestamptz,
  payload jsonb not null,
  unique (application_id, dedup_key)
);

create table public.ingest_rate_bucket (
  application_id uuid not null references public.application(id) on delete cascade,
  bucket_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (application_id, bucket_start)
);

alter table public.event enable row level security;
alter table public.health_report enable row level security;
alter table public.ingest_rate_bucket enable row level security;
revoke all on public.event, public.health_report, public.ingest_rate_bucket from anon, authenticated;

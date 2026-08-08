create extension if not exists pgcrypto;

create table public.application (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now()
);

create table public.app_credential (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.application(id) on delete restrict,
  key_id text not null unique,
  secret_ciphertext bytea not null,
  secret_fingerprint text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz
);

alter table public.application enable row level security;
alter table public.app_credential enable row level security;
revoke all on public.application, public.app_credential from anon, authenticated;

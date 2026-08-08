create or replace function public.core_resolve_ingest_credential(
  p_key_id text,
  p_encryption_key text
) returns table(application_id uuid, application_slug text, signing_secret text)
language sql security definer
set search_path = pg_catalog, public
as $$
  select a.id, a.slug, extensions.pgp_sym_decrypt(c.secret_ciphertext, p_encryption_key)
  from public.app_credential c
  join public.application a on a.id = c.application_id
  where c.key_id = p_key_id
    and c.revoked_at is null
    and (c.expires_at is null or c.expires_at > now())
    and a.status = 'active'
  limit 1;
$$;

create or replace function public.core_accept_signal(
  p_application_id uuid,
  p_kind text,
  p_dedup_key text,
  p_payload_hash text,
  p_occurred_at timestamptz,
  p_category text,
  p_severity text,
  p_status text,
  p_data_as_of timestamptz,
  p_payload jsonb,
  p_rate_limit integer default 60
) returns table(signal_id uuid, duplicate boolean)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_bucket timestamptz := date_trunc('minute', clock_timestamp());
  v_count integer;
  v_id uuid;
  v_hash text;
begin
  insert into public.ingest_rate_bucket(application_id, bucket_start, request_count)
  values (p_application_id, v_bucket, 1)
  on conflict (application_id, bucket_start)
  do update set request_count = public.ingest_rate_bucket.request_count + 1
  returning request_count into v_count;
  if v_count > p_rate_limit then raise exception 'rate_limited' using errcode = 'P0001'; end if;

  if p_kind = 'event' then
    select id, payload_hash into v_id, v_hash from public.event
      where application_id = p_application_id and dedup_key = p_dedup_key;
    if v_id is not null then
      if v_hash <> p_payload_hash then raise exception 'dedup_conflict' using errcode = '23505'; end if;
      return query select v_id, true; return;
    end if;
    insert into public.event(application_id,dedup_key,payload_hash,occurred_at,category,severity,payload)
      values(p_application_id,p_dedup_key,p_payload_hash,p_occurred_at,p_category,p_severity,p_payload)
      returning id into v_id;
  elsif p_kind = 'health' then
    select id, payload_hash into v_id, v_hash from public.health_report
      where application_id = p_application_id and dedup_key = p_dedup_key;
    if v_id is not null then
      if v_hash <> p_payload_hash then raise exception 'dedup_conflict' using errcode = '23505'; end if;
      return query select v_id, true; return;
    end if;
    insert into public.health_report(application_id,dedup_key,payload_hash,observed_at,status,data_as_of,payload)
      values(p_application_id,p_dedup_key,p_payload_hash,p_occurred_at,p_status,p_data_as_of,p_payload)
      returning id into v_id;
  else
    raise exception 'invalid_kind' using errcode = '22023';
  end if;
  update public.app_credential set last_used_at = now() where application_id = p_application_id and revoked_at is null;
  return query select v_id, false;
end;
$$;

revoke all on function public.core_resolve_ingest_credential(text,text) from public, anon, authenticated;
revoke all on function public.core_accept_signal(uuid,text,text,text,timestamptz,text,text,text,timestamptz,jsonb,integer) from public, anon, authenticated;
grant execute on function public.core_resolve_ingest_credential(text,text) to service_role;
grant execute on function public.core_accept_signal(uuid,text,text,text,timestamptz,text,text,text,timestamptz,jsonb,integer) to service_role;

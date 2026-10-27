alter table glintlabs_telemetry.events
  add column visitor_id text check (visitor_id ~ '^[0-9a-f]{64}$');

create or replace function public.glintlabs_record_event(p_event jsonb, p_rate_key text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  minute_bucket timestamptz := date_trunc('minute', now());
  daily_bucket timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  used integer;
begin
  if p_rate_key is null or p_rate_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid rate key' using errcode = '22023';
  end if;
  if p_event is null or jsonb_typeof(p_event) <> 'object' or
     not (p_event ?& array['v','event','page_path','referrer','campaign_source']) or
     p_event->'v' not in ('1'::jsonb,'2'::jsonb) then
    raise exception 'Invalid telemetry event' using errcode = '22023';
  end if;
  if p_event->'v' = '1'::jsonb then
    if (select count(*) from jsonb_object_keys(p_event)) <> 5 then
      raise exception 'Invalid legacy telemetry event' using errcode = '22023';
    end if;
  else
    if (select count(*) from jsonb_object_keys(p_event)) <> 6 or
       not (p_event ? 'visitor_id') or
       jsonb_typeof(p_event->'visitor_id') <> 'string' or
       p_event->>'visitor_id' !~ '^[0-9a-f]{64}$' then
      raise exception 'Invalid visitor hash' using errcode = '22023';
    end if;
  end if;
  insert into glintlabs_telemetry.rate_limits as limits (bucket, rate_key, count)
    values (daily_bucket, 'global-day', 1)
    on conflict (bucket, rate_key) do update set count = limits.count + 1
      where limits.count < 10000
    returning count into used;
  if used is null then return 'rate_limited'; end if;
  used := null;
  insert into glintlabs_telemetry.rate_limits as limits (bucket, rate_key, count)
    values (minute_bucket, 'global-minute', 1)
    on conflict (bucket, rate_key) do update set count = limits.count + 1
      where limits.count < 300
    returning count into used;
  if used is null then return 'rate_limited'; end if;
  used := null;
  insert into glintlabs_telemetry.rate_limits as limits (bucket, rate_key, count)
    values (minute_bucket, p_rate_key, 1)
    on conflict (bucket, rate_key) do update set count = limits.count + 1
      where limits.count < 30
    returning count into used;
  if used is null then return 'rate_limited'; end if;
  insert into glintlabs_telemetry.events (event_name, page_path, referrer, campaign_source, visitor_id)
    values (p_event->>'event', p_event->>'page_path', p_event->>'referrer', p_event->>'campaign_source', p_event->>'visitor_id');
  return 'accepted';
end;
$$;
revoke all on function public.glintlabs_record_event(jsonb, text) from public, anon, authenticated;
grant execute on function public.glintlabs_record_event(jsonb, text) to service_role;

create view glintlabs_telemetry.page_visitors with (security_invoker = true) as
select page_path, count(distinct visitor_id) as distinct_browsers
from glintlabs_telemetry.events
where event_name = 'page_view'
  and visitor_id is not null
  and occurred_at >= now() - interval '90 days'
group by page_path;
revoke all on glintlabs_telemetry.page_visitors from public, anon, authenticated, service_role;

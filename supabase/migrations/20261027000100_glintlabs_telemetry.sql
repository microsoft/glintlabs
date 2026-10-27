create schema glintlabs_telemetry;
revoke all on schema glintlabs_telemetry from public, anon, authenticated;

create table glintlabs_telemetry.events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  event_name text not null check (event_name in ('page_view', 'report_download_click', 'analyze_survey_click', 'skill_link_click')),
  page_path text not null check (length(page_path) <= 160 and page_path ~ '^/([a-z0-9-]+/)*[a-z0-9-]*$'),
  referrer text not null check (referrer in ('direct', 'internal', 'github', 'search', 'social', 'other')),
  campaign_source text not null check (campaign_source in ('none', 'github', 'linkedin', 'newsletter', 'teams', 'other'))
);
create index glintlabs_events_time on glintlabs_telemetry.events (occurred_at);
alter table glintlabs_telemetry.events enable row level security;
alter table glintlabs_telemetry.events force row level security;

create table glintlabs_telemetry.rate_limits (
  bucket timestamptz not null,
  rate_key text not null,
  count integer not null check (count > 0),
  primary key (bucket, rate_key)
);
alter table glintlabs_telemetry.rate_limits enable row level security;
alter table glintlabs_telemetry.rate_limits force row level security;
revoke all on all tables in schema glintlabs_telemetry from public, anon, authenticated, service_role;
revoke all on all sequences in schema glintlabs_telemetry from public, anon, authenticated, service_role;

create function public.glintlabs_record_event(p_event jsonb, p_rate_key text)
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
     (select count(*) from jsonb_object_keys(p_event)) <> 5 or
     not (p_event ?& array['v','event','page_path','referrer','campaign_source']) or
     p_event->'v' <> '1'::jsonb then
    raise exception 'Invalid telemetry event' using errcode = '22023';
  end if;
  -- The global cap also bounds counter growth when callers rotate addresses.
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
  insert into glintlabs_telemetry.events (event_name, page_path, referrer, campaign_source)
    values (p_event->>'event', p_event->>'page_path', p_event->>'referrer', p_event->>'campaign_source');
  return 'accepted';
end;
$$;
revoke all on function public.glintlabs_record_event(jsonb, text) from public, anon, authenticated;
grant execute on function public.glintlabs_record_event(jsonb, text) to service_role;

create view glintlabs_telemetry.daily_counts with (security_invoker = true) as
select (occurred_at at time zone 'UTC')::date as day, event_name, page_path, referrer, campaign_source, count(*) as events
from glintlabs_telemetry.events
where occurred_at >= now() - interval '90 days'
group by 1, 2, 3, 4, 5;

create function glintlabs_telemetry.purge_expired()
returns void
language sql security definer
set search_path = ''
as $$
  delete from glintlabs_telemetry.events where occurred_at < now() - interval '90 days';
  delete from glintlabs_telemetry.rate_limits where bucket < now() - interval '48 hours';
$$;
revoke all on function glintlabs_telemetry.purge_expired() from public, anon, authenticated, service_role;
revoke all on glintlabs_telemetry.daily_counts from public, anon, authenticated, service_role;

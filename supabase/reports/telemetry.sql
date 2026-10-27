-- Run only in the restricted Supabase SQL editor. No public reporting endpoint.
select day, event_name, page_path, sum(events) as events
from glintlabs_telemetry.daily_counts
where day >= (now() at time zone 'UTC')::date - 29
group by day, event_name, page_path
order by day desc, events desc;

-- Report opens are page views, not a second event or unique-reader metric.
select page_path, sum(events) as report_opens
from glintlabs_telemetry.daily_counts
where event_name = 'page_view'
  and (page_path like '/reports/%' or page_path = '/annual-report-2026')
group by page_path
order by report_opens desc;

-- Approximate distinct consenting browsers, not people. Legacy anonymous events are excluded.
-- Compute the whole window once; do not sum daily distinct counts.
select page_path, distinct_browsers
from glintlabs_telemetry.page_visitors
order by distinct_browsers desc, page_path;

select jobname, schedule, active
from cron.job
where jobname = 'glintlabs-telemetry-retention';

select status, return_message, start_time, end_time
from cron.job_run_details
where jobid in (select jobid from cron.job where jobname = 'glintlabs-telemetry-retention')
order by start_time desc
limit 10;

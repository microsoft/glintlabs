create extension if not exists pg_cron;

-- A dedicated job name avoids changing any coworker application's scheduled jobs.
select cron.schedule(
  'glintlabs-telemetry-retention',
  '17 * * * *',
  'select glintlabs_telemetry.purge_expired();'
);

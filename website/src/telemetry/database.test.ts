import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const event = JSON.stringify({
  v: 1, event: "page_view", page_path: "/reports", referrer: "direct", campaign_source: "none",
});
const rateKey = "a".repeat(64);
const record = () => db.query<{ result: string }>(
  "select public.glintlabs_record_event($1::jsonb, $2) as result", [event, rateKey],
);

before(async () => {
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(await readFile(new URL("../../../supabase/migrations/20261027000100_glintlabs_telemetry.sql", import.meta.url), "utf8"));
});
beforeEach(async () => {
  await db.exec("reset role; truncate glintlabs_telemetry.events, glintlabs_telemetry.rate_limits;");
});
after(async () => { await db.close(); });

test("the actual migration stores only whitelisted event columns and server timestamps", async () => {
  assert.equal((await record()).rows[0].result, "accepted");
  const { rows } = await db.query<Record<string, unknown>>("select * from glintlabs_telemetry.events");
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), [
    "campaign_source", "event_name", "id", "occurred_at", "page_path", "referrer",
  ]);
  assert.equal(rows[0].page_path, "/reports");
  await assert.rejects(() => db.query("select public.glintlabs_record_event($1::jsonb, $2)", [
    JSON.stringify({ ...JSON.parse(event), employee: "unexpected" }), rateKey,
  ]), /Invalid telemetry event/);
});

test("anonymous/authenticated roles cannot ingest or access data; service role has only the ingestion RPC", async () => {
  await record();
  for (const role of ["anon", "authenticated", "service_role"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(() => db.query("select * from glintlabs_telemetry.events"), /permission denied/);
    await assert.rejects(() => db.query("select * from glintlabs_telemetry.daily_counts"), /permission denied/);
    await assert.rejects(() => db.exec("delete from glintlabs_telemetry.events"), /permission denied/);
    await assert.rejects(() => db.exec("update glintlabs_telemetry.events set referrer = 'other'"), /permission denied/);
    if (role === "service_role") assert.equal((await record()).rows[0].result, "accepted");
    else await assert.rejects(record, /permission denied/);
    await db.exec("reset role");
  }
  // Even an accidentally granted SELECT is still denied by the no-policy RLS boundary.
  await db.exec("begin; grant usage on schema glintlabs_telemetry to anon; grant select on glintlabs_telemetry.events to anon; set role anon;");
  assert.deepEqual((await db.query("select * from glintlabs_telemetry.events")).rows, []);
  await db.exec("reset role; rollback;");
});

test("database enforces per-address and global limits atomically and bounds counter growth", async () => {
  const first = await db.query<{ result: string }>(
    "select public.glintlabs_record_event($1::jsonb, $2) as result from generate_series(1,31)", [event, rateKey],
  );
  assert.equal(first.rows.filter(row => row.result === "accepted").length, 30);
  assert.equal(first.rows[30].result, "rate_limited");
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from glintlabs_telemetry.events")).rows[0].count, 30);
  await db.exec("truncate glintlabs_telemetry.events, glintlabs_telemetry.rate_limits");
  const global = await db.query<{ result: string }>(
    "select public.glintlabs_record_event($1::jsonb, lpad(to_hex(i),64,'0')) as result from generate_series(1,301) as i", [event],
  );
  assert.equal(global.rows.filter(row => row.result === "accepted").length, 300);
  assert.equal(global.rows[300].result, "rate_limited");
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from glintlabs_telemetry.rate_limits")).rows[0].count, 302);
  await db.exec("truncate glintlabs_telemetry.events, glintlabs_telemetry.rate_limits");
  await db.exec("insert into glintlabs_telemetry.rate_limits values (date_trunc('day',now() at time zone 'UTC') at time zone 'UTC', 'global-day', 10000)");
  assert.equal((await record()).rows[0].result, "rate_limited");
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from glintlabs_telemetry.rate_limits")).rows[0].count, 1);
});

test("retention removes old events/rate keys, and restricted reports exclude expired data", async () => {
  await record();
  await db.exec(`
    insert into glintlabs_telemetry.events (occurred_at,event_name,page_path,referrer,campaign_source)
      values (now() - interval '91 days','page_view','/reports','direct','none');
    insert into glintlabs_telemetry.rate_limits values
      (now() - interval '49 hours', '${rateKey}', 1),
      (now() - interval '47 hours', '${rateKey}', 1);
  `);
  assert.equal((await db.query<{ events: number }>("select sum(events)::int as events from glintlabs_telemetry.daily_counts")).rows[0].events, 1);
  await db.exec("select glintlabs_telemetry.purge_expired()");
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from glintlabs_telemetry.events")).rows[0].count, 1);
  assert.equal((await db.query<{ count: number }>("select count(*)::int as count from glintlabs_telemetry.rate_limits where bucket < now() - interval '48 hours'")).rows[0].count, 0);
  const reporting = await readFile(new URL("../../../supabase/reports/telemetry.sql", import.meta.url), "utf8");
  await db.exec(reporting.slice(0, reporting.indexOf("select jobname")));
});

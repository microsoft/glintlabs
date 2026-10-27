import assert from "node:assert/strict";
import test from "node:test";
import {
  campaignCategory, parseEvent, publicPath, referralCategory, type TelemetryEvent,
} from "./contract.ts";
import {
  actionEvent, consentKey, createTelemetryClient, readConsent, saveConsent,
} from "./client.ts";
import { createHandler } from "../../../supabase/functions/glintlabs-telemetry/handler.ts";
import { getLaunchReports } from "../launch-reports/reports.ts";

const event: TelemetryEvent = {
  v: 1, event: "page_view", page_path: "/reports", referrer: "github", campaign_source: "none",
};

test("strict shared contract rejects private paths, identifiers, unknown properties and mislabeled downloads", () => {
  assert.deepEqual(parseEvent(event), event);
  for (const input of [
    { ...event, employee_id: "unexpected" }, { ...event, page_path: "/studio" },
    { ...event, page_path: "/reports?email=unexpected" }, { ...event, referrer: "https://example.com/name" },
    { ...event, campaign_source: "name@example.com" }, { ...event, v: 2 },
    { ...event, event: "analysis_complete" }, { ...event, event: "report_download_click" },
    { ...event, referrer: null }, null, [],
  ]) assert.equal(parseEvent(input), null);
  assert.equal(parseEvent({ ...event, event: "report_download_click", page_path: "/annual-report-2026" })?.event, "report_download_click");
  assert.equal(publicPath("/reports/glps-rd-feb-26/"), "/reports/fighting-ai-slop-with-meta-cognition-around-ai");
  for (const report of getLaunchReports({ includePrivatePreview: false })) assert.ok(publicPath(`/reports/${report.slug}`));
});

test("referral/campaign categories never preserve URLs, search terms or arbitrary campaign text", () => {
  assert.equal(referralCategory("https://www.google.com/search?q=private"), "search");
  assert.equal(referralCategory("https://github.com.evil.example/private"), "other");
  assert.equal(referralCategory("https://microsoft.github.io/glintlabs/private?email=x"), "internal");
  assert.equal(referralCategory("not a URL"), "other");
  assert.equal(campaignCategory("?utm_source=LinkedIn&utm_campaign=private&email=private"), "linkedin");
  assert.equal(campaignCategory("?utm_source=private-name"), "other");
  assert.equal(campaignCategory(""), "none");
});

test("consent persists only a versioned choice/expiry; expired and malformed preferences never grant consent", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  assert.equal(readConsent(storage, 1000), null);
  saveConsent(storage, "granted", 1000);
  assert.equal(readConsent(storage, 1001), "granted");
  assert.deepEqual(Object.keys(JSON.parse(values.get(consentKey)!)).sort(), ["choice", "expires"]);
  assert.equal(readConsent(storage, 1000 + 181 * 86400000), null);
  values.set(consentKey, JSON.stringify({ choice: "yes", expires: 2000 }));
  assert.equal(readConsent(storage, 1000), null);
  saveConsent(storage, "denied", 1000);
  assert.equal(readConsent(storage, 1001), "denied");
});

test("client gates production, explicit consent, known pages and browser privacy signals, with no replay", async () => {
  const calls: RequestInit[] = [];
  let url = new URL("https://microsoft.github.io/glintlabs/reports/?email=private&utm_source=private");
  let privacy = false;
  const client = createTelemetryClient({
    enabled: true, location: () => url, referrer: () => "https://github.com/?private",
    privacyRequested: () => privacy,
    fetch: async (_url, init) => { calls.push(init!); return new Response(null, { status: 202 }); },
    warn: message => assert.fail(message),
  });
  assert.equal(await client.track("page_view"), false);
  assert.equal(await client.track("skill_link_click"), false);
  client.setConsent("granted");
  assert.equal(await client.track("page_view"), true);
  assert.equal(await client.track("page_view"), false);
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(String(calls[0].body)), { ...event, campaign_source: "other" });
  assert.equal(calls[0].credentials, "omit");
  assert.equal(calls[0].referrerPolicy, "no-referrer");
  url = new URL("https://microsoft.github.io/glintlabs/about/");
  assert.equal(await client.track("page_view"), true);
  url = new URL("https://microsoft.github.io/glintlabs/reports/");
  assert.equal(await client.track("page_view"), true);
  client.setConsent("denied");
  assert.equal(await client.track("skill_link_click"), false);
  client.setConsent("granted");
  privacy = true;
  assert.equal(await client.track("page_view"), false);
  privacy = false;
  for (const path of [
    "http://localhost:3000/glintlabs/reports/", "https://preview.example/glintlabs/reports/",
    "https://microsoft.github.io/other/reports/", "https://microsoft.github.io/glintlabs/studio/",
    "https://microsoft.github.io/glintlabs/reports/preview/private/",
  ]) {
    url = new URL(path);
    assert.equal(await client.track("page_view"), false, path);
  }
  const disabled = createTelemetryClient({
    enabled: false, location: () => new URL("https://microsoft.github.io/glintlabs/"),
    referrer: () => "", privacyRequested: () => false,
    fetch: async () => { assert.fail("disabled client sent data"); }, warn: assert.fail,
  });
  disabled.setConsent("granted");
  assert.equal(await disabled.track("page_view"), false);
});

test("revoking consent aborts pending requests; network/HTTP failures are diagnostic and never escape", async () => {
  const warnings: string[] = [];
  let signal: AbortSignal | undefined;
  let finish: ((response: Response) => void) | undefined;
  const client = createTelemetryClient({
    enabled: true, location: () => new URL("https://microsoft.github.io/glintlabs/"),
    referrer: () => "", privacyRequested: () => false, warn: message => warnings.push(message),
    fetch: async (_url, init) => {
      signal = init?.signal ?? undefined;
      return new Promise<Response>(resolve => { finish = resolve; });
    },
  });
  client.setConsent("granted");
  const pending = client.track("page_view");
  client.setConsent("denied");
  assert.equal(signal?.aborted, true);
  finish!(new Response(null, { status: 503 }));
  assert.equal(await pending, false);
  assert.equal(warnings.length, 1);
  const failing = createTelemetryClient({
    enabled: true, location: () => new URL("https://microsoft.github.io/glintlabs/"),
    referrer: () => "", privacyRequested: () => false, warn: message => warnings.push(message),
    fetch: async () => { throw new TypeError("network unavailable"); },
  });
  failing.setConsent("granted");
  assert.equal(await failing.track("page_view"), false);
  assert.equal(warnings.length, 2);
});

test("actual control classification distinguishes opening, copying and downloading", () => {
  const current = "https://microsoft.github.io/glintlabs/annual-report-2026/";
  assert.equal(actionEvent({ marker: "analyze_survey_click" }, current), "analyze_survey_click");
  assert.equal(actionEvent({ href: "/glintlabs/tools/analyze-survey/" }, current), "analyze_survey_click");
  assert.equal(actionEvent({ href: "https://github.com/microsoft/glintlabs/blob/main/skills/analyze-survey/SKILL.md" }, current), "skill_link_click");
  assert.equal(actionEvent({ href: "/report.pdf?private", download: true }, current), "report_download_click");
  assert.equal(actionEvent({ marker: "copy_skill_link" }, current), null);
  assert.equal(actionEvent({ href: "/glintlabs/reports/" }, current), null);
});

function fixture(overrides: Record<string, string> = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const logs: string[] = [];
  const env: Record<string, string> = {
    GLINTLABS_TELEMETRY_ENABLED: "true", GLINTLABS_RATE_LIMIT_SECRET: "test-only-not-a-real-secret-32-characters",
    SUPABASE_SERVICE_ROLE_KEY: "test-only-not-a-real-key", SUPABASE_URL: "https://test.invalid",
    ...overrides,
  };
  let result: unknown = "accepted";
  let status = 200;
  const handler = createHandler({
    env: name => env[name], log: message => logs.push(message),
    fetch: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify(result), { status });
    },
  });
  const request = (body: unknown = event, headers: HeadersInit = {}, method = "POST") => handler(new Request("https://test.invalid", {
    method, headers: {
      Origin: "https://microsoft.github.io", "Content-Type": "application/json",
      "X-Forwarded-For": "192.0.2.1", ...headers,
    },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  }));
  return { calls, logs, handler, request, setResult: (value: unknown, code = 200) => { result = value; status = code; } };
}

test("ingestion rejects wrong origins, disabled collection, privacy signals, methods and schemas before writing", async () => {
  const f = fixture();
  for (const [body, headers, method, status] of [
    [event, { Origin: "https://preview.example" }, "POST", 403],
    [event, { "Sec-GPC": "1" }, "POST", 403],
    [event, {}, "GET", 405], [event, { "Content-Type": "text/plain" }, "POST", 415],
    [{ ...event, employee: "unexpected" }, {}, "POST", 400],
    [{ ...event, page_path: "/studio" }, {}, "POST", 400],
    [{ ...event, extra: "x".repeat(1500) }, {}, "POST", 413],
  ] as const) assert.equal((await f.request(body, headers, method)).status, status);
  assert.equal((await f.request(event, {}, "OPTIONS")).status, 204);
  assert.equal(f.calls.length, 0);
  assert.equal((await fixture({ GLINTLABS_TELEMETRY_ENABLED: "false" }).request()).status, 503);
  assert.equal((await fixture({ GLINTLABS_RATE_LIMIT_SECRET: "" }).request()).status, 503);
});

test("ingestion writes only approved fields, keeps addresses separate, and exposes no secret to the caller", async () => {
  const f = fixture();
  const response = await f.request();
  assert.equal(response.status, 202);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://microsoft.github.io");
  assert.equal(f.calls.length, 1);
  const body = JSON.parse(String(f.calls[0].init?.body));
  assert.deepEqual(body.p_event, event);
  assert.match(body.p_rate_key, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(body).includes("192.0.2.1"));
  assert.equal(await response.text(), '{"code":"accepted"}');
  f.setResult("rate_limited");
  assert.equal((await f.request()).status, 429);
  f.setResult("unexpected");
  assert.equal((await f.request()).status, 502);
  f.setResult({ sensitive: "must-not-be-reflected" }, 500);
  assert.equal((await f.request()).status, 502);
  assert.deepEqual(f.logs, ["database_response_invalid", "database_write_failed:500"]);
});

test("ingestion bounds chunked bodies, rejects broken JSON and diagnoses backend outages", async () => {
  const f = fixture();
  for (const [body, status] of [["{", 400], ["x".repeat(2048), 413]] as const) {
    assert.equal((await f.handler(new Request("https://test.invalid", {
      method: "POST", headers: { Origin: "https://microsoft.github.io", "Content-Type": "application/json" }, body,
    }))).status, status);
  }
  const logs: string[] = [];
  const handler = createHandler({
    env: name => ({
      GLINTLABS_TELEMETRY_ENABLED: "true", GLINTLABS_RATE_LIMIT_SECRET: "test-only-not-a-real-secret-32-characters",
      SUPABASE_SERVICE_ROLE_KEY: "test-key", SUPABASE_URL: "https://test.invalid",
    })[name], log: message => logs.push(message),
    fetch: async () => { throw new TypeError("offline"); },
  });
  const response = await handler(new Request("https://test.invalid", {
    method: "POST", headers: {
      Origin: "https://microsoft.github.io", "Content-Type": "application/json", "X-Forwarded-For": "192.0.2.1",
    }, body: JSON.stringify(event),
  }));
  assert.equal(response.status, 502);
  assert.deepEqual(logs, ["database_request_failed"]);
});

import {
  parseEvent, productionOrigin,
} from "../../../website/src/telemetry/contract.ts";

const maxBytes = 1024;
type Dependencies = {
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
  log: (message: string) => void;
};

async function keyedHash(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function createHandler(deps: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.headers.get("origin") !== productionOrigin) return new Response(null, { status: 403 });
    const headers = {
      "Access-Control-Allow-Origin": productionOrigin, "Vary": "Origin", "Cache-Control": "no-store",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type",
      "Content-Type": "application/json",
    };
    const reply = (status: number, code: string) => new Response(JSON.stringify({ code }), { status, headers });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply(405, "method_not_allowed");
    if (deps.env("GLINTLABS_TELEMETRY_ENABLED") !== "true") return reply(503, "telemetry_disabled");
    if (request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1") return reply(403, "privacy_requested");
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return reply(415, "json_required");
    if (Number(request.headers.get("content-length")) > maxBytes) return reply(413, "body_too_large");
    const reader = request.body?.getReader();
    if (!reader) return reply(400, "event_required");
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > maxBytes) {
          await reader.cancel();
          return reply(413, "body_too_large");
        }
        chunks.push(value);
      }
    } catch {
      deps.log("request_body_unreadable");
      return reply(400, "request_body_unreadable");
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let value: unknown;
    try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { return reply(400, "invalid_json"); }
    const event = parseEvent(value);
    if (!event) return reply(400, "invalid_event");
    const secret = deps.env("GLINTLABS_RATE_LIMIT_SECRET");
    const serviceKey = deps.env("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = deps.env("SUPABASE_URL");
    if (!secret || secret.length < 32 || !serviceKey || !supabaseUrl) {
      deps.log("collector_configuration_missing");
      return reply(503, "collector_unavailable");
    }
    // Supabase's gateway supplies this header. Never log or store the raw address.
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
    if (!ip || ip.length > 64 || !/^[0-9a-f:.]+$/i.test(ip)) {
      deps.log("gateway_address_missing");
      return reply(503, "collector_unavailable");
    }
    const rateKey = await keyedHash(secret, `${new Date().toISOString().slice(0, 10)}|${ip}`);
    let databaseEvent = event;
    if (event.v === 2) {
      const visitorSecret = deps.env("GLINTLABS_VISITOR_ID_SECRET");
      if (!visitorSecret || visitorSecret.length < 32) {
        deps.log("visitor_hash_configuration_missing");
        return reply(503, "collector_unavailable");
      }
      databaseEvent = { ...event, visitor_id: await keyedHash(visitorSecret, `glintlabs-browser-v1|${event.visitor_id}`) };
    }
    try {
      const response = await deps.fetch(`${supabaseUrl}/rest/v1/rpc/glintlabs_record_event`, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json", "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({ p_event: databaseEvent, p_rate_key: rateKey }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        deps.log(`database_write_failed:${response.status}`);
        return reply(502, "collection_failed");
      }
      const result: unknown = await response.json();
      if (result === "rate_limited") return reply(429, "rate_limited");
      if (result !== "accepted") {
        deps.log("database_response_invalid");
        return reply(502, "collection_failed");
      }
      return reply(202, "accepted");
    } catch {
      deps.log("database_request_failed");
      return reply(502, "collection_failed");
    }
  };
}

export const productionOrigin = "https://microsoft.github.io";
export const productionBasePath = "/glintlabs";
export const collectorUrl = "https://kkthgbgkzzkfpmnbjmro.supabase.co/functions/v1/glintlabs-telemetry";

// Only reviewed public identifiers may leave the browser. Add newly published reports here.
export const publicPaths = [
  "/", "/reports", "/tools", "/about", "/annual-report-2026", "/tools/analyze-survey",
  "/people-science", "/collaborations", "/search", "/subscribe",
  "/reports/the-human-conditions-behind-ai-value-at-work",
  "/reports/tracking-the-rise-of-perceived-ai-value-at-work",
  "/reports/evolving-transformational-leadership-in-the-age-of-ai",
  "/reports/fighting-ai-slop-with-meta-cognition-around-ai",
  "/reports/designing-ai-feedback-systems-by-industry",
  "/reports/reframing-ai-friction-as-a-mastery-challenge-to-drive-impact",
  "/reports/empowering-managers-for-an-ai-first-future",
  "/reports/amplifying-clarity-and-impact-of-ai-agents-by-aligning-on-desired-outcomes",
] as const;
export const eventNames = [
  "page_view", "report_download_click", "analyze_survey_click", "skill_link_click",
] as const;
const referrers = ["direct", "internal", "github", "search", "social", "other"] as const;
const campaignSources = ["none", "github", "linkedin", "newsletter", "teams", "other"] as const;

export type EventName = typeof eventNames[number];
export type PublicPath = typeof publicPaths[number];
export type TelemetryEvent = {
  v: 1;
  event: EventName;
  page_path: PublicPath;
  referrer: typeof referrers[number];
  campaign_source: typeof campaignSources[number];
};

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.some(item => item === value);
}

export function publicPath(pathname: string): PublicPath | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const canonical = path === "/reports/glps-rd-feb-26"
    ? "/reports/fighting-ai-slop-with-meta-cognition-around-ai" : path;
  return isOneOf(publicPaths, canonical) ? canonical : null;
}

export function parseEvent(value: unknown): TelemetryEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = ["v", "event", "page_path", "referrer", "campaign_source"];
  if (Object.keys(record).length !== keys.length || !keys.every(key => Object.hasOwn(record, key))) return null;
  if (record.v !== 1 || !isOneOf(eventNames, record.event) ||
      !isOneOf(publicPaths, record.page_path) || !isOneOf(referrers, record.referrer) ||
      !isOneOf(campaignSources, record.campaign_source)) return null;
  if (record.event === "report_download_click" &&
      record.page_path !== "/annual-report-2026" && !record.page_path.startsWith("/reports/")) return null;
  return {
    v: 1, event: record.event, page_path: record.page_path,
    referrer: record.referrer, campaign_source: record.campaign_source,
  };
}

export function referralCategory(referrer: string): TelemetryEvent["referrer"] {
  if (!referrer) return "direct";
  let url: URL;
  try { url = new URL(referrer); }
  catch { return "other"; }
  if (url.origin === productionOrigin) return "internal";
  const host = url.hostname;
  const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (matches("github.com")) return "github";
  if (["google.com", "bing.com", "duckduckgo.com"].some(matches)) return "search";
  if (["linkedin.com", "t.co", "facebook.com", "x.com"].some(matches)) return "social";
  return "other";
}

export function campaignCategory(search: string): TelemetryEvent["campaign_source"] {
  const source = new URLSearchParams(search).get("utm_source")?.toLowerCase();
  return !source ? "none" : isOneOf(campaignSources, source) ? source : "other";
}

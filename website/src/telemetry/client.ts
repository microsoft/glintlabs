import {
  campaignCategory, collectorUrl, productionBasePath, productionOrigin,
  publicPath, referralCategory, isVisitorId, type EventName, type TelemetryEvent,
} from "./contract.ts";

export const consentKey = "glintlabs.analytics-consent.v2";
export const visitorKey = "glintlabs.analytics-visitor.v1";
const consentLifetime = 180 * 24 * 60 * 60 * 1000;
export type Consent = "granted" | "denied" | null;
type StorageAccess = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function visitorExpiry(now: number): number {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + 18, 1);
  const end = new Date(date);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  date.setUTCDate(Math.min(day, end.getUTCDate()));
  return date.getTime();
}

export function createBrowserIdentity(options: {
  storage: () => StorageAccess;
  warn: (message: string) => void;
  now?: () => number;
  randomUUID?: () => string;
}) {
  let warned = false;
  const warn = () => {
    if (!warned) options.warn("[Glint Labs analytics] Browser ID storage unavailable; distinct-browser counting is unavailable.");
    warned = true;
  };
  return {
    getId(): string | null {
      try {
        const storage = options.storage();
        const now = (options.now ?? Date.now)();
        const raw = storage.getItem(visitorKey);
        let value: unknown;
        if (raw) {
          try { value = JSON.parse(raw); }
          catch { options.warn("[Glint Labs analytics] Invalid stored browser ID; replacing it."); }
        }
        if (value && typeof value === "object") {
          const record = value as Record<string, unknown>;
          if (isVisitorId(record.id) && typeof record.expires === "number" &&
              record.expires > now && record.expires <= visitorExpiry(now)) return record.id;
        }
        const id = (options.randomUUID ?? (() => crypto.randomUUID()))();
        storage.setItem(visitorKey, JSON.stringify({ id, expires: visitorExpiry(now) }));
        return id;
      } catch {
        warn();
        return null;
      }
    },
    clear() {
      try { options.storage().removeItem(visitorKey); }
      catch { options.warn("[Glint Labs analytics] Browser ID could not be deleted. Clear this site's browser data; collection is stopped for this page session."); }
    },
  };
}

export function readConsent(storage: StorageAccess, now = Date.now()): {
  choice: Exclude<Consent, null>; expires: number;
} | null {
  const raw = storage.getItem(consentKey);
  if (!raw) return null;
  let record: unknown;
  try { record = JSON.parse(raw); }
  catch { console.warn("[Glint Labs analytics] Invalid stored preference; analytics stays off."); return null; }
  if (!record || typeof record !== "object") return null;
  const value = record as Record<string, unknown>;
  return (value.choice === "granted" || value.choice === "denied") &&
    typeof value.expires === "number" && value.expires > now && value.expires <= now + consentLifetime
    ? { choice: value.choice, expires: value.expires } : null;
}

export function saveConsent(storage: StorageAccess, choice: Exclude<Consent, null>, now = Date.now()) {
  try {
    storage.setItem(consentKey, JSON.stringify({ choice, expires: now + consentLifetime }));
    storage.removeItem("glintlabs.analytics-consent.v1");
  } catch (error) {
    storage.removeItem(consentKey);
    throw error;
  }
}

export function isProductionLocation(location: Pick<Location, "origin" | "pathname">) {
  return location.origin === productionOrigin &&
    (location.pathname === productionBasePath || location.pathname.startsWith(`${productionBasePath}/`));
}

export function locationPath(pathname: string) {
  return publicPath(pathname.slice(productionBasePath.length));
}

export function actionEvent(input: {
  marker?: string | null; href?: string | null; download?: boolean;
}, currentUrl: string): EventName | null {
  if (input.marker === "analyze_survey_click") return "analyze_survey_click";
  if (!input.href) return null;
  let target: URL;
  try { target = new URL(input.href, currentUrl); }
  catch { return null; }
  if (target.origin === "https://github.com" &&
      target.pathname === "/microsoft/glintlabs/blob/main/skills/analyze-survey/SKILL.md") return "skill_link_click";
  if (target.origin === productionOrigin &&
      target.pathname.replace(/\/$/, "") === `${productionBasePath}/tools/analyze-survey`) return "analyze_survey_click";
  if (input.download || /\.(pdf|docx|zip)$/i.test(target.pathname)) return "report_download_click";
  return null;
}

export function createTelemetryClient(options: {
  enabled: boolean;
  location: () => Pick<Location, "origin" | "pathname" | "search">;
  referrer: () => string;
  privacyRequested: () => boolean;
  identity: Pick<ReturnType<typeof createBrowserIdentity>, "getId" | "clear">;
  fetch: typeof fetch;
  warn: (message: string) => void;
  now?: () => number;
}) {
  let consent: Consent = null;
  let consentExpires = 0;
  let lastPage: string | null = null;
  const pending = new Set<AbortController>();
  const cancel = () => { for (const controller of pending) controller.abort(); pending.clear(); };
  return {
    setConsent(choice: Consent, expires = (options.now ?? Date.now)() + consentLifetime) {
      if (choice !== "granted") { cancel(); lastPage = null; }
      if (choice === "denied") options.identity.clear();
      consent = choice;
      consentExpires = expires;
    },
    dispose: cancel,
    async track(event: EventName): Promise<boolean> {
      const location = options.location();
      if (!options.enabled || consent !== "granted" || (options.now ?? Date.now)() >= consentExpires ||
          options.privacyRequested() || !isProductionLocation(location)) return false;
      const page = locationPath(location.pathname);
      if (!page || (event === "page_view" && page === lastPage)) return false;
      if (event === "report_download_click" && page !== "/annual-report-2026" && !page.startsWith("/reports/")) return false;
      const visitorId = options.identity.getId();
      const payload: TelemetryEvent = {
        ...(visitorId ? { v: 2 as const, visitor_id: visitorId } : { v: 1 as const }),
        event, page_path: page,
        referrer: referralCategory(options.referrer()),
        campaign_source: campaignCategory(location.search),
      };
      if (event === "page_view") lastPage = page;
      const controller = new AbortController();
      pending.add(controller);
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await options.fetch(collectorUrl, {
          method: "POST", mode: "cors", credentials: "omit", referrerPolicy: "no-referrer",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          keepalive: true, signal: controller.signal,
        });
        if (response.status !== 202) {
          options.warn(`[Glint Labs analytics] Event not accepted (${response.status}); navigation is unaffected.`);
          return false;
        }
        return true;
      } catch {
        if (consent === "granted") options.warn("[Glint Labs analytics] Collection unavailable; navigation is unaffected.");
        return false;
      } finally {
        clearTimeout(timeout);
        pending.delete(controller);
      }
    },
  };
}

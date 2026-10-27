import {
  campaignCategory, collectorUrl, productionBasePath, productionOrigin,
  publicPath, referralCategory, type EventName, type TelemetryEvent,
} from "./contract.ts";

export const consentKey = "glintlabs.analytics-consent.v1";
const consentLifetime = 180 * 24 * 60 * 60 * 1000;
export type Consent = "granted" | "denied" | null;
type StorageAccess = Pick<Storage, "getItem" | "setItem">;

export function readConsent(storage: StorageAccess, now = Date.now()): Consent {
  const raw = storage.getItem(consentKey);
  if (!raw) return null;
  let record: unknown;
  try { record = JSON.parse(raw); }
  catch { console.warn("[Glint Labs analytics] Invalid stored preference; analytics stays off."); return null; }
  if (!record || typeof record !== "object") return null;
  const value = record as Record<string, unknown>;
  return (value.choice === "granted" || value.choice === "denied") &&
    typeof value.expires === "number" && value.expires > now && value.expires <= now + consentLifetime
    ? value.choice : null;
}

export function saveConsent(storage: StorageAccess, choice: Exclude<Consent, null>, now = Date.now()) {
  storage.setItem(consentKey, JSON.stringify({ choice, expires: now + consentLifetime }));
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
  fetch: typeof fetch;
  warn: (message: string) => void;
}) {
  let consent: Consent = null;
  let lastPage: string | null = null;
  const pending = new Set<AbortController>();
  const cancel = () => { for (const controller of pending) controller.abort(); pending.clear(); };
  return {
    setConsent(choice: Consent) {
      if (choice !== "granted") { cancel(); lastPage = null; }
      consent = choice;
    },
    dispose: cancel,
    async track(event: EventName): Promise<boolean> {
      const location = options.location();
      if (!options.enabled || consent !== "granted" || options.privacyRequested() || !isProductionLocation(location)) return false;
      const page = locationPath(location.pathname);
      if (!page || (event === "page_view" && page === lastPage)) return false;
      if (event === "report_download_click" && page !== "/annual-report-2026" && !page.startsWith("/reports/")) return false;
      const payload: TelemetryEvent = {
        v: 1, event, page_path: page,
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

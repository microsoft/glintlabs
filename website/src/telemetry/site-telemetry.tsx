"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { telemetryEnabled } from "./config";
import {
  actionEvent, createBrowserIdentity, createTelemetryClient, hasLegacyRefusal,
  isProductionLocation, legacyConsentKeys,
} from "./client";
import styles from "./site-telemetry.module.css";

function privacyRequested() {
  const browser = navigator as Navigator & { globalPrivacyControl?: boolean };
  return browser.globalPrivacyControl === true || browser.doNotTrack === "1";
}

export function SiteTelemetry() {
  const pathname = usePathname();
  const client = useRef<ReturnType<typeof createTelemetryClient> | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!telemetryEnabled || !isProductionLocation(window.location)) return;
    setActive(true);
    let warned = false;
    const tracker = createTelemetryClient({
      enabled: true, location: () => window.location, referrer: () => document.referrer,
      privacyRequested, fetch: window.fetch.bind(window), warn: message => console.warn(message),
      identity: createBrowserIdentity({
        storage: () => window.localStorage, warn: message => console.warn(message),
      }),
      preferenceBlocked: () => {
        try { return hasLegacyRefusal(window.localStorage); }
        catch {
          if (!warned) console.warn("[Glint Labs analytics] Existing preferences unavailable or invalid; collection stays off.");
          warned = true;
          return true;
        }
      },
    });
    client.current = tracker;
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || legacyConsentKeys.some(key => key === event.key)) {
        tracker.reset();
        void tracker.track("page_view");
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const element = event.target.closest<HTMLElement>("a[href],button[data-glintlabs-event]");
      if (!element) return;
      const name = actionEvent({
        marker: element.dataset.glintlabsEvent,
        href: element.getAttribute("href"), download: element.hasAttribute("download"),
      }, window.location.href);
      if (name) void tracker.track(name);
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("click", onClick);
      tracker.dispose();
      client.current = null;
    };
  }, []);

  useEffect(() => {
    if (active) void client.current?.track("page_view");
  }, [active, pathname]);

  if (!active) return null;
  return (
    <aside className={styles.root} aria-label="Site analytics">
      <details>
        <summary>Site analytics</summary>
        <div className={styles.panel}>
          <h2>Automatic site analytics</h2>
          <p>Glint Labs automatically counts public page views and tool, skill-link, and report-download clicks
            using Supabase. A random browser ID counts distinct browsers/devices, not verified people.
            We do not send survey data, names, email addresses, or full URLs.</p>
          <p>The browser ID expires after 18 calendar months. Supabase stores only a secret-keyed hash with events,
            which are retained for 90 days.
            Clearing browser data or changing browsers/devices can cause additional counts.</p>
          <p>Supabase receives your IP address to handle requests; a daily-changing hash is used separately
            for short-lived rate limits, not to identify visitors in events. Browser Do Not Track and
            Global Privacy Control signals and unexpired refusals saved under the previous policy stop
            collection and delete the browser ID. This cannot recall events already received.</p>
          <p><a href="https://privacy.microsoft.com/privacystatement">Microsoft Privacy Statement</a></p>
        </div>
      </details>
    </aside>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { telemetryEnabled } from "./config";
import {
  actionEvent, consentKey, createTelemetryClient, isProductionLocation,
  readConsent, saveConsent, type Consent,
} from "./client";
import styles from "./site-telemetry.module.css";

function privacyRequested() {
  const browser = navigator as Navigator & { globalPrivacyControl?: boolean };
  return browser.globalPrivacyControl === true || browser.doNotTrack === "1";
}

export function SiteTelemetry() {
  const pathname = usePathname();
  const client = useRef<ReturnType<typeof createTelemetryClient> | null>(null);
  const settings = useRef<HTMLButtonElement>(null);
  const reject = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(false);
  const [choice, setChoice] = useState<Consent>(null);
  const [open, setOpen] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  useEffect(() => {
    if (!telemetryEnabled || !isProductionLocation(window.location)) return;
    const requested = privacyRequested();
    setPrivacy(requested);
    setActive(true);
    const tracker = createTelemetryClient({
      enabled: true, location: () => window.location, referrer: () => document.referrer,
      privacyRequested, fetch: window.fetch.bind(window), warn: message => console.warn(message),
    });
    client.current = tracker;
    const load = () => {
      let saved: Consent = null;
      try { saved = readConsent(window.localStorage); }
      catch { console.warn("[Glint Labs analytics] Preferences unavailable; analytics stays off until you choose."); }
      tracker.setConsent(saved);
      setChoice(saved);
      setOpen(!saved && !requested);
    };
    load();
    const onStorage = (event: StorageEvent) => { if (event.key === consentKey || event.key === null) load(); };
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
    if (active && choice === "granted") void client.current?.track("page_view");
  }, [active, choice, pathname]);

  const choose = (next: Exclude<Consent, null>) => {
    client.current?.setConsent(next);
    setChoice(next);
    try { saveConsent(window.localStorage, next); }
    catch { console.warn("[Glint Labs analytics] Preference could not be saved; this choice applies only to this page session."); }
    setOpen(false);
    settings.current?.focus();
  };

  if (!active) return null;
  return (
    <aside className={styles.root} aria-label="Analytics preferences">
      <button ref={settings} className={styles.settings} type="button" aria-expanded={open}
        aria-controls="analytics-preferences" onClick={() => {
          setOpen(value => !value);
          requestAnimationFrame(() => reject.current?.focus());
        }}>Analytics settings</button>
      {open && <section id="analytics-preferences" className={styles.panel} aria-labelledby="analytics-heading">
        <h2 id="analytics-heading">Optional site analytics</h2>
        <p>With your permission, Glint Labs counts public page views and tool, skill-link, and report-download clicks
          using Supabase. We do not send survey data, names, email addresses, full URLs, or visitor identifiers.</p>
        <p>Events are retained for 90 days. Supabase receives your IP address to handle requests; a daily-changing
          hash is used separately for short-lived rate limits, not to identify visitors in events.
          Your choice is saved on this browser for 180 days and can be changed here.</p>
        <p><a href="https://privacy.microsoft.com/privacystatement">Microsoft Privacy Statement</a></p>
        {privacy && <p>Your browser privacy signal keeps analytics off.</p>}
        <div className={styles.actions}>
          <button ref={reject} type="button" onClick={() => choose("denied")}>Reject optional analytics</button>
          <button type="button" disabled={privacy} onClick={() => choose("granted")}>Allow optional analytics</button>
        </div>
      </section>}
    </aside>
  );
}

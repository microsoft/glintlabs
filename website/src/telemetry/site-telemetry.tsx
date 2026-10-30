"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { telemetryEnabled } from "./config";
import {
  actionEvent, browserPrivacyRequested, createBrowserIdentity, createPreferenceCheck, createTelemetryClient,
  isProductionLocation, legacyConsentKeys,
} from "./client";

export function SiteTelemetry() {
  const pathname = usePathname();
  const client = useRef<ReturnType<typeof createTelemetryClient> | null>(null);

  useEffect(() => {
    if (!telemetryEnabled || !isProductionLocation(window.location)) return;
    const tracker = createTelemetryClient({
      enabled: true, location: () => window.location, referrer: () => document.referrer,
      privacyRequested: () => browserPrivacyRequested(navigator),
      fetch: window.fetch.bind(window), warn: message => console.warn(message),
      identity: createBrowserIdentity({
        storage: () => window.localStorage, warn: message => console.warn(message),
      }),
      preferenceBlocked: createPreferenceCheck({
        storage: () => window.localStorage, warn: message => console.warn(message),
      }),
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
    void client.current?.track("page_view");
  }, [pathname]);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { clarityEnabled } from "./config";
import {
  browserPrivacyRequested, createPreferenceCheck, isProductionLocation, legacyConsentKeys, locationPath,
} from "./client";

type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: Clarity;
  }
}

export function SiteClarity() {
  const pathname = usePathname();
  const synchronize = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!clarityEnabled || !isProductionLocation(window.location)) return;
    let script: HTMLScriptElement | null = null;
    let stopped = false;
    const preferenceBlocked = createPreferenceCheck({
      storage: () => window.localStorage, warn: message => console.warn(message),
    });
    const stop = () => {
      if (!script || stopped) return;
      stopped = true;
      script.remove();
      window.clarity?.("stop");
    };
    const sync = () => {
      if (!isProductionLocation(window.location) || !locationPath(window.location.pathname) ||
          browserPrivacyRequested(navigator) || preferenceBlocked()) {
        stop();
        return;
      }
      if (script || stopped) return;
      if (window.clarity) {
        console.warn("[Glint Labs analytics] Another Clarity installation exists; duplicate loading is blocked.");
        return;
      }
      const queue: unknown[][] = [];
      window.clarity = Object.assign((...args: unknown[]) => { queue.push(args); }, { q: queue });
      script = document.createElement("script");
      script.async = true;
      script.src = "https://www.clarity.ms/tag/z4zyk0yyz7";
      script.referrerPolicy = "no-referrer";
      script.onerror = () => {
        stop();
        console.warn("[Glint Labs analytics] Clarity unavailable; navigation and Supabase analytics are unaffected.");
      };
      // Do not grant consent: Clarity applies its IP-based regional cookie defaults.
      document.head.append(script);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || legacyConsentKeys.some(key => key === event.key)) sync();
    };
    synchronize.current = sync;
    sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      synchronize.current = null;
      stop();
    };
  }, []);

  useEffect(() => { synchronize.current?.(); }, [pathname]);

  return null;
}

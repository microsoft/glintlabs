"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

type HeroRoute = "/" | "/annual-report-2026";
type HeroTransitionLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  href: HeroRoute;
};

function waitForHero(href: HeroRoute, navigate: () => void) {
  return new Promise<HTMLElement | null>((resolve) => {
    const selector = `[data-hero-route="${href}"]`;
    const finish = (hero: HTMLElement | null) => {
      observer.disconnect();
      window.clearTimeout(timeout);
      resolve(hero);
    };
    const observer = new MutationObserver(() => {
      const hero = document.querySelector<HTMLElement>(selector);
      if (hero) finish(hero);
    });
    const timeout = window.setTimeout(() => finish(null), 1500);
    observer.observe(document.body, { childList: true, subtree: true });
    navigate();
  });
}

export function HeroTransitionLink({ href, ...props }: HeroTransitionLinkProps) {
  const router = useRouter();

  return <Link {...props} href={href} onNavigate={(event) => {
    const from = window.location.pathname;
    const isHeroPair = (from === "/" && href === "/annual-report-2026") ||
      (from === "/annual-report-2026" && href === "/");
    if (!isHeroPair || window.scrollY > 1 || !document.startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    event.preventDefault();
    const root = document.documentElement;
    if (root.hasAttribute("data-hero-transition")) return;
    root.setAttribute("data-hero-transition", "");

    try {
      const transition = document.startViewTransition(async () => {
        // App Router navigation commits asynchronously; capture only the destination hero.
        const hero = await waitForHero(href, () => router.push(href, { scroll: false }));
        if (!hero) {
          transition.skipTransition();
          return;
        }
        const image = hero.querySelector<HTMLImageElement>("[data-hero-image]");
        if (image) {
          let timeout: ReturnType<typeof setTimeout> | undefined;
          await Promise.race([image.decode().catch(() => {}), new Promise<void>((resolve) => {
            timeout = setTimeout(resolve, 500);
          })]);
          clearTimeout(timeout);
        }
        window.scrollTo({ top: 0, behavior: "instant" });
        hero.querySelector("h1")?.focus({ preventScroll: true });
      });
      void transition.ready.catch(() => {});
      void transition.finished.catch(() => {}).finally(() => root.removeAttribute("data-hero-transition"));
    } catch {
      root.removeAttribute("data-hero-transition");
      router.push(href);
    }
  }} />;
}

"use client";

import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import styles from "./publishing-studio.module.css";

const previewDocumentHtml = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>';

export function StudioReportViewport({
  children,
  className,
  frameRef,
  onInteract,
  style,
}: {
  children: ReactNode;
  className: string;
  frameRef: RefObject<HTMLIFrameElement | null>;
  onInteract: () => void;
  style: CSSProperties;
}) {
  const [previewDocument, setPreviewDocument] = useState<Document>();
  const [previewStatus, setPreviewStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !previewDocument) return;
    const sourceDocument = frame.ownerDocument;
    const copies = new Map<Element, Element>();
    let disposed = false;
    let revealed = false;
    let failed = false;
    let checking = false;
    let styleVersion = 0;
    let revealFrame = 0;

    function revealWhenReady() {
      if (disposed || revealed || failed || checking) return;
      const report = previewDocument!.querySelector("article[data-report-style]");
      if (!report || Array.from(copies.values()).some((copy) =>
        copy.tagName === "LINK" && !(copy as HTMLLinkElement).sheet)) return;
      const version = styleVersion;
      checking = true;
      report.getBoundingClientRect();
      void previewDocument!.fonts.ready.then(() => {
        if (disposed) return;
        revealFrame = requestAnimationFrame(() => {
          checking = false;
          if (disposed || failed) return;
          if (version !== styleVersion) {
            revealWhenReady();
            return;
          }
          revealed = true;
          contentObserver.disconnect();
          setPreviewStatus("ready");
        });
      });
    }

    function syncStyles() {
      styleVersion += 1;
      const sources = new Set(sourceDocument.head.querySelectorAll('style, link[rel="stylesheet"]'));
      for (const [source, copy] of copies) {
        if (!sources.has(source)) {
          copy.remove();
          copies.delete(source);
        }
      }
      for (const source of sources) {
        const previous = copies.get(source);
        const copy = source.cloneNode(true) as Element;
        if (source instanceof HTMLStyleElement && source.sheet) {
          copy.textContent = Array.from(source.sheet.cssRules, (rule) => rule.cssText).join("\n");
        }
        if (previous?.outerHTML === copy.outerHTML) continue;
        if (copy.tagName === "LINK") {
          copy.addEventListener("load", revealWhenReady);
          copy.addEventListener("error", () => {
            if (disposed || revealed || !copy.isConnected) return;
            failed = true;
            setPreviewStatus("error");
          });
        }
        if (previous) previous.replaceWith(copy);
        else previewDocument!.head.append(copy);
        copies.set(source, copy);
      }
      const root = previewDocument!.documentElement;
      root.lang = sourceDocument.documentElement.lang;
      root.className = sourceDocument.documentElement.className;
      root.dataset.sitePalette = sourceDocument.documentElement.dataset.sitePalette ?? "blue";
      const inherited = getComputedStyle(frame!);
      for (const property of inherited) {
        if (property.startsWith("--")) root.style.setProperty(property, inherited.getPropertyValue(property));
      }
      revealWhenReady();
    }

    function navigatePreviewLink(event: MouseEvent) {
      const target = event.target as Element | null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      const href = link?.getAttribute("href");
      if (href?.startsWith("#")) {
        // srcdoc otherwise resolves fragment links against the Studio URL.
        event.preventDefault();
        let id;
        try {
          id = decodeURIComponent(href.slice(1));
        } catch {
          return;
        }
        previewDocument!.getElementById(id)?.scrollIntoView({ block: "start" });
      } else if (link) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    }

    const contentObserver = new MutationObserver(syncStyles);
    contentObserver.observe(previewDocument.body, { childList: true, subtree: true });
    syncStyles();
    const observer = new MutationObserver(syncStyles);
    observer.observe(sourceDocument.head, { childList: true, subtree: true, characterData: true, attributes: true });
    observer.observe(sourceDocument.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-site-palette"] });
    previewDocument.addEventListener("click", navigatePreviewLink, true);
    previewDocument.addEventListener("pointerdown", onInteract);
    previewDocument.addEventListener("focusin", onInteract);
    return () => {
      disposed = true;
      cancelAnimationFrame(revealFrame);
      contentObserver.disconnect();
      observer.disconnect();
      previewDocument.removeEventListener("click", navigatePreviewLink, true);
      previewDocument.removeEventListener("pointerdown", onInteract);
      previewDocument.removeEventListener("focusin", onInteract);
    };
  }, [frameRef, onInteract, previewDocument]);

  function retryPreview() {
    setPreviewStatus("loading");
    setPreviewDocument(undefined);
    if (frameRef.current) frameRef.current.srcdoc = previewDocumentHtml;
  }

  return (
    <>
      <iframe
        aria-busy={previewStatus === "loading"}
        aria-hidden={previewStatus !== "ready"}
        className={className}
        onLoad={(event) => setPreviewDocument(event.currentTarget.contentDocument ?? undefined)}
        ref={frameRef}
        srcDoc={previewDocumentHtml}
        style={{ ...style, visibility: previewStatus === "ready" ? "visible" : "hidden" }}
        title="Report preview"
      />
      {previewStatus !== "ready" ? (
        <div className={styles.previewLoading} role={previewStatus === "error" ? "alert" : "status"}>
          {previewStatus === "error" ? (
            <>
              <p>We couldn&apos;t load the preview. Try again.</p>
              <button className={styles.secondaryAction} onClick={retryPreview} type="button">
                Retry preview
              </button>
            </>
          ) : <p>Loading preview...</p>}
        </div>
      ) : null}
      {previewDocument ? createPortal(children, previewDocument.body) : null}
    </>
  );
}

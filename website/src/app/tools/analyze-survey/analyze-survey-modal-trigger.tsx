"use client";

import { createPortal } from "react-dom";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import styles from "../tools-catalog.module.css";
import { AnalyzeSurveyDetails } from "./analyze-survey-details";

export function AnalyzeSurveyModalTrigger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !mounted || !dialog) return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousRootOverscroll = root.style.overscrollBehavior;
    const previousRootScrollbarGutter = root.style.scrollbarGutter;
    const previousBodyOverflow = body.style.overflow;
    if (window.innerWidth > root.clientWidth && getComputedStyle(root).scrollbarGutter === "auto") {
      root.style.scrollbarGutter = "stable";
    }
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]")?.focus({ preventScroll: true });
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscroll;
      root.style.scrollbarGutter = previousRootScrollbarGutter;
      body.style.overflow = previousBodyOverflow;
      dialog.close();
    };
  }, [mounted, open]);

  const closeModal = () => {
    setOpen(false);
    window.requestAnimationFrame(() =>
      triggerRef.current?.focus({ preventScroll: true }),
    );
  };

  return (
    <>
      <button
        data-glintlabs-event="analyze_survey_click"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={className}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        {children}
      </button>

      {mounted && open
        ? createPortal(
            <dialog
              aria-label="Analyze Survey details"
              className={styles.modal}
              ref={dialogRef}
              role="dialog"
              onCancel={(event) => {
                event.preventDefault();
                closeModal();
              }}
              onKeyDown={(event) => {
                if (event.key !== "Tab") return;
                const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
                  "a[href], button, input, select, textarea, summary, [tabindex]",
                )].filter((control) => control.tabIndex >= 0 && !control.matches(":disabled") && control.getClientRects().length > 0);
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }}
              onMouseDown={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                if (
                  event.target === event.currentTarget &&
                  (event.clientX < bounds.left || event.clientX > bounds.right ||
                    event.clientY < bounds.top || event.clientY > bounds.bottom)
                ) closeModal();
              }}
            >
              <AnalyzeSurveyDetails onClose={closeModal} />
            </dialog>,
            document.body,
          )
        : null}
    </>
  );
}

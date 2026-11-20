"use client";

import { Button } from "@fluentui/react-button";
import { Checkbox } from "@fluentui/react-checkbox";
import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { toolFeedbackReasons, type FeedbackReason } from "@/telemetry/tool-feedback";
import styles from "./tool-feedback.module.css";

export function ToolFeedbackPopover({ id, title, triggerRef, onSubmit, onDismiss }: {
  id: string;
  title: string;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onSubmit: (reasons: FeedbackReason[]) => void;
  onDismiss: (restoreFocus: boolean) => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const reasonHintId = useId();
  const [reasons, setReasons] = useState<FeedbackReason[]>([]);
  const submitted = useRef(false);

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    if (!popover || !trigger) return;
    const viewport = window.visualViewport;
    const position = () => {
      if (!popover.matches(":popover-open")) return;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 16;
      const topEdge = (viewport?.offsetTop ?? 0) + 16;
      const rightEdge = leftEdge + (viewport?.width ?? document.documentElement.clientWidth) - 32;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 32;
      popover.style.maxWidth = `${Math.max(0, rightEdge - leftEdge)}px`;
      const anchor = trigger.getBoundingClientRect();
      const below = bottomEdge - anchor.bottom - 8;
      const above = anchor.top - topEdge - 8;
      popover.style.maxHeight = `${Math.max(0, Math.min(bottomEdge - topEdge, Math.max(below, above)))}px`;
      const bounds = popover.getBoundingClientRect();
      const top = below < bounds.height && above > below
        ? anchor.top - bounds.height - 8
        : anchor.bottom + 8;
      popover.style.left = `${Math.max(leftEdge, Math.min(anchor.right - bounds.width, rightEdge - bounds.width))}px`;
      popover.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - bounds.height))}px`;
    };
    trigger.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    popover.showPopover();
    position();
    popover.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    const observer = new ResizeObserver(position);
    observer.observe(popover);
    observer.observe(trigger);
    document.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    viewport?.addEventListener("resize", position);
    viewport?.addEventListener("scroll", position);
    return () => {
      observer.disconnect();
      document.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      viewport?.removeEventListener("resize", position);
      viewport?.removeEventListener("scroll", position);
      popover.hidePopover();
    };
  }, [triggerRef]);

  return (
    <div
      ref={popoverRef}
      id={id}
      popover="auto"
      role="dialog"
      aria-modal="false"
      className={styles.popover}
      aria-label={`Feedback on ${title}`}
      onToggle={event => {
        if (event.newState === "closed") onDismiss(false);
      }}
      onKeyDown={event => {
        if (event.key === "Escape") {
          event.preventDefault();
          onDismiss(true);
        }
      }}
      onBlur={event => {
        // Native closure restores focus, including during Strict Mode effect cleanup.
        if (event.currentTarget.matches(":popover-open") &&
            event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) onDismiss(false);
      }}
    >
      <form
        onSubmit={event => {
          event.preventDefault();
          if (submitted.current || reasons.length === 0) return;
          submitted.current = true;
          onSubmit(reasons);
        }}
      >
        <fieldset className={styles.reasons} aria-describedby={reasonHintId}>
          <legend>What could be better?</legend>
          <p id={reasonHintId} className={styles.reasonHint}>Choose at least one reason to submit.</p>
          <div className={styles.reasonList}>
            {toolFeedbackReasons.map(reason => (
              <Checkbox
                key={reason.value}
                className={styles.reason}
                shape="square"
                label={{ children: reason.label, className: styles.reasonLabel }}
                indicator={{ className: styles.reasonIndicator }}
                name="reason"
                value={reason.value}
                checked={reasons.includes(reason.value)}
                onChange={(_, data) => setReasons(current => data.checked === true
                  ? [...current, reason.value]
                  : current.filter(value => value !== reason.value))}
              />
            ))}
          </div>
        </fieldset>
        <div className={styles.popoverActions}>
          <Button type="submit" appearance="primary" className={styles.submitButton} disabled={reasons.length === 0}>Submit</Button>
        </div>
      </form>
    </div>
  );
}

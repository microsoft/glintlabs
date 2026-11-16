"use client";

import { ThumbDislike20Filled, ThumbDislike20Regular } from "@fluentui/react-icons/svg/thumb-dislike";
import { ThumbLike20Filled, ThumbLike20Regular } from "@fluentui/react-icons/svg/thumb-like";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  toolFeedbackEvents, toolFeedbackReasonsEvent, type FeedbackRating, type FeedbackTool,
} from "@/telemetry/tool-feedback";
import { ToolFeedbackPopover } from "./tool-feedback-popover";
import styles from "./tool-feedback.module.css";

type FeedbackPanel = { view: "reasons" | "submitted"; sequence: number };

export function ToolFeedback({ tool, title }: { tool: FeedbackTool; title: string }) {
  const [selected, setSelected] = useState<FeedbackRating | null>(null);
  const [tooltipDismissed, setTooltipDismissed] = useState(false);
  const [panel, setPanel] = useState<FeedbackPanel | null>(null);
  const panelSequence = useRef(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipId = useId();
  const popoverId = useId();
  const dismissPanel = useCallback((sequence: number) => {
    setPanel(current => current?.sequence === sequence ? null : current);
  }, []);
  const showConfirmation = () => {
    setPanel({ view: "submitted", sequence: ++panelSequence.current });
  };
  const restoreFocus = () => {
    triggerRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const dismissTooltip = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTooltipDismissed(true);
    };
    document.addEventListener("keydown", dismissTooltip);
    return () => document.removeEventListener("keydown", dismissTooltip);
  }, []);

  return (
    <div className={styles.feedback} role="group" aria-label={`Feedback on ${title}`}>
      {(["up", "down"] as const).map(rating => (
        <span
          key={rating}
          className={styles.control}
          onPointerEnter={event => setTooltipDismissed(event.pointerType === "touch")}
        >
          <button
            type="button"
            className={styles.button}
            aria-label={`Mark ${title} as ${rating === "up" ? "helpful" : "not helpful"}`}
            aria-pressed={selected === rating}
            aria-haspopup={rating === "down" ? "dialog" : undefined}
            aria-expanded={rating === "down" ? panel?.view === "reasons" : undefined}
            aria-controls={rating === "down" && panel?.view === "reasons" ? popoverId : undefined}
            aria-describedby={`${tooltipId}-${rating}`}
            data-glintlabs-feedback={toolFeedbackEvents[tool][rating]}
            onFocus={event => {
              if (event.currentTarget.matches(":focus-visible")) setTooltipDismissed(false);
            }}
            onClick={event => {
              if (selected === rating) {
                // The document-level analytics listener must ignore repeated selections.
                event.preventDefault();
              } else {
                setSelected(rating);
              }
              triggerRef.current = event.currentTarget;
              setTooltipDismissed(true);
              if (rating === "up") showConfirmation();
              else setPanel({ view: "reasons", sequence: ++panelSequence.current });
            }}
          >
            {rating === "up" ? (
              <>
                <ThumbLike20Regular className={styles.regularIcon} aria-hidden="true" />
                <ThumbLike20Filled className={styles.filledIcon} aria-hidden="true" />
              </>
            ) : (
              <>
                <ThumbDislike20Regular className={styles.regularIcon} aria-hidden="true" />
                <ThumbDislike20Filled className={styles.filledIcon} aria-hidden="true" />
              </>
            )}
          </button>
          <span id={`${tooltipId}-${rating}`} role="tooltip" className={styles.tooltip} hidden={tooltipDismissed || panel !== null}>
            {rating === "up" ? "I like this tool" : "I don't like this tool"}
          </span>
        </span>
      ))}
      <span className={styles.statusAnnouncement} role="status" aria-atomic="true">
        {panel?.view === "submitted" ? <span key={panel.sequence}>Thanks for the feedback on {title}.</span> : ""}
      </span>
      {panel?.view === "submitted" && (
        <FeedbackConfirmation key={panel.sequence} sequence={panel.sequence} triggerRef={triggerRef} onDismiss={dismissPanel} />
      )}
      {panel?.view === "reasons" && (
        <ToolFeedbackPopover
          key={panel.sequence}
          id={popoverId}
          title={title}
          triggerRef={triggerRef}
          onSubmit={reasons => {
            document.dispatchEvent(new CustomEvent(toolFeedbackReasonsEvent, { detail: { tool, reasons } }));
            showConfirmation();
            restoreFocus();
          }}
          onDismiss={returnFocus => {
            dismissPanel(panel.sequence);
            if (returnFocus) restoreFocus();
          }}
        />
      )}
    </div>
  );
}

function FeedbackConfirmation({ sequence, triggerRef, onDismiss }: {
  sequence: number;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onDismiss: (sequence: number) => void;
}) {
  const confirmationRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const confirmation = confirmationRef.current;
    const trigger = triggerRef.current;
    if (!confirmation || !trigger) return;
    const viewport = window.visualViewport;
    const position = () => {
      if (!confirmation.matches(":popover-open")) return;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 16;
      const topEdge = (viewport?.offsetTop ?? 0) + 16;
      const rightEdge = leftEdge + (viewport?.width ?? document.documentElement.clientWidth) - 32;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 32;
      confirmation.style.maxWidth = `${Math.max(0, rightEdge - leftEdge)}px`;
      const anchor = trigger.getBoundingClientRect();
      const bounds = confirmation.getBoundingClientRect();
      const top = anchor.bottom + 8 + bounds.height > bottomEdge
        ? anchor.top - bounds.height - 8
        : anchor.bottom + 8;
      confirmation.style.left = `${Math.max(leftEdge, Math.min(anchor.left + (anchor.width - bounds.width) / 2, rightEdge - bounds.width))}px`;
      confirmation.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - bounds.height))}px`;
    };
    trigger.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    confirmation.showPopover();
    position();
    const observer = new ResizeObserver(position);
    observer.observe(confirmation);
    observer.observe(trigger);
    document.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    viewport?.addEventListener("resize", position);
    viewport?.addEventListener("scroll", position);
    const timer = window.setTimeout(() => onDismiss(sequence), 3000);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      viewport?.removeEventListener("resize", position);
      viewport?.removeEventListener("scroll", position);
      confirmation.hidePopover();
    };
  }, [sequence, triggerRef, onDismiss]);

  return (
    <div
      ref={confirmationRef}
      popover="auto"
      className={styles.confirmation}
      aria-hidden="true"
      onToggle={event => {
        if (event.newState === "closed") onDismiss(sequence);
      }}
    >
      <span>Thanks for the feedback</span>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { ReportBlock } from "../manifest/report-manifest.ts";
import type { TextCalloutSelection } from "../project/text-callout.ts";
import styles from "./report-renderer.module.css";

type SelectionAction = { ranges: TextCalloutSelection; enabled: boolean; top: number; left: number };

export function ReportTextSelection({ blocks, onSelectText }: {
  blocks: readonly ReportBlock[];
  onSelectText: (selection: TextCalloutSelection, enabled: boolean) => boolean;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const [action, setAction] = useState<SelectionAction>();
  const currentAction = useRef<SelectionAction | undefined>(undefined);

  useEffect(() => {
    const doc = anchor.current?.ownerDocument;
    if (!doc) return;
    function update() {
      const selected = doc!.getSelection();
      const range = selected?.rangeCount === 1 && !selected.isCollapsed ? selected.getRangeAt(0) : undefined;
      const ranges: TextCalloutSelection = [];
      let paragraphBottom = 0;
      if (range) {
        for (const node of doc!.querySelectorAll<HTMLElement>("[data-report-text-block]")) {
          if (!range.intersectsNode(node)) continue;
          const part = range.cloneRange();
          if (!node.contains(part.startContainer)) part.setStart(node, 0);
          if (!node.contains(part.endContainer)) part.setEnd(node, node.childNodes.length);
          const prefix = doc!.createRange();
          prefix.selectNodeContents(node);
          prefix.setEnd(part.startContainer, part.startOffset);
          const text = part.toString();
          if (!text.trim()) continue;
          ranges.push({ blockId: node.dataset.reportTextBlock!, start: prefix.toString().length, end: prefix.toString().length + text.length });
          paragraphBottom = node.getBoundingClientRect().bottom;
        }
      }
      const selectedText = ranges.map(item => {
        const block = blocks.find(block => block.id === item.blockId);
        return block?.type === "paragraph" ? block.text.slice(item.start, item.end) : "";
      }).join("");
      let next: SelectionAction | undefined;
      if (range && ranges.length && selectedText.replace(/\s/g, "") === range.toString().replace(/\s/g, "")) {
        const rect = range.getBoundingClientRect();
        const enabled = !ranges.every(item => {
          const block = blocks.find(block => block.id === item.blockId);
          return block?.type === "paragraph" && block.callouts?.some(callout => callout.start <= item.start && callout.end >= item.end);
        });
        next = {
          ranges, enabled,
          top: Math.max(8, Math.min(Math.max(rect.bottom, paragraphBottom) + 12, doc!.documentElement.clientHeight - 52)),
          left: Math.max(8, Math.min(rect.left, doc!.documentElement.clientWidth - 228)),
        };
      }
      currentAction.current = next;
      setAction(next);
    }
    function keydown(event: KeyboardEvent) {
      if (event.altKey && event.shiftKey && event.code === "KeyC" && currentAction.current) {
        event.preventDefault();
        const next = currentAction.current;
        if (onSelectText(next.ranges, next.enabled)) doc!.getSelection()?.removeAllRanges();
      }
    }
    doc.addEventListener("selectionchange", update);
    doc.addEventListener("scroll", update, true);
    doc.addEventListener("keydown", keydown);
    return () => {
      doc.removeEventListener("selectionchange", update);
      doc.removeEventListener("scroll", update, true);
      doc.removeEventListener("keydown", keydown);
    };
  }, [blocks, onSelectText]);

  return <div ref={anchor}>
    {action ? <div className={styles.textSelectionActions} role="toolbar" aria-label="Selected text"
      style={{ top: action.top, left: action.left }}>
      <button type="button" aria-keyshortcuts="Alt+Shift+C"
        onPointerDown={event => event.preventDefault()}
        onClick={() => {
          if (onSelectText(action.ranges, action.enabled)) anchor.current?.ownerDocument.getSelection()?.removeAllRanges();
        }}>
        <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 4.5v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {action.enabled ? "Convert to callout" : "Convert to paragraph"}
      </button>
    </div> : null}
  </div>;
}

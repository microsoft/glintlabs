"use client";

import { useEffect, useRef, useState } from "react";
import { DataBarVertical20Regular } from "@fluentui/react-icons/svg/data-bar-vertical";
import type { ReportBlock } from "../manifest/report-manifest.ts";
import styles from "./report-renderer.module.css";

export function ReportChartInsertion({ blocks, onInsertChart, restoreFocus }: {
  blocks: readonly ReportBlock[];
  onInsertChart: (beforeBlockId?: string) => void;
  restoreFocus?: { beforeBlockId: string; onRestored: () => void };
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Array<{ before: string; top: number; left: number; width: number; height: number; label: string }>>([]);
  const [selectingText, setSelectingText] = useState(false);

  useEffect(() => {
    if (!restoreFocus) return;
    const target = Array.from(layer.current?.querySelectorAll<HTMLButtonElement>("[data-insert-before]") ?? [])
      .find(button => button.dataset.insertBefore === restoreFocus.beforeBlockId);
    if (target) { target.focus({ preventScroll: true }); restoreFocus.onRestored(); }
  }, [points, restoreFocus]);

  useEffect(() => {
    const root = layer.current?.parentElement;
    if (!root) return;
    const doc = root.ownerDocument;
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-chart-insert-before]"));
    function measure() {
      const origin = root!.getBoundingClientRect();
      setPoints(targets.map(node => {
        const before = node.dataset.chartInsertBefore!;
        const block = blocks.find(block => block.id === before);
        const title = block && ("text" in block ? block.text : "title" in block ? block.title
          : block.type === "data-visual-source" ? block.data.title : "fileName" in block ? block.fileName : "report content");
        const rect = node.getBoundingClientRect();
        const previous = node.previousElementSibling?.getBoundingClientRect();
        const gap = previous ? Math.max(24, rect.top - previous.bottom) : 48;
        return { before, top: rect.top - origin.top - gap / 2, left: rect.left - origin.left, width: rect.width,
          height: Math.min(32, Math.max(24, gap - 24)),
          label: before ? `Insert chart before ${title?.slice(0, 60)}` : "Insert chart at end of report" };
      }));
    }
    function selectionChanged() { setSelectingText(!doc.getSelection()?.isCollapsed); }
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    targets.forEach(node => observer.observe(node));
    doc.addEventListener("selectionchange", selectionChanged);
    doc.defaultView?.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      doc.removeEventListener("selectionchange", selectionChanged);
      doc.defaultView?.removeEventListener("resize", measure);
    };
  }, [blocks]);

  return <div ref={layer} className={styles.chartInsertionLayer} data-text-selected={selectingText || undefined}>
    {points.map(point => <div key={point.before} className={styles.chartInsertionBoundary}
      style={{ top: point.top, left: point.left, width: point.width, height: point.height, marginTop: -point.height / 2 }}>
      <button type="button" aria-label={point.label} data-insert-before={point.before}
        onClick={() => onInsertChart(point.before || undefined)}>
        <DataBarVertical20Regular aria-hidden="true" />
        Insert chart
      </button>
    </div>)}
  </div>;
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Add16Regular } from "@fluentui/react-icons/svg/add";
import { Dismiss16Regular } from "@fluentui/react-icons/svg/dismiss";
import { Subtract16Regular } from "@fluentui/react-icons/svg/subtract";
import { quadrantGeometry, type QuadrantBlock } from "./quadrant-data";
import styles from "./quadrant-scatter-plot.module.css";

function axisValue(value: number, unit = "number", raw?: string) {
  const formatted = raw?.trim().replace(/%$/, "") ??
    new Intl.NumberFormat("en-US", { maximumSignificantDigits: 15 }).format(value);
  return `${formatted}${unit === "percentage" ? "%" : unit === "percentage-points" ? " pp" : ""}`;
}

function tickValue(value: number) {
  const magnitude = Math.abs(value);
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: 3,
    notation: magnitude >= 1e9 || magnitude > 0 && magnitude < .001 ? "scientific" : magnitude >= 1000 ? "compact" : "standard",
  }).format(value);
}

export function QuadrantScatterPlot({ block }: { block: QuadrantBlock }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [position, setPosition] = useState({ left: 16, top: 100 });
  const card = useRef<HTMLElement>(null);
  const details = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = block.points.find(point => point.id === selectedId);
  const presentation = block.presentation;
  const geometry = quadrantGeometry(block.points, presentation);
  const x = (value: number) => (value - geometry.x.min) / (geometry.x.max - geometry.x.min) * 100;
  const y = (value: number) => (value - geometry.y.min) / (geometry.y.max - geometry.y.min) * 100;
  const detailId = `${block.id}-point-details`;
  const labels = presentation?.quadrants ?? ["Low X, high Y", "High X, high Y", "Low X, low Y", "High X, low Y"];
  const xLabel = presentation?.xLabel ?? "X value", yLabel = presentation?.yLabel ?? "Y value";
  function close(restoreFocus: boolean) {
    setSelectedId(undefined);
    if (restoreFocus && trigger.current?.isConnected) trigger.current.focus();
  }
  useEffect(() => {
    if (!selectedId) return;
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target) &&
          !(event.target instanceof Element && event.target.closest("[data-quadrant-trigger]")?.getAttribute("data-quadrant-trigger") === block.id)) setSelectedId(undefined);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(true); }
    };
    document.addEventListener("pointerdown", pointer);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", key); };
  }, [block.id, selectedId]);
  useLayoutEffect(() => {
    if (!selectedId) return;
    if (card.current && card.current.offsetWidth <= 640) details.current?.scrollIntoView({ block: "start", behavior: "instant" });
    function place() {
      const container = card.current;
      const root = container?.getBoundingClientRect();
      const anchor = trigger.current?.getBoundingClientRect();
      const panel = details.current?.getBoundingClientRect();
      if (!container || !root || !anchor || !panel) return;
      const scale = root.width / (container.offsetWidth || root.width);
      const leftOfPoint = anchor.left - panel.width - 8 * scale;
      const preferredLeft = leftOfPoint >= root.left + 16 * scale ? leftOfPoint : anchor.right + 8 * scale;
      const left = (Math.max(root.left + 16 * scale, Math.min(root.right - panel.width - 16 * scale, preferredLeft)) - root.left) / scale - container.clientLeft;
      const top = (Math.max(16, Math.min(window.innerHeight - panel.height - 16, anchor.top)) - root.top) / scale - container.clientTop;
      setPosition({ left, top });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const observer = new ResizeObserver(place);
    if (card.current) observer.observe(card.current);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [selectedId]);
  function pointButton(point: QuadrantBlock["points"][number], index: number, key = false) {
    return <button type="button" className={key ? styles.keyButton : styles.point}
      data-quadrant-trigger={block.id} aria-label={`${index + 1}. ${point.label}. ${xLabel}: ${axisValue(point.x, presentation?.xUnit)}. ${yLabel}: ${axisValue(point.y, presentation?.yUnit)}.`}
      aria-pressed={selectedId === point.id} aria-expanded={selectedId === point.id}
      aria-controls={selectedId === point.id ? detailId : undefined}
      style={key ? undefined : { left: `${x(point.x)}%`, bottom: `${y(point.y)}%`, zIndex: selectedId === point.id ? 2 : 1 }}
      onClick={event => {
        trigger.current = event.currentTarget;
        setSelectedId(value => value === point.id ? undefined : point.id);
      }}>
      {key ? `${index + 1}. ${point.label}` : <span>{index + 1}</span>}
    </button>;
  }
  const rawPoint = selected && block.verifiedSource?.rows.find(row => row.cells[0] === selected.id);
  const xIsDelta = presentation?.xUnit === "percentage-points";
  const xMetric = selected ? axisValue(selected.x, "number", rawPoint?.cells[2]).replace(/^[+-]/, "") : "";
  const xSign = selected && selected.x < 0 ? "-" : selected && selected.x > 0 ? "+" : "";
  return <figure className={styles.card} ref={card} data-quadrant-chart={block.id}>
    <header className={styles.heading}>
      <h3>{presentation?.title ?? block.title}</h3>
      <p>{presentation?.subtitle ?? "Select a numbered point or key entry to view its details."}</p>
    </header>
    <div className={styles.axisFrame}>
      <span className={styles.yLabel}>{yLabel}{presentation?.yUnit === "percentage" ? " (%)" : presentation?.yUnit === "percentage-points" ? " (pp)" : ""}</span>
      <div className={styles.yTicks} aria-hidden="true">{geometry.y.ticks.map(value =>
        <span key={value} style={{ bottom: `${y(value)}%` }}>{tickValue(value)}</span>)}</div>
      <div className={styles.plot}>
        <div className={styles.plotInner}>
          {geometry.x.ticks.map(value => <i className={styles.verticalGrid} key={`x-${value}`} style={{ left: `${x(value)}%` }} />)}
          {geometry.y.ticks.map(value => <i className={styles.horizontalGrid} key={`y-${value}`} style={{ bottom: `${y(value)}%` }} />)}
          <i className={styles.xSplit} style={{ left: `${x(geometry.xSplit)}%` }} />
          <i className={styles.ySplit} style={{ bottom: `${y(geometry.ySplit)}%` }} />
          {block.points.map((point, index) => <span key={point.id}>{pointButton(point, index)}</span>)}
        </div>
        <div className={styles.quadrantLabels} aria-hidden="true" style={{
          gridTemplateColumns: `clamp(min(50%, 160px), calc(var(--quadrant-plot-inset-x) + (100% - 2 * var(--quadrant-plot-inset-x)) * ${x(geometry.xSplit) / 100}), max(50%, calc(100% - 160px))) minmax(0, 1fr)`,
          gridTemplateRows: `clamp(64px, calc(20px + (100% - 40px) * ${1 - y(geometry.ySplit) / 100}), calc(100% - 64px)) minmax(0, 1fr)`,
        }}>
          {labels.map((label, index) => <span key={index}>{label}</span>)}
        </div>
      </div>
      <div className={styles.xTicks} aria-hidden="true">{geometry.x.ticks.map(value =>
        <span key={value} style={{ left: `${x(value)}%` }}>{tickValue(value)}</span>)}</div>
      <span className={styles.xLabel}>{xLabel}{presentation?.xUnit === "percentage" ? " (%)" : presentation?.xUnit === "percentage-points" ? " (percentage points)" : ""}</span>
    </div>
    <div className={styles.key} role="group" aria-label="Chart point key">
      {[0, Math.ceil(block.points.length / 2)].map(start =>
        <div className={styles.keyColumn} key={start}>
          {block.points.slice(start, start + Math.ceil(block.points.length / 2)).map((point, index) =>
            <div key={point.id}>{pointButton(point, start + index, true)}</div>)}
        </div>)}
    </div>
    {selected ? <section ref={details} id={detailId} className={styles.details} role="region"
      aria-labelledby={`${detailId}-title`} style={position}>
      <div className={styles.detailsIntro}>
        <div className={styles.detailsHeading}>
          <h4 id={`${detailId}-title`}>{selected.label}</h4>
          <button className={styles.close} type="button" aria-label="Close point details" onClick={() => close(true)}>
            <Dismiss16Regular aria-hidden="true" />
          </button>
        </div>
        {selected.description ? <p>{selected.description}</p> : null}
      </div>
      <dl className={styles.summaries}>
        <div><dt>{presentation?.preset === "listening" && yLabel === "Current use" ? "Use" : yLabel}</dt>
          <dd>{axisValue(selected.y, presentation?.yUnit, rawPoint?.cells[3])}</dd></div>
        <div><dt>{xLabel}</dt>
          <dd aria-label={xIsDelta ? `${xLabel}: ${xSign}${xMetric} percentage points` : undefined}>
            {xIsDelta && selected.x !== 0 ? selected.x < 0
              ? <Subtract16Regular aria-hidden="true" /> : <Add16Regular aria-hidden="true" /> : null}
            {xIsDelta ? xMetric : axisValue(selected.x, presentation?.xUnit, rawPoint?.cells[2])}
          </dd></div>
      </dl>
      <div className={styles.breakdowns}>{selected.breakdown.map(item => {
        const percentage = item.displayValue.includes("%") || item.label.includes("%");
        const label = item.label.replace(/\s*\(%\)\s*$/, "");
        const maximum = percentage ? 100 : Math.max(1, ...selected.breakdown.map(value => value.value));
        return <div className={styles.breakdown} data-breakdown-category={label.trim().toLowerCase()} key={item.label}>
          <span>{label}</span><strong>{item.displayValue}{percentage && !item.displayValue.includes("%") ? "%" : ""}</strong>
          <div aria-hidden="true"><i style={{ width: `${Math.min(100, item.value / maximum * 100)}%` }} /></div>
        </div>;
      })}</div>
    </section> : null}
    <figcaption className={styles.footnote}>
      <p>{presentation?.splitMode === "manual" ? "Manual" : "Median"} quadrant splits: {xLabel} {axisValue(geometry.xSplit, presentation?.xUnit)}; {yLabel} {axisValue(geometry.ySplit, presentation?.yUnit)}.</p>
      {presentation?.preset === "listening" ? <p>Current use is expanding + maintaining + scaling back. Net expansion is expanding minus scaling back. Low net expansion does not necessarily mean decline.</p> : null}
      {presentation?.note ? <p>{presentation.note}</p> : null}<p>{block.footnote}</p>
      {block.verifiedSource?.synthetic ? <p>Synthetic example data</p> : null}
    </figcaption>
  </figure>;
}

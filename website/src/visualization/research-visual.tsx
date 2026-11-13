"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import type { ResearchVisualBlock } from "./research-visual-blocks";
import styles from "./research-visual.module.css";

const classes = (...names: string[]) => names.flatMap(name => name.split(" ")).map(name => styles[name] ?? "").join(" ");
const text = (cell: string[]) => cell.join(" ");

function Paragraphs({ values, strong = false }: { values: string[]; strong?: boolean }) {
  return <>{values.map((value, index) => strong && index === 0
    ? <strong key={index}>{value}</strong> : <p key={index}>{value}</p>)}</>;
}

function Quote({ values }: { values: string[] }) {
  return <blockquote>{values.map((value, index) => {
    const opening = value.match(/^([“"])([\s\S]*)$/);
    return <p key={index}>{opening ? <><span className={styles["quote-opening"]}>{opening[1]}</span>{opening[2]}</> : value}</p>;
  })}</blockquote>;
}

function Matrix({ title, headers, rows, rowIds, className = "", widths = [], mobileHeaders = [], headerTags = false }: {
  title: string; headers: string[]; rows: ReactNode[][]; rowIds: string[];
  className?: string; widths?: string[]; mobileHeaders?: string[]; headerTags?: boolean;
}) {
  return <table className={classes("matrix", className)}>
    <caption>{title}</caption>
    <thead><tr>{headers.map((header, index) => <th key={index} scope="col" className={classes(widths[index] ?? "")}
      aria-label={mobileHeaders[index] ? header : undefined}>
      {mobileHeaders[index] ? <>
        <span className={styles["table-heading-full"]}>{header}</span>
        <span className={styles["table-heading-short"]} aria-hidden="true">{mobileHeaders[index]}</span>
      </> : headerTags ? <span className={styles["header-tag"]}>{header}</span> : header}
    </th>)}</tr></thead>
    <tbody>{rows.map((row, rowIndex) => <tr key={rowIds[rowIndex]}>{row.map((cell, index) => {
      const Cell = index === 0 ? "th" : "td";
      return <Cell key={index} scope={index === 0 ? "row" : undefined}
        className={classes(widths[index] ?? "")} data-label={headers[index]}>{cell}</Cell>;
    })}</tr>)}</tbody>
  </table>;
}

function ItemDetail({ cells, mobile = false }: { cells: string[][]; mobile?: boolean }) {
  return <details className={classes("reader-detail item-detail")}>
    <summary>{mobile ? <h3 className={styles["item-name"]}>{text(cells[0])}</h3>
      : <span className={styles["item-name"]}>{text(cells[0])}</span>}</summary>
    <div className={styles["detail-body"]}><Paragraphs values={cells[1]} /></div>
  </details>;
}

function ElementTag({ value }: { value: string }) {
  return <span className={styles["element-tag"]} data-element={value}>{value}</span>;
}

function IntentArrow() {
  return <svg className={styles["intent-arrow"]} width="24" height="24" viewBox="-6 -6 36 36"
    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="17" strokeWidth="1.3" /><path d="M4 12h16m-6-6 6 6-6 6" />
  </svg>;
}

function ResearchContent({ block }: { block: ResearchVisualBlock }) {
  const { template, columns, rows, title } = block;
  const rowIds = rows.map(row => row.id);
  switch (template) {
    case "manager-behaviors":
    case "ai-metacognition":
      return <div className={classes("framework", template === "ai-metacognition" ? "two" : "")}>
        {rows.map(row => <section key={row.id} className={styles["framework-group"]}>
          <h3 className={styles["group-heading"]}>{text(row.cells[0])}</h3>
          <ul>{row.cells[1].map((item, index) => <li key={index}>{item}</li>)}</ul>
        </section>)}
      </div>;
    case "four-is":
    case "ai-profiles":
      return <Matrix title={title} headers={columns} rowIds={rowIds} className={`responsive ${template === "ai-profiles" ? "profiles" : ""}`}
        widths={["row-key", "", ""]} rows={rows.map(row => row.cells.map((cell, index) => template === "ai-profiles" && index === 0
          ? text(cell) : <div key={index} className={styles.cell}><Paragraphs values={cell} /></div>))} />;
    case "ai-friction":
      return <div className={classes("comparison-list friction")}>{rows.map((row, index) =>
        <section key={row.id} className={styles["friction-row"]} aria-label={`Reframe ${index + 1}`}>
          <div className={styles["friction-hindrance"]}><h4 className={styles["friction-label"]}>{columns[0]}</h4><Quote values={row.cells[0]} /></div>
          <div className={styles["friction-challenge"]}><h4 className={styles["friction-label"]}>{columns[1]}</h4><Quote values={row.cells[1]} /></div>
          <div className={styles["friction-actions"]}><h4 className={styles["friction-label"]}>{columns[2]}</h4>
            <ul className={styles.recommendations}>{row.cells[2].map((value, i) => <li key={i}>{value}</li>)}</ul>
          </div>
        </section>)}</div>;
    case "manager-role-shifts":
      return <div className={classes("comparison-list managers")}>{rows.map(row =>
        <section key={row.id} className={styles["comparison-row"]}>
          <h3 className={styles["comparison-heading"]}>{text(row.cells[0])}</h3>
          <div className={styles["comparison-grid"]}>{[1, 2].map(index =>
            <div key={index} className={styles["comparison-cell"]}><h4 className={styles["field-label"]}>{columns[index]}</h4>
              <div className={styles["comparison-copy"]}><Paragraphs values={row.cells[index]} strong /></div>
            </div>)}</div>
          <div className={styles["manager-guidance"]}><h4 className={styles["guidance-heading"]}>{columns[3]}</h4>
            <div className={styles["guidance-body"]}><Paragraphs values={row.cells[3]} /></div>
          </div>
        </section>)}</div>;
    case "ai-intent":
      return <Matrix title={title} headers={columns} rowIds={rowIds} className="intent-table" headerTags
        rows={rows.map(row => row.cells.map((cell, index) => <Fragment key={index}>
          {index === 1 ? <IntentArrow /> : null}<Paragraphs values={cell} strong />
        </Fragment>))} />;
    case "industry-utilization":
      return <>
        <p className={styles["mobile-table-note"]}>Client usage (%) · change in percentage points (pp)</p>
        <Matrix title={title} headers={columns} rowIds={rowIds} className="numeric"
          widths={["row-key", "number", "number latest", "number"]}
          mobileHeaders={columns.map((label, index) => index === 1 || index === 2
            ? label.replace(/^Client usage (?=\d{4}[–-]\d{2,4}$)/, "")
            : index === 3 && label === "YoY change (pp)" ? "Change (pp)" : label)}
          rows={rows.map(row => row.cells.map((cell, index) => index === 3
            ? <span key={index} className={styles.change}>{text(cell)}</span> : text(cell)))} />
      </>;
    case "performance-barriers": {
      const barrier = (cell: string[]) => <><strong className={styles["barrier-value"]}>{cell.slice(1).join(" ").replace(/[()]/g, "")}</strong><span>{cell[0]}</span></>;
      return <>
        <Matrix title={title} headers={columns} rowIds={rowIds} className="barrier-table"
          widths={["row-key", "", "", "", ""]}
          rows={rows.map(row => [
            <span className={styles["rank-badge"]} key="rank">{text(row.cells[0])}</span>,
            ...row.cells.slice(1).map(barrier),
          ])} />
        <div className={styles["mobile-barriers"]}>{columns.slice(1).map((arrangement, index) =>
          <section key={index} className={styles["mobile-card"]}><h3>{arrangement}</h3><ol role="list">
            {rows.map(row => <li key={row.id}><span className={styles["rank-badge"]} aria-hidden="true">{text(row.cells[0])}</span>{barrier(row.cells[index + 1])}</li>)}
          </ol></section>)}</div>
      </>;
    }
    case "driver-item-usage":
      return <>
        <Matrix title={title} headers={[`${columns[0]} and ${columns[1].toLowerCase()}`, columns[2], columns[3]]}
          rowIds={rowIds} className="item-table" widths={["row-key", "element", "number usage"]}
          rows={rows.map(row => [
            <ItemDetail key="item" cells={row.cells} />,
            <ElementTag key="element" value={text(row.cells[2])} />, text(row.cells[3]),
          ])} />
        <div className={styles["mobile-items"]}>{rows.map(row => <section key={row.id} className={styles["mobile-card"]}>
          <ItemDetail cells={row.cells} mobile />
          <dl><div><dt>{columns[2]}</dt><dd><ElementTag value={text(row.cells[2])} /></dd></div>
            <div><dt>{columns[3]}</dt><dd className={styles["usage-value"]}>{text(row.cells[3])}</dd></div></dl>
        </section>)}</div>
      </>;
  }
}

export function ResearchVisual({ block }: { block: ResearchVisualBlock }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let printState: Map<HTMLDetailsElement, boolean> | undefined;
    const restore = () => {
      printState?.forEach((open, detail) => { detail.open = open; });
      printState = undefined;
    };
    const beforePrint = () => {
      if (printState) return;
      printState = new Map(Array.from(element.querySelectorAll("details"), detail => [detail, detail.open]));
      printState.forEach((_, detail) => { detail.open = true; });
    };
    const windows = new Set([window, element.ownerDocument.defaultView]);
    windows.forEach(target => {
      target?.addEventListener("beforeprint", beforePrint);
      target?.addEventListener("afterprint", restore);
    });
    return () => {
      windows.forEach(target => {
        target?.removeEventListener("beforeprint", beforePrint);
        target?.removeEventListener("afterprint", restore);
      });
      restore();
    };
  }, [block.id]);
  const variant = block.template === "manager-role-shifts" ? "visual-managers"
    : block.template === "industry-utilization" ? "visual-numeric"
    : block.template === "performance-barriers" ? "visual-barriers" : "";
  const headingId = `${block.id}-research-title`;
  return <div ref={root} className={styles.scope} data-research-template={block.template}>
    <figure className={classes("visual", variant)} aria-labelledby={headingId}>
      <header className={styles["visual-header"]}>
        <h2 className={styles.heading} id={headingId}>{block.title}</h2>
        {block.subtitle ? <p className={styles.subtitle}>{block.subtitle}</p> : null}
      </header>
      <ResearchContent block={block} />
      {block.sourceNote ? <figcaption className={styles.source}>{block.sourceNote}</figcaption> : null}
    </figure>
  </div>;
}

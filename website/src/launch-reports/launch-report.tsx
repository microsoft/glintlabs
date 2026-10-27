import type { ReactNode } from "react";
import type { ReportBlock } from "../manifest/report-manifest.ts";
import { ReportRenderer } from "../report-system/report-renderer";
import styles from "../report-system/report-renderer.module.css";
import type { getLaunchReport } from "./reports.ts";
import type { WordTextRun } from "./word-format.ts";

function SourceText({ runs }: { runs: WordTextRun[] }) {
  return runs.map((run, index) => {
    let content: ReactNode = run.text;
    if (run.bold) content = <strong>{content}</strong>;
    if (run.italic) content = <em>{content}</em>;
    if (run.superscript) content = <sup>{content}</sup>;
    return run.href ? <a href={run.href} key={index}>{content}</a> : <span key={index}>{content}</span>;
  });
}

function SourceRowHeaderTable({ block }: { block: Extract<ReportBlock, { type: "data-visual-source" }> }) {
  const rows = [block.data.columns, ...block.data.rows.map(row => row.cells)];
  return <div className={styles.accessibleData}>
    <div aria-label="Transformational leadership dimensions" className={styles.accessibleDataScroller} role="region" tabIndex={0}>
      <table aria-label="Transformational leadership dimensions">
        <tbody>{rows.map(([dimension, principle], index) => <tr key={index}>
          <th scope="row">{dimension}</th><td>{principle}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

export function LaunchReport({ report }: { report: NonNullable<ReturnType<typeof getLaunchReport>> }) {
  return <ReportRenderer
    blockOverrides={Object.fromEntries(report.manifest.blocks.flatMap(block =>
      block.type === "data-visual-source" && report.rowHeaderTableBlockIds.has(block.id)
        ? [[block.id, <SourceRowHeaderTable block={block} key={block.id} />]]
        : []))}
    coverDetails={report.coverDetails}
    coverNotice={report.privatePreview ? "Private preview — not cleared for public release" : undefined}
    figureDescriptions={report.descriptions}
    manifest={report.manifest}
    mode="read"
    orderedListBlockIds={report.orderedListBlockIds}
    referenceBlockIds={report.referenceBlockIds}
    reportStyle="new-fluent-colors"
    textOverrides={Object.fromEntries(Object.entries(report.textRuns).map(([id, runs]) => [id, <SourceText runs={runs} key={id} />]))}
  />;
}

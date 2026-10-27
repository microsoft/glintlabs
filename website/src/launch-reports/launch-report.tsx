import type { ReactNode } from "react";
import { ReportRenderer } from "../report-system/report-renderer";
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

export function LaunchReport({ report }: { report: NonNullable<ReturnType<typeof getLaunchReport>> }) {
  return <ReportRenderer
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

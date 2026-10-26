import { z } from "zod";

export const reportStyleSchema = z.enum([
  "research-report",
  "annual-report-2026",
  "new-fluent-colors",
]);

export type ReportStyle = z.infer<typeof reportStyleSchema>;

export const DEFAULT_REPORT_STYLE: ReportStyle = "research-report";
export const DEFAULT_STUDIO_REPORT_STYLE: ReportStyle = "new-fluent-colors";

export const reportStyleOptions: ReadonlyArray<{
  description: string;
  id: ReportStyle;
  label: string;
}> = [
  {
    id: "research-report",
    label: "Research report",
    description: "Editorial research-drop layout",
  },
  {
    id: "annual-report-2026",
    label: "2026 Annual Report",
    description: "Narrative hero and annual-report data styling",
  },
  {
    id: "new-fluent-colors",
    label: "New Fluent Colors",
    description: "Light editorial layout with blue, navy, pale blue, and yellow accents",
  },
];

export const selectableReportStyleOptions = reportStyleOptions.filter(
  (option) => option.id === DEFAULT_STUDIO_REPORT_STYLE,
);

export function reportStyleLabel(style: ReportStyle) {
  return (
    reportStyleOptions.find((option) => option.id === style)?.label ??
    reportStyleOptions[0].label
  );
}

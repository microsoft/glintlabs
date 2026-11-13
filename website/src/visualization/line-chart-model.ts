import { z } from "zod";
import type { ReportBlock } from "../manifest/report-manifest.ts";

export const lineChartFields = {
  type: z.literal("line-chart"),
  title: z.string().trim().min(1).max(240),
  subtitle: z.string().max(2000).default(""),
  sourceNote: z.string().max(4000).default(""),
  periods: z.array(z.object({
    id: z.string().min(1),
    label: z.string().trim().min(1).max(160),
    supportingText: z.string().max(1000).optional(),
  })).min(2).max(12),
  series: z.array(z.object({
    id: z.string().min(1),
    label: z.string().trim().min(1).max(100),
    values: z.array(z.number().finite().min(0).max(100)).min(2).max(12),
  })).min(1).max(3),
  presentation: z.object({
    title: z.string().trim().min(1).max(240),
    subtitle: z.string().max(2000).default(""),
    note: z.string().max(4000).default(""),
    palette: z.enum(["brand", "blue", "teal"]).default("brand"),
  }).optional(),
};

export type LineChartBlock = Extract<ReportBlock, { type: "line-chart" }>;

export function lineChartMatrixValid(block: {
  periods: { id: string; label: string }[];
  series: { id: string; label: string; values: number[] }[];
}) {
  const unique = (values: string[]) => new Set(values.map(value => value.trim().toLocaleLowerCase("en-US"))).size === values.length;
  return unique(block.periods.map(period => period.id)) && unique(block.periods.map(period => period.label)) &&
    unique(block.series.map(series => series.id)) && unique(block.series.map(series => series.label)) &&
    block.series.every(series => series.values.length === block.periods.length);
}

export function lineChartValue(block: LineChartBlock, periodIndex: number, seriesIndex: number) {
  const value = block.series[seriesIndex].values[periodIndex];
  const raw = block.verifiedSource?.rows[periodIndex]?.cells[seriesIndex + 1]?.replace(/%\s*$/, "").trim();
  return `${raw && Number(raw) === value ? raw : value}%`;
}

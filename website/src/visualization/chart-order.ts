import type { ChartPresentation } from "../manifest/report-manifest.ts";

export function sortChartItems<T extends { label: string; value: number }>(
  items: readonly T[],
  order?: ChartPresentation["sort"],
): T[] {
  const sorted = [...items];
  if (order === "ascending") sorted.sort((a, b) => a.value - b.value);
  if (order === "descending") sorted.sort((a, b) => b.value - a.value);
  if (order === "alphabetical") sorted.sort((a, b) => a.label.localeCompare(b.label));
  return sorted;
}

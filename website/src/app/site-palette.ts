export type SitePalette = "blue" | "legacy";

export function parseSitePalette(value: string | undefined): SitePalette {
  if (value === undefined || value === "blue") return "blue";
  if (value === "legacy") return "legacy";
  throw new Error("GLINT_LABS_SITE_PALETTE must be blue or legacy.");
}

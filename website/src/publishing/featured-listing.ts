import type { ReportManifest } from "../manifest/report-manifest.ts";

export function featuredListing(manifest: ReportManifest) {
  const heroImage = manifest.blocks.find(
    (block) => block.type === "image" && block.placement === "hero",
  );
  const description = manifest.blocks.find(
    (block) => block.type === "paragraph",
  );

  return {
    description:
      description?.type === "paragraph"
        ? description.text
        : "Evidence-based research and practical guidance from Glint Labs.",
    eyebrow:
      heroImage?.type === "image"
        ? (heroImage.eyebrow ?? "Research Drop")
        : "Research Drop",
    title: manifest.metadata.title.replace(/^research drop\s*:\s*/i, "").trim(),
  };
}

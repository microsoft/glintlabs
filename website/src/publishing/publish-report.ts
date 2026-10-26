export type PublishedReportInput = {
  css: string;
  html: string;
  publishedAt: string;
  provenance?: {
    approvedContentSha256: string;
    integrityStatus: "intact";
    sourceSha256: string;
  };
  title: string;
};

export function reportFileName(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${slug || "glint-labs-report"}.html`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function serializePublishedReport({
  css,
  html,
  publishedAt,
  provenance,
  title,
}: PublishedReportInput) {
  const safeTitle = escapeHtml(title);
  const safePublishedAt = escapeHtml(publishedAt);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <meta name="generator" content="Glint Labs Publishing Studio">
    <meta name="glint-published-at" content="${safePublishedAt}">
    ${
      provenance
        ? `<meta name="glint-source-sha256" content="${escapeHtml(provenance.sourceSha256)}">
    <meta name="glint-approved-content-sha256" content="${escapeHtml(provenance.approvedContentSha256)}">
    <meta name="glint-content-integrity" content="${provenance.integrityStatus}">`
        : ""
    }
    <title>${safeTitle} | Glint Labs</title>
    <style>
${css}
      html, body { margin: 0; min-width: 320px; }
      body { background: #fff; }
      [data-published-report] { width: 100%; overflow-x: hidden; }
      [data-published-report] > article { margin: 0 auto; }
      @media print {
        [data-published-report] { overflow: visible; }
      }
    </style>
  </head>
  <body>
    <main data-published-report>
${html}
    </main>
  </body>
</html>
`;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("A report image could not be embedded."));
      }
    });
    reader.addEventListener("error", () =>
      reject(new Error("A report image could not be embedded.")),
    );
    reader.readAsDataURL(blob);
  });
}

async function embedImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(async (image) => {
      image.removeAttribute("srcset");
      image.removeAttribute("sizes");
      const source = image.currentSrc || image.src;
      if (!source || source.startsWith("data:")) {
        return;
      }

      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`A report image could not be embedded (${response.status}).`);
      }
      image.src = await blobToDataUrl(await response.blob());
    }),
  );
}

function collectDocumentCss() {
  return Array.from(document.styleSheets)
    .map((styleSheet) => {
      try {
        return Array.from(styleSheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        throw new Error("The report styles could not be prepared for publishing.");
      }
    })
    .join("\n");
}

function copyInheritedCustomProperties(
  source: HTMLElement,
  target: HTMLElement,
) {
  const computedStyle = getComputedStyle(source);
  for (const property of computedStyle) {
    if (property.startsWith("--")) {
      target.style.setProperty(property, computedStyle.getPropertyValue(property));
    }
  }
}

export async function downloadPublishedReport({
  provenance,
  report,
  title,
}: {
  provenance?: PublishedReportInput["provenance"];
  report: HTMLElement;
  title: string;
}) {
  const clone = report.cloneNode(true) as HTMLElement;
  copyInheritedCustomProperties(report, clone);
  clone.removeAttribute("aria-hidden");
  clone.querySelectorAll("[tabindex]").forEach((element) =>
    element.removeAttribute("tabindex"),
  );
  await embedImages(clone);

  const publishedAt = new Date().toISOString();
  const html = serializePublishedReport({
    css: collectDocumentCss(),
    html: clone.outerHTML,
    publishedAt,
    provenance,
    title,
  });
  const url = URL.createObjectURL(
    new Blob([html], { type: "text/html;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.download = reportFileName(title);
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);

  return { fileName: link.download, publishedAt };
}

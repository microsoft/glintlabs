import assert from "node:assert/strict";
import test from "node:test";

import { reportManifestSchema } from "../manifest/report-manifest.ts";
import { featuredListing } from "./featured-listing.ts";
import {
  reportFileName,
  serializePublishedReport,
} from "./publish-report.ts";
import { publishedPreviewSchema } from "./published-preview.ts";

test("creates a portable report filename", () => {
  assert.equal(
    reportFileName("Listening at the speed of change"),
    "listening-at-the-speed-of-change.html",
  );
  assert.equal(reportFileName("!!!"), "glint-labs-report.html");
});

test("serializes a standalone report document safely", () => {
  const result = serializePublishedReport({
    css: ".report { color: #17213a; }",
    html: '<article class="report"><h1>Report</h1></article>',
    publishedAt: "2026-09-17T16:00:00.000Z",
    provenance: {
      approvedContentSha256: "b".repeat(64),
      integrityStatus: "intact",
      sourceSha256: "a".repeat(64),
    },
    title: 'Research <Drop> "One"',
  });

  assert.match(result, /^<!doctype html>/);
  assert.match(result, /Research &lt;Drop&gt; &quot;One&quot;/);
  assert.match(result, /data-published-report/);
  assert.match(result, /\.report \{ color: #17213a; \}/);
  assert.match(result, /<article class="report">/);
  assert.match(result, /name="glint-source-sha256" content="a{64}"/);
  assert.match(
    result,
    /name="glint-approved-content-sha256" content="b{64}"/,
  );
  assert.match(result, /name="glint-content-integrity" content="intact"/);
});

test("creates a featured homepage listing from approved report content", () => {
  const manifest = reportManifestSchema.parse({
    schemaVersion: "0.1.0",
    source: {
      fileName: "report.docx",
      sizeBytes: 100,
      sha256: "a".repeat(64),
    },
    metadata: {
      title: "Research Drop: Manager AI",
      status: "draft",
      topics: ["AI transformation", "Leadership", "Employee listening"],
    },
    blocks: [
      {
        id: "title",
        type: "heading",
        level: 1,
        text: "Manager AI",
        source: { part: "word/document.xml", index: 0 },
      },
      {
        id: "hero",
        type: "image",
        alt: "Managers collaborating",
        fileName: "hero.jpg",
        dataUrl: "data:image/jpeg;base64,AA==",
        width: 1200,
        height: 800,
        placement: "hero",
        eyebrow: "Research Drop",
        source: { part: "word/document.xml", index: 1 },
      },
      {
        id: "intro",
        type: "paragraph",
        text: "How managers can lead effectively in an AI-first workplace.",
        source: { part: "word/document.xml", index: 2 },
      },
    ],
    reviewItems: [],
    extraction: {
      paragraphCount: 2,
      imageCount: 1,
      unsupportedCount: 0,
    },
  });

  assert.deepEqual(featuredListing(manifest), {
    description:
      "How managers can lead effectively in an AI-first workplace.",
    eyebrow: "Research Drop",
    title: "Manager AI",
  });
  const legacyPreview = publishedPreviewSchema.parse({
    schemaVersion: "1",
    id: "31a6f9ce-0fc4-4af1-8f5d-e1cb61dc381d",
    manifest,
    publishedAt: "2026-09-18T22:45:00.000Z",
    thumbnail: {
      alt: "Managers collaborating",
      focalPointX: 50,
      focalPointY: 50,
      src: "data:image/jpeg;base64,AA==",
    },
  });
  assert.equal(legacyPreview.thumbnail.alt, "Managers collaborating");
  assert.equal(legacyPreview.reportStyle, "research-report");
  assert.deepEqual(legacyPreview.placement, {
    library: true,
    topics: [],
    homepage: {
      featured: true,
      featuredUntil: null,
    },
  });
  const libraryOnlyPreview = publishedPreviewSchema.parse({
    schemaVersion: "1",
    id: "31a6f9ce-0fc4-4af1-8f5d-e1cb61dc381d",
    manifest,
    placement: {
      library: true,
      topics: ["AI transformation", "Leadership"],
      homepage: {
        featured: false,
        featuredUntil: "2026-09-17",
      },
    },
    publishedAt: "2026-09-18T22:45:00.000Z",
    thumbnail: {
      alt: "Managers collaborating",
      focalPointX: 50,
      focalPointY: 50,
      src: "data:image/jpeg;base64,AA==",
    },
  });
  assert.equal(libraryOnlyPreview.placement.homepage.featured, false);

  const annualReportPreview = publishedPreviewSchema.parse({
    schemaVersion: "1",
    id: "31a6f9ce-0fc4-4af1-8f5d-e1cb61dc381d",
    manifest,
    reportStyle: "annual-report-2026",
    publishedAt: "2026-09-18T22:45:00.000Z",
    thumbnail: {
      alt: "Managers collaborating",
      focalPointX: 50,
      focalPointY: 50,
      src: "data:image/jpeg;base64,AA==",
    },
  });
  assert.equal(annualReportPreview.reportStyle, "annual-report-2026");
  const fluentPreview = publishedPreviewSchema.parse({
    ...annualReportPreview,
    reportStyle: "new-fluent-colors",
  });
  assert.equal(fluentPreview.reportStyle, "new-fluent-colors");

  const illustrationPreview = publishedPreviewSchema.parse({
    schemaVersion: "1",
    id: "31a6f9ce-0fc4-4af1-8f5d-e1cb61dc381d",
    manifest,
    placement: {
      library: true,
      topics: manifest.metadata.topics ?? [],
      homepage: {
        featured: true,
        featuredUntil: "2026-10-18",
      },
    },
    publishedAt: "2026-09-18T22:45:00.000Z",
    thumbnail: {
      alt: "",
      focalPointX: 50,
      focalPointY: 50,
      src: "/figma/illustrations/people.png",
    },
  });
  assert.equal(
    illustrationPreview.thumbnail.src,
    "/figma/illustrations/people.png",
  );
  assert.equal(publishedPreviewSchema.parse({
    ...illustrationPreview,
    thumbnail: { ...illustrationPreview.thumbnail, src: "/figma/illustrations/blue/people.png" },
  }).thumbnail.src, "/figma/illustrations/blue/people.png");

  assert.throws(() =>
    publishedPreviewSchema.parse({
      schemaVersion: "1",
      id: "31a6f9ce-0fc4-4af1-8f5d-e1cb61dc381d",
      manifest,
      placement: {
        library: true,
        topics: ["AI transformation"],
        homepage: {
          featured: true,
          featuredUntil: "2026-09-17",
        },
      },
      publishedAt: "2026-09-18T22:45:00.000Z",
      thumbnail: {
        alt: "Managers collaborating",
        focalPointX: 50,
        focalPointY: 50,
        src: "data:image/jpeg;base64,AA==",
      },
    }),
  );
  assert.throws(() =>
    publishedPreviewSchema.parse({
      schemaVersion: "1",
      id: "31a6f9ce-0fc4-4af1-8f5d-e1cb61dc381d",
      manifest,
      publishedAt: "2026-09-18T22:45:00.000Z",
      thumbnail: {
        alt: "Unapproved image",
        focalPointX: 50,
        focalPointY: 50,
        src: "data:image/jpeg;base64,BB==",
      },
    }),
  );
  assert.throws(() =>
    publishedPreviewSchema.parse({
      schemaVersion: "1",
      id: "31a6f9ce-0fc4-4af1-8f5d-e1cb61dc381d",
      manifest,
      publishedAt: "2026-09-18T22:45:00.000Z",
      thumbnail: {
        alt: "",
        focalPointX: 50,
        focalPointY: 50,
        src: "/uploads/unapproved-thumbnail.png",
      },
    }),
  );
});

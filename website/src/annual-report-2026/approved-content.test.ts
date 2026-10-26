import assert from "node:assert/strict";
import test from "node:test";

import { reportManifestSchema } from "../manifest/report-manifest.ts";
import approvedContent from "./approved-content.json" with { type: "json" };
import {
  listeningApproaches,
  listeningTopics,
} from "./annual-report-data.ts";

const manifest = reportManifestSchema.parse(approvedContent);

test("annual report content preserves the approved Word source", () => {
  assert.equal(
    manifest.source.sha256,
    "3ce32b3c7b95945a4b97507c9bfd465e5cc55486bf91b8688c2da890c72def14",
  );
  assert.equal(manifest.metadata.title, "The next generation of employee listening");
  assert.equal(manifest.blocks.length, 243);
});

test("annual report content preserves the complete section sequence", () => {
  const headings = manifest.blocks
    .filter((block) => block.type === "heading" && block.level <= 2)
    .map((block) => block.text);

  assert.deepEqual(headings, [
    "The next generation of employee listening",
    "Listening at the speed of change",
    "Where employee listening stands today",
    "What employee listening needs to accomplish now",
    "Building a listening agenda that can evolve",
    "Three assumptions to reconsider",
    "The right-fit listening system",
    "AI raises the stakes for right-fit listening",
    "Human judgment needs a job description",
    "Lead the system, not the survey",
  ]);
});

test("approved bitmap evidence remains available as source provenance", () => {
  const images = manifest.blocks.filter((block) => block.type === "image");

  assert.equal(images.length, 2);
  for (const image of images) {
    assert.match(image.dataUrl, /^\/annual-report-2026\/word-assets\//);
    assert.ok(image.alt.length > 40);
    assert.match(image.sourceAssetSha256 ?? "", /^[a-f0-9]{64}$/);
  }
});

test("coded report visuals preserve the canonical listening datasets", () => {
  assert.equal(listeningApproaches.length, 15);
  assert.deepEqual(listeningApproaches[0].values, [1, 5, 69, 25]);
  assert.deepEqual(listeningApproaches[8].values, [17, 0, 19, 64]);

  assert.equal(listeningTopics.length, 17);
  assert.deepEqual(
    listeningTopics.find((topic) => topic.name.startsWith("AI and technology")),
    {
      name: "AI and technology tools adoption and impact",
      past: 14,
      future: 1,
    },
  );
});

test("critical approved statistics and response evidence remain intact", () => {
  const text = JSON.stringify(manifest.blocks);

  for (const requiredEvidence of [
    "Only 22.3%",
    "Eighty-three percent",
    "Only 43%",
    "AI and automation literacy ranks first at 41%",
    "consultative and advisory skills at 39%",
    "advanced AI skills at 38%",
    "Only 38% of managers",
    "Yet 79% of managers",
    "Seventy-five percent of employees",
    "Observable behavior to measure",
  ]) {
    assert.ok(text.includes(requiredEvidence), requiredEvidence);
  }
});

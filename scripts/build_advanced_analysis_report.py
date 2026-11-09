"""Render already-validated aggregate diagnostics; never train models here."""

from __future__ import annotations

import csv
import io
import json
import zipfile
from pathlib import Path

from run_advanced_survey_analysis import file_hash, validate, write_json

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "skills/analyze-survey-advanced/references/report.html"
CODE_ARTIFACTS = ("experiment-template.json", "experiment.ipynb", "reproduce.py")


def build_report(output: Path, manifest: dict) -> None:
    write_json(output / "model-diagnostics.json", manifest["summary"])
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["model", "method", "metric", "validation", "fold_std", "holdout"])
    for row in manifest["summary"].get("models", []):
        for metric, value in row["validation"].items():
            writer.writerow([
                row["candidate"]["id"], row["candidate"]["method"], metric, value,
                row["fold_std"][metric], row.get("holdout", {}).get(metric, ""),
            ])
    (output / "model-comparison.csv").write_text(stream.getvalue(), encoding="utf-8")
    (output / "SHARING_README.txt").write_text(
        "Open OPEN_REPORT.html locally. This package contains aggregate diagnostics and clean code only.\n"
        "Reproduction requires the complete plugin, its pinned advanced runtime, your private inputs,\n"
        "and fresh explicit approval. The notebook has not executed in this package.\n"
        "No raw rows, fitted estimators, split membership, private company context, or row predictions are included.\n"
        "Review organizational permission before sharing. Aggregation does not guarantee anonymity.\n",
        encoding="utf-8",
    )
    artifact_names = (*CODE_ARTIFACTS, "model-diagnostics.json", "model-comparison.csv", "SHARING_README.txt")
    manifest["artifacts"] = [
        {"path": name, "sha256": file_hash(output / name), "classification": "aggregate-share"}
        for name in artifact_names
    ]
    validate(manifest, "advanced-analysis-manifest.schema.json")
    write_json(output / "advanced-analysis-manifest.json", manifest)
    payload = json.dumps(manifest, allow_nan=False).replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
    html = TEMPLATE.read_text(encoding="utf-8").replace("__AGGREGATE_PAYLOAD__", payload)
    (output / "advanced-report.html").write_text(html, encoding="utf-8")
    with zipfile.ZipFile(output / "advanced-share.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("OPEN_REPORT.html", html)
        for name in (*artifact_names, "advanced-analysis-manifest.json"):
            archive.write(output / name, name)

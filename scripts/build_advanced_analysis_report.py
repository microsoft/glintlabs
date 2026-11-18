"""Render already-validated aggregate diagnostics; never train models here."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path

from run_advanced_survey_analysis import digest, file_hash, validate, write_json

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "skills/analyze-survey-advanced/references/report.html"
CODE_ARTIFACTS = ("experiment-template.json", "experiment.ipynb", "reproduce.py")


def validate_item_assessment_source(manifest: dict, assessment: dict) -> None:
    if (
        manifest["status"] != "completed"
        or manifest["qa"]["repeatability"] != "passed"
        or manifest["qa"]["verdict"] == "Not ready"
        or manifest["summary"].get("task") != "svd"
        or not manifest["summary"].get("svd")
    ):
        raise ValueError("Question review requires completed, QA-eligible SVD diagnostics.")
    if (
        assessment["config_sha256"] != manifest["config_sha256"]
        or assessment["summary_sha256"] != digest(manifest["summary"])
    ):
        raise ValueError("Question review is stale; review the current configuration and diagnostics.")


def validate_item_candidates(manifest: dict, candidates: dict) -> None:
    validate(candidates, "advanced-item-candidates.schema.json")
    validate_item_assessment_source(manifest, candidates)
    features = set(manifest["summary"]["svd"]["features"])
    questions = [item["question"] for item in candidates["items"]]
    if len(set(questions)) != len(questions) or not set(questions).issubset(features):
        raise ValueError("Candidates must be distinct fitted questions.")
    protected = set(candidates["protected_items"])
    if "item_review" in manifest:
        validate_item_review(manifest, manifest["item_review"])
        protected.update(manifest["item_review"]["protected_items"])
    if not protected.issubset(features) or protected.intersection(questions):
        raise ValueError("Protected questions must be fitted items and cannot be removal candidates.")
    for item in candidates["items"]:
        comparison = item.get("comparison_question")
        if comparison is not None and (comparison not in features or comparison in questions):
            raise ValueError("Comparison questions must be fitted items outside the candidate shortlist.")
    pairs = set()
    for lead in candidates.get("pair_leads", []):
        pair = frozenset(lead["questions"])
        if not pair.issubset(features) or pair in pairs:
            raise ValueError("Pair leads must be distinct unordered pairs of fitted questions.")
        if pair.issubset(protected):
            raise ValueError("A pair with both questions protected cannot be a removal-review lead.")
        pairs.add(pair)


def validate_item_review(manifest: dict, review: dict) -> None:
    validate(review, "advanced-item-review.schema.json")
    validate_item_assessment_source(manifest, review)
    features = set(manifest["summary"]["svd"]["features"])
    items = {item["question"]: item for item in review["items"]}
    if len(items) != len(review["items"]) or set(items) != features:
        raise ValueError("Question review must assess every fitted item exactly once, with no unknown items.")
    protected = set(review["protected_items"])
    if not protected.issubset(features):
        raise ValueError("Protected questions must belong to the fitted item set.")
    if any(item["decision"] == "remove" for item in items.values()) and not review.get("proposed_set_evidence", "").strip():
        raise ValueError("Removal recommendations require evidence for the final proposed question set.")
    for question, item in items.items():
        if not item["reason"].strip():
            raise ValueError("Every question needs a meaningful review reason.")
        if question in protected and item["decision"] != "retain":
            raise ValueError("Protected questions must be retained.")
        if item["decision"] == "remove":
            alternative = item.get("retained_alternative")
            if alternative == question or alternative not in items or items[alternative]["decision"] != "retain":
                raise ValueError("A removal needs an explicitly retained alternative; do not remove both representatives.")
            for field in ("redundancy_evidence", "coverage_evidence", "stability_evidence"):
                if not item.get(field, "").strip():
                    raise ValueError(f"A removal recommendation requires {field}.")


def build_report(output: Path, manifest: dict, *, include_report: bool = True) -> None:
    validate(manifest, "advanced-analysis-manifest.schema.json")
    review_artifacts = ()
    if "item_review" in manifest:
        validate_item_review(manifest, manifest["item_review"])
    if "item_candidates" in manifest:
        validate_item_candidates(manifest, manifest["item_candidates"])
    if "item_review" in manifest:
        write_json(output / "question-removal-review.json", manifest["item_review"])
        review_artifacts = ("question-removal-review.json",)
    if "item_candidates" in manifest:
        write_json(output / "question-removal-candidates.json", manifest["item_candidates"])
        review_artifacts += ("question-removal-candidates.json",)
    write_json(output / "model-diagnostics.json", manifest["summary"])
    artifact_names = (*CODE_ARTIFACTS, "model-diagnostics.json", *review_artifacts)
    if include_report:
        (output / "SHARING_README.txt").write_text(
            "Open OPEN_REPORT.html locally. This package contains aggregate diagnostics and clean code only.\n"
            "Reproduction requires the complete plugin, its pinned advanced runtime, your private inputs,\n"
            "and fresh explicit approval. The notebook has not executed in this package.\n"
            "No raw rows, fitted estimators, split membership, private company context, or row predictions are included.\n"
            "Review organizational permission before sharing. Aggregation does not guarantee anonymity.\n",
            encoding="utf-8",
        )
        artifact_names += ("SHARING_README.txt",)
    manifest["artifacts"] = [
        {"path": name, "sha256": file_hash(output / name), "classification": "aggregate-share"}
        for name in artifact_names
    ]
    validate(manifest, "advanced-analysis-manifest.schema.json")
    write_json(output / "advanced-analysis-manifest.json", manifest)
    if not include_report:
        return
    payload = json.dumps(manifest, allow_nan=False).replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e")
    has_svd = bool(manifest["summary"].get("svd"))
    container, heading = ("div", "h3") if has_svd else ("section", "h2")
    interpretation = (
        f'<{container} id="interpretation"><{heading}>People Science interpretation</{heading}>'
        f'<div id="narrative"></div></{container}>'
    )
    html = (
        TEMPLATE.read_text(encoding="utf-8")
        .replace("__SVD_INTERPRETATION__", interpretation if has_svd else "")
        .replace("__NOT_RUN_INTERPRETATION__", "" if has_svd else interpretation)
        .replace("__AGGREGATE_PAYLOAD__", payload)
    )
    (output / "advanced-report.html").write_text(html, encoding="utf-8")
    with zipfile.ZipFile(output / "advanced-share.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("OPEN_REPORT.html", html)
        for name in (*artifact_names, "advanced-analysis-manifest.json"):
            archive.write(output / name, name)

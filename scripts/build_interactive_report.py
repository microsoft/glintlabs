#!/usr/bin/env python
"""Build the required interactive Glint report from a completed analysis."""

from __future__ import annotations

import argparse
import json
import math
import re
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd
from scipy.stats import t as student_t


MIN_N = 5
RELATIONSHIP_MIN_N = 30
ALERT_MIN_N = 10
FILTERED_ALERT_MIN_N = 5


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--output-dir", required=True)
    return parser.parse_args()


def resolve(base: Path, value: str | None) -> Path | None:
    if not value:
        return None
    path = Path(value)
    return path if path.is_absolute() else (base / path).resolve()


def label(value: str) -> str:
    return re.sub(r"\s+", " ", value.removeprefix("Q_").replace("_", " ")).title()


def normalize_items(frame: pd.DataFrame, questions: list[str], scale: int) -> None:
    for question in questions:
        values = sorted(frame[question].dropna().unique())
        if values and (min(values) < 1 or max(values) > scale):
            if len(values) > scale:
                raise ValueError(f"{question} has more than {scale} response values.")
            mapping = {value: index + 1 for index, value in enumerate(values)}
            frame[question] = frame[question].map(mapping)


def bucket_numeric(frame: pd.DataFrame, protected: set[str]) -> dict[str, list[str]]:
    def bucket_label(item: Any) -> str | None:
        if not hasattr(item, "left"):
            return None
        return f"{math.floor(item.left) + 1}-{math.floor(item.right)}"

    bucketed = {}
    for column in frame.select_dtypes(include="number").columns:
        if column in protected or frame[column].nunique(dropna=True) <= 10:
            continue
        values = frame[column]
        if values.min() == 0 and float((values == 0).mean()) >= 0.2:
            positive = values[values > 0]
            cuts = pd.qcut(positive, 4, duplicates="drop")
            mapped = pd.Series("0", index=frame.index, dtype="object")
            mapped.loc[positive.index] = cuts.map(bucket_label).astype("object")
        else:
            cuts = pd.qcut(values, 5, duplicates="drop")
            mapped = cuts.map(bucket_label).astype("object")
        frame[column] = mapped
        bucketed[column] = sorted(frame[column].dropna().astype(str).unique())
    return bucketed


def metrics(frame: pd.DataFrame, questions: list[str]) -> list[list[float | int]]:
    rows = []
    for question in questions:
        values = frame[question].dropna()
        rows.append(
            [
                int(round((values.mean() - 1) * 25)),
                round(float((values <= 2).mean() * 100), 1),
                round(float((values == 3).mean() * 100), 1),
                round(float((values >= 4).mean() * 100), 1),
                int(len(values)),
            ]
        )
    return rows


def segment_cube(
    frame: pd.DataFrame, questions: list[str], attributes: list[str]
) -> dict[str, Any]:
    result = {}
    for attribute in attributes:
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute, sort=True):
            employees = group["__employee_id"].nunique()
            if employees >= MIN_N:
                values[str(value)] = {
                    "n": int(employees),
                    "items": metrics(group, questions),
                }
        result[attribute] = {"label": label(attribute), "values": values}
    return result


def cycle_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None,
) -> dict[str, Any]:
    if not cycle_col:
        return {"cycles": [], "overall": {}, "segments": {}}
    cycles = sorted(frame[cycle_col].dropna().astype(str).unique())
    if len(cycles) != 2:
        return {"cycles": cycles, "overall": {}, "segments": {}}
    overall = {
        cycle: {
            "n": int(len(group)),
            "items": metrics(group, questions),
        }
        for cycle, group in frame.groupby(cycle_col)
    }
    segments = {}
    for attribute in attributes:
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute):
            cycle_values = {}
            for cycle in cycles:
                subset = group[group[cycle_col].astype(str) == cycle]
                if len(subset) >= MIN_N:
                    cycle_values[cycle] = {
                        "n": int(len(subset)),
                        "items": metrics(subset, questions),
                    }
            if len(cycle_values) == 2:
                values[str(value)] = cycle_values
        segments[attribute] = values
    return {"cycles": cycles, "overall": overall, "segments": segments}


def correlation_rows(frame: pd.DataFrame, questions: list[str]) -> list[list[Any]]:
    n = len(frame)
    matrix = frame[questions].corr()
    rows = []
    for first in range(len(questions)):
        for second in range(first + 1, len(questions)):
            r = float(matrix.iloc[first, second])
            if not math.isfinite(r):
                continue
            statistic = r * math.sqrt((n - 2) / max(1e-12, 1 - r * r))
            p = float(2 * student_t.sf(abs(statistic), n - 2))
            rows.append([first, second, round(r, 6), p, n])
    return rows


def relationship_cube(
    frame: pd.DataFrame, questions: list[str], attributes: list[str]
) -> dict[str, Any]:
    result = {"overall": correlation_rows(frame, questions), "segments": {}}
    for attribute in attributes:
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute):
            if len(group) >= RELATIONSHIP_MIN_N:
                rows = correlation_rows(group, questions)
                if len(rows) == len(questions) * (len(questions) - 1) // 2:
                    values[str(value)] = rows
        result["segments"][attribute] = values
    return result


def heatmap_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None,
) -> dict[str, Any]:
    if not cycle_col:
        return {"cycles": [], "attributes": [], "overall": {}, "filtered": {}}
    eligible = [
        attribute
        for attribute in attributes
        if 4 <= frame[attribute].nunique(dropna=True) <= 5 and attribute != cycle_col
    ]
    cycles = sorted(frame[cycle_col].dropna().astype(str).unique())

    def build(source: pd.DataFrame) -> dict[str, Any]:
        output = {}
        for cycle in cycles:
            cycle_frame = source[source[cycle_col].astype(str) == cycle]
            attrs = {}
            for attribute in eligible:
                values = []
                for value, group in cycle_frame.dropna(subset=[attribute]).groupby(attribute):
                    if len(group) >= MIN_N:
                        values.append(
                            {
                                "value": str(value),
                                "n": int(len(group)),
                                "items": metrics(group, questions),
                            }
                        )
                if 4 <= len(values) <= 5:
                    attrs[attribute] = {"label": label(attribute), "values": values}
            if attrs:
                output[cycle] = attrs
        return output

    filtered = {}
    for parent in attributes:
        values = {}
        for value, group in frame.dropna(subset=[parent]).groupby(parent):
            built = build(group)
            if built:
                values[str(value)] = built
        filtered[parent] = values
    return {"cycles": cycles, "attributes": eligible, "overall": build(frame), "filtered": filtered}


def alerts(
    frame: pd.DataFrame,
    questions: list[str],
    cycle_col: str | None,
    team_col: str | None,
    minimum: int,
) -> list[dict[str, Any]]:
    if not cycle_col or not team_col:
        return []
    cycles = sorted(frame[cycle_col].dropna().astype(str).unique())
    if len(cycles) != 2:
        return []
    output = []
    for team, group in frame.dropna(subset=[team_col]).groupby(team_col):
        subsets = [group[group[cycle_col].astype(str) == cycle] for cycle in cycles]
        if any(len(item) < minimum for item in subsets):
            continue
        first, second = [metrics(item, questions) for item in subsets]
        first_scores = [item[0] for item in first]
        second_scores = [item[0] for item in second]
        deltas = [b - a for a, b in zip(first_scores, second_scores)]
        worst = min(range(len(deltas)), key=deltas.__getitem__)
        output.append(
            {
                "team": str(team),
                "from": round(sum(first_scores) / len(first_scores)),
                "to": round(sum(second_scores) / len(second_scores)),
                "delta": round(sum(second_scores) / len(second_scores))
                - round(sum(first_scores) / len(first_scores)),
                "nFrom": len(subsets[0]),
                "nTo": len(subsets[1]),
                "declining": sum(value < 0 for value in deltas),
                "worstQuestion": worst,
                "worstDelta": deltas[worst],
            }
        )
    return sorted(output, key=lambda item: (item["delta"], item["worstDelta"]))


def alert_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None,
    team_col: str | None,
) -> dict[str, Any]:
    filtered = {}
    for attribute in attributes:
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute):
            rows = alerts(
                group,
                questions,
                cycle_col,
                team_col,
                FILTERED_ALERT_MIN_N,
            )
            if rows:
                values[str(value)] = rows
        filtered[attribute] = values
    return {
        "overall": alerts(frame, questions, cycle_col, team_col, ALERT_MIN_N),
        "filtered": filtered,
        "available": bool(cycle_col and team_col),
    }


def html_page(data: dict[str, Any]) -> str:
    encoded = json.dumps(data, separators=(",", ":")).replace("<", "\\u003c")
    template_path = (
        Path(__file__).resolve().parents[1]
        / "references"
        / "skills"
        / "analyze-survey"
        / "golden-report.html"
    )
    template = template_path.read_text(encoding="utf-8")
    marker = "<script>const D="
    payload_start = template.index(marker) + len(marker)
    payload_end = template.index(";\nconst names=", payload_start)
    return template[:payload_start] + encoded + template[payload_end:]


def main() -> int:
    options = args()
    config_path = Path(options.config).resolve()
    output = Path(options.output_dir).resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    manifest = json.loads((output / "analysis-manifest.json").read_text(encoding="utf-8"))
    if manifest["repeatability_check"]["status"] != "passed":
        raise ValueError("Interactive report requires a passed repeatability check.")

    survey_path = resolve(config_path.parent, config["survey_csv"])
    frame = pd.read_csv(survey_path)
    questions = config.get("question_cols") or pd.read_csv(output / "descriptives.csv")[
        "question"
    ].tolist()
    normalize_items(frame, questions, int(config["scale_points"]))
    emp_id = config["emp_id_col"]
    frame["__employee_id"] = frame[emp_id]

    attribute_file = resolve(config_path.parent, config.get("attribute_file"))
    joined_attribute_cols: list[str] = []
    if attribute_file:
        attribute_frame = pd.read_csv(attribute_file)
        joined_attribute_cols = [
            column for column in attribute_frame.columns if column != emp_id
        ]
        frame = frame.merge(
            attribute_frame,
            on=emp_id,
            how="left",
            validate="many_to_one",
        )

    configured = config.get("attribute_cols") or []
    attributes = list(dict.fromkeys([
        *configured,
        *joined_attribute_cols,
        *(
            column
            for column in (
                "client_uuid",
                "survey_cycle_title",
                "after_hours_collab",
                "internal_network_size",
                "meeting_hours",
            )
            if column in frame.columns
        ),
    ]))
    attributes = [column for column in attributes if column in frame.columns]
    bucket_numeric(frame, {emp_id, "__employee_id", *questions})
    cycle_col = "survey_cycle_title" if "survey_cycle_title" in frame.columns else None
    team_col = next(
        (column for column in ("team_id", "manager_id", "Manager ID") if column in frame.columns),
        None,
    )

    overall = metrics(frame, questions)
    segments = segment_cube(frame, questions, attributes)
    cycles = cycle_cube(frame, questions, attributes, cycle_col)
    relationships = relationship_cube(frame, questions, attributes)
    heat = heatmap_cube(frame, questions, attributes, cycle_col)
    alert_data = alert_cube(frame, questions, attributes, cycle_col, team_col)
    factors_path = output / "factor_analysis_summary.csv"
    factors = pd.read_csv(factors_path).to_dict("records") if factors_path.exists() else []
    attrition_status = next(
        (
            item.get("message", item["status"])
            for item in manifest["analyses"]
            if item["name"] == "attrition"
        ),
        "Attrition analysis was not requested.",
    )
    report_name = f"{output.name}-report.html"
    zip_name = f"{output.name}-share.zip"
    manifest["report_generation"] = {
        "status": "completed",
        "report": report_name,
        "share_zip": zip_name,
        "format_contract": "references/skills/analyze-survey/interactive-report-contract.md",
    }
    (output / "analysis-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    excluded_downloads = {survey_path.name}
    if attribute_file:
        excluded_downloads.add(attribute_file.name)
    downloads = sorted(
        path.name
        for path in output.iterdir()
        if path.is_file() and path.suffix.lower() in {".csv", ".json"}
        and path.name not in excluded_downloads
    )
    data = {
        "questions": questions,
        "labels": {question: label(question) for question in questions},
        "overall": overall,
        "segments": segments,
        "cycles": cycles,
        "relationships": relationships,
        "heat": heat,
        "alerts": alert_data,
        "factors": factors,
        "attrition": attrition_status,
        "downloads": downloads,
    }
    report_path = output / report_name
    report_path.write_text(html_page(data), encoding="utf-8")

    readme = output / "SHARING_README.txt"
    readme.write_text(
        "Extract this ZIP and open OPEN_REPORT.html. Raw respondent files are excluded.\n",
        encoding="utf-8",
    )
    zip_path = output / zip_name
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.write(report_path, "OPEN_REPORT.html")
        archive.write(readme, readme.name)
        for name in downloads:
            archive.write(output / name, name)
    print(json.dumps({"report": str(report_path), "share_zip": str(zip_path)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

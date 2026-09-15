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

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import cut_tree, linkage
from scipy.spatial.distance import squareform
from scipy.stats import t as student_t


MIN_N = 5
RELATIONSHIP_MIN_N = 30
ALERT_MIN_N = 20
FILTERED_ALERT_MIN_N = 20


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
        return {
            "cycles": [],
            "overall": {},
            "segments": {},
            "repeat": {"overall": {}, "segments": {}},
        }
    cycles = list(dict.fromkeys(frame[cycle_col].dropna().astype(str)))

    def cycle_metrics(source: pd.DataFrame) -> list[list[float | int]]:
        rows = []
        for question in questions:
            values = source[question].dropna()
            rows.append(
                [
                    round(float((values.mean() - 1) * 25), 1),
                    round(float(values.std(ddof=1) * 25), 1),
                    int(len(values)),
                ]
            )
        return rows

    def cycle_values(source: pd.DataFrame) -> dict[str, Any]:
        return {
            cycle: {
                "n": int(len(group)),
                "items": cycle_metrics(group),
            }
            for cycle, group in source.groupby(cycle_col, sort=False)
            if len(group) >= MIN_N
        }

    def repeat_values(source: pd.DataFrame) -> dict[str, Any]:
        employee_ids = {
            cycle: set(
                source.loc[
                    source[cycle_col].astype(str) == cycle,
                    "__employee_id",
                ].dropna()
            )
            for cycle in cycles
        }
        pairs = {}
        for old_index, old_cycle in enumerate(cycles):
            for new_cycle in cycles[old_index + 1:]:
                repeat_ids = employee_ids[old_cycle] & employee_ids[new_cycle]
                if len(repeat_ids) < MIN_N:
                    continue
                pair = {}
                for cycle in (old_cycle, new_cycle):
                    subset = source[
                        (source[cycle_col].astype(str) == cycle)
                        & source["__employee_id"].isin(repeat_ids)
                    ]
                    pair[cycle] = {
                        "n": int(len(subset)),
                        "items": cycle_metrics(subset),
                    }
                pairs[f"{old_cycle}\u241f{new_cycle}"] = pair
        return pairs

    overall = cycle_values(frame)
    segments = {}
    repeat_segments = {}
    for attribute in attributes:
        values = {}
        repeat_attribute_values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute, sort=True):
            group_cycles = cycle_values(group)
            if len(group_cycles) >= 2:
                values[str(value)] = group_cycles
                repeated = repeat_values(group)
                if repeated:
                    repeat_attribute_values[str(value)] = repeated
        segments[attribute] = values
        repeat_segments[attribute] = repeat_attribute_values
    return {
        "cycles": cycles,
        "overall": overall,
        "segments": segments,
        "repeat": {
            "overall": repeat_values(frame),
            "segments": repeat_segments,
        },
    }


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


def silhouette_score(distance: np.ndarray, assignments: np.ndarray) -> float:
    scores = []
    for index, cluster in enumerate(assignments):
        same = np.flatnonzero(assignments == cluster)
        other_clusters = np.unique(assignments[assignments != cluster])
        if len(same) <= 1 or len(other_clusters) == 0:
            scores.append(0.0)
            continue
        within = float(distance[index, same[same != index]].mean())
        nearest = min(
            float(distance[index, assignments == other].mean())
            for other in other_clusters
        )
        denominator = max(within, nearest)
        scores.append((nearest - within) / denominator if denominator else 0.0)
    return float(np.mean(scores))


def cluster_plan(rows: list[list[Any]], question_count: int) -> dict[str, Any]:
    if question_count < 4:
        return {"recommended": None, "scores": {}, "assignments": {}}
    correlation = np.eye(question_count)
    for first, second, value, _, _ in rows:
        correlation[int(first), int(second)] = float(value)
        correlation[int(second), int(first)] = float(value)
    distance = np.clip(1 - correlation, 0, 1)
    tree = linkage(squareform(distance, checks=False), method="average")
    maximum = min(15, question_count - 1)
    scores: dict[str, float] = {}
    assignments: dict[str, list[int]] = {}
    for cluster_count in range(3, maximum + 1):
        labels = cut_tree(tree, n_clusters=[cluster_count]).reshape(-1)
        remap = {
            value: index
            for index, value in enumerate(
                sorted(np.unique(labels), key=lambda value: int(np.flatnonzero(labels == value)[0]))
            )
        }
        normalized = np.array([remap[value] for value in labels], dtype=int)
        assignments[str(cluster_count)] = normalized.tolist()
        scores[str(cluster_count)] = round(
            silhouette_score(distance, normalized), 4
        )
    recommended = max(
        (int(value) for value in scores),
        key=lambda value: (scores[str(value)], -value),
    )
    return {
        "recommended": recommended,
        "scores": scores,
        "assignments": assignments,
    }


def relationship_cube(
    frame: pd.DataFrame, questions: list[str], attributes: list[str]
) -> dict[str, Any]:
    overall = correlation_rows(frame, questions)
    result = {
        "overall": overall,
        "segments": {},
        "clusters": {
            "overall": cluster_plan(overall, len(questions)),
            "segments": {},
        },
    }
    for attribute in attributes:
        values = {}
        cluster_values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute):
            if len(group) >= RELATIONSHIP_MIN_N:
                rows = correlation_rows(group, questions)
                if len(rows) == len(questions) * (len(questions) - 1) // 2:
                    values[str(value)] = rows
                    cluster_values[str(value)] = cluster_plan(rows, len(questions))
        result["segments"][attribute] = values
        result["clusters"]["segments"][attribute] = cluster_values
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
) -> dict[str, Any]:
    if not cycle_col or not team_col:
        return {"rows": [], "suppressed": 0, "cycles": [], "companyChange": None}
    cycles = sorted(frame[cycle_col].dropna().astype(str).unique())
    if len(cycles) != 2:
        return {"rows": [], "suppressed": 0, "cycles": cycles, "companyChange": None}

    def composite(source: pd.DataFrame) -> pd.Series:
        return (source[questions].mean(axis=1) - 1) * 25

    def comparison(first: pd.Series, second: pd.Series) -> tuple[float, float]:
        first = first.dropna()
        second = second.dropna()
        change = float(second.mean() - first.mean())
        if len(first) < 2 or len(second) < 2:
            return change, 1.0
        denominator = math.sqrt(
            first.var(ddof=1) / len(first) + second.var(ddof=1) / len(second)
        )
        if not math.isfinite(denominator) or denominator == 0:
            return change, 1.0
        statistic = change / denominator
        first_term = first.var(ddof=1) / len(first)
        second_term = second.var(ddof=1) / len(second)
        degrees = (first_term + second_term) ** 2 / (
            first_term**2 / (len(first) - 1)
            + second_term**2 / (len(second) - 1)
        )
        return change, float(2 * student_t.sf(abs(statistic), degrees))

    company_subsets = [
        frame[frame[cycle_col].astype(str) == cycle] for cycle in cycles
    ]
    company_change, _ = comparison(
        composite(company_subsets[0]),
        composite(company_subsets[1]),
    )
    output = []
    suppressed = 0
    decline_threshold = max(3, math.ceil(len(questions) * 0.25))
    for team, group in frame.dropna(subset=[team_col]).groupby(team_col):
        subsets = [group[group[cycle_col].astype(str) == cycle] for cycle in cycles]
        if any(len(item) < minimum for item in subsets):
            suppressed += 1
            continue
        first_scores = [
            round(float((subsets[0][question].mean() - 1) * 25), 1)
            for question in questions
        ]
        second_scores = [
            round(float((subsets[1][question].mean() - 1) * 25), 1)
            for question in questions
        ]
        deltas = [b - a for a, b in zip(first_scores, second_scores)]
        change, p_value = comparison(composite(subsets[0]), composite(subsets[1]))
        adjusted = change - company_change
        declining = sum(value < 0 for value in deltas)
        if adjusted <= -3 and p_value < 0.05 and declining >= decline_threshold:
            severity = "critical"
        elif adjusted <= -2 or (change <= -3 and declining >= 3):
            severity = "watch"
        elif adjusted >= 3 and p_value < 0.05:
            severity = "improving"
        else:
            severity = "stable"
        item_changes = sorted(
            (
                {
                    "question": index,
                    "from": first_scores[index],
                    "to": second_scores[index],
                    "delta": round(delta, 1),
                }
                for index, delta in enumerate(deltas)
            ),
            key=lambda item: item["delta"],
        )
        output.append(
            {
                "team": (
                    str(int(team))
                    if isinstance(team, (int, float, np.integer, np.floating))
                    and float(team).is_integer()
                    else str(team)
                ),
                "severity": severity,
                "from": round(float(composite(subsets[0]).mean()), 1),
                "to": round(float(composite(subsets[1]).mean()), 1),
                "delta": round(change, 1),
                "companyChange": round(company_change, 1),
                "adjustedDelta": round(adjusted, 1),
                "pValue": p_value,
                "significant": p_value < 0.05,
                "nFrom": len(subsets[0]),
                "nTo": len(subsets[1]),
                "declining": declining,
                "topDeclines": item_changes[:5],
            }
        )
    rank = {"critical": 0, "watch": 1, "improving": 2, "stable": 3}
    return {
        "rows": sorted(
            output,
            key=lambda item: (
                rank[item["severity"]],
                item["adjustedDelta"],
                item["delta"],
            ),
        ),
        "suppressed": suppressed,
        "cycles": cycles,
        "companyChange": round(company_change, 1),
        "minimum": minimum,
        "declineThreshold": decline_threshold,
    }


def alert_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None,
    team_col: str | None,
) -> dict[str, Any]:
    filtered = {}
    for attribute in attributes:
        if attribute in {cycle_col, team_col}:
            filtered[attribute] = {}
            continue
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute):
            result = alerts(
                group,
                questions,
                cycle_col,
                team_col,
                FILTERED_ALERT_MIN_N,
            )
            if result["rows"] or result["suppressed"]:
                values[str(value)] = result
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
    cycle_col = "survey_cycle_title" if "survey_cycle_title" in frame.columns else None
    team_col = next(
        (column for column in ("team_id", "manager_id", "Manager ID") if column in frame.columns),
        None,
    )
    bucket_numeric(frame, {emp_id, "__employee_id", *questions, team_col})

    overall = metrics(frame, questions)
    segments = segment_cube(frame, questions, attributes)
    cycles = cycle_cube(frame, questions, attributes, cycle_col)
    relationships = relationship_cube(frame, questions, attributes)
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

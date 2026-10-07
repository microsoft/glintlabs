#!/usr/bin/env python
"""Build the required interactive Glint report from a completed analysis."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
import time
import zipfile
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

SCRIPT_DIR = str(Path(__file__).resolve().parent)
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from progress import ProgressReporter
from scipy.cluster.hierarchy import cut_tree, linkage
from scipy.spatial.distance import squareform
from scipy.stats import fisher_exact
from scipy.stats import t as student_t


MIN_N = 5
RELATIONSHIP_MIN_N = 30
ROUND_HALF_UP_NEAREST_WHOLE = Decimal("1")


def round_half_up(value: float) -> int:
    """Round to the nearest whole number, rounding ties up (never banker's rounding).

    Matches the Glint primary-metric methodology: "rounds to the nearest
    integer, rounding up on ties" (e.g. 67.5 -> 68, not 68 or 67 depending on
    even/odd parity). Python's built-in ``round()`` uses round-half-to-even,
    which does not satisfy this rule, so scores must go through this helper.
    """
    return int(Decimal(str(value)).quantize(ROUND_HALF_UP_NEAREST_WHOLE, rounding=ROUND_HALF_UP))


def glint_score(mean: float, scale: int) -> int:
    """Scale a raw item mean onto a 0-100 score per the Glint primary metric formula.

    Glint Score = 100 x (mean - scale_min) / (scale_max - scale_min), rounded to
    the nearest whole number with ties rounding up. Items are normalized to a
    1..scale range upstream, so scale_min is always 1.
    """
    return round_half_up(100 * (mean - 1) / (scale - 1))

FACTOR_MIN_N = 100
FACTOR_RESPONDENTS_PER_ITEM = 5
SUMMARY_TABS = (
    "changes",
    "relationships",
    "alerts",
    "factors",
    "attrition",
    "downloads",
)
IDENTIFIER_ATTRIBUTE_NAMES = {
    "userid",
    "employeeid",
    "respondentid",
    "personid",
    "managerid",
    "teamid",
    "clientuuid",
    "surveycycleid",
}
COMMENT_THEME_MIN_N = 5
QUESTION_LABEL_OVERRIDES = {
    "Q_ROLE_STRENGTHS": "Role fit",
}
COMMENT_THEME_LEXICON = {
    "Career growth and development": (
        "career",
        "growth",
        "development",
        "develop",
        "promotion",
        "learning",
        "training",
    ),
    "Manager support and coaching": (
        "manager",
        "management",
        "leader",
        "leadership",
        "coaching",
        "supervisor",
        "one on one",
    ),
    "Communication and transparency": (
        "communication",
        "communicate",
        "information",
        "transparency",
        "transparent",
        "clarity",
        "clear direction",
    ),
    "Recognition and feedback": (
        "recognition",
        "recognize",
        "appreciation",
        "appreciate",
        "feedback",
        "reward",
    ),
    "Workload and work-life balance": (
        "workload",
        "work load",
        "burnout",
        "work life",
        "work-life",
        "hours",
        "capacity",
        "staffing",
    ),
    "Tools, resources, and processes": (
        "tools",
        "resources",
        "systems",
        "technology",
        "process",
        "processes",
        "equipment",
    ),
    "Empowerment and autonomy": (
        "empowerment",
        "empowered",
        "autonomy",
        "ownership",
        "decision making",
        "decision-making",
        "trust",
    ),
    "Teamwork and collaboration": (
        "team",
        "teamwork",
        "collaboration",
        "collaborate",
        "colleagues",
        "coworkers",
        "co-workers",
    ),
    "Inclusion, belonging, and respect": (
        "inclusion",
        "inclusive",
        "belonging",
        "diversity",
        "respect",
        "fair treatment",
    ),
    "Pay, benefits, and rewards": (
        "pay",
        "salary",
        "compensation",
        "benefits",
        "bonus",
        "rewards",
    ),
    "Purpose and meaningful impact": (
        "purpose",
        "meaningful",
        "impact",
        "mission",
        "customer",
    ),
    "Strategy, priorities, and change": (
        "strategy",
        "strategic",
        "priorities",
        "priority",
        "change",
        "direction",
        "reorganization",
        "reorg",
    ),
}


def args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument(
        "--summary-mode",
        choices=("off", "optional", "required"),
        help="Override the report summary mode from the analysis config.",
    )
    parser.add_argument("--progress-start", type=int, default=0, help=argparse.SUPPRESS)
    parser.add_argument("--progress-end", type=int, default=100, help=argparse.SUPPRESS)
    parser.add_argument("--progress-started-at", type=float, help=argparse.SUPPRESS)
    return parser.parse_args()


def resolve(base: Path, value: str | None) -> Path | None:
    if not value:
        return None
    path = Path(value)
    return path if path.is_absolute() else (base / path).resolve()


def label(value: str) -> str:
    return QUESTION_LABEL_OVERRIDES.get(
        value,
        re.sub(r"\s+", " ", value.removeprefix("Q_").replace("_", " ")).title(),
    )


def identifier_column(value: str) -> bool:
    compact = re.sub(r"[^a-z0-9]+", "", value.casefold())
    return compact in IDENTIFIER_ATTRIBUTE_NAMES or bool(
        re.search(r"(?:^|[^a-z0-9])(id|uuid|guid)$", value.casefold())
    )


def privacy_safe_team_frame(
    frame: pd.DataFrame, team_col: str | None
) -> tuple[pd.DataFrame, str | None]:
    if not team_col or not identifier_column(team_col):
        return frame, team_col
    safe = frame.copy()
    values = sorted(safe[team_col].dropna().unique(), key=lambda value: str(value))
    width = max(3, len(str(len(values))))
    mapping = {
        value: f"Team {index:0{width}d}"
        for index, value in enumerate(values, start=1)
    }
    safe["__team_label"] = safe[team_col].map(mapping)
    return safe, "__team_label"


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


def metrics(
    frame: pd.DataFrame, questions: list[str], scale: int
) -> list[list[float | int]]:
    rows = []
    for question in questions:
        values = frame[question].dropna()
        rows.append(
            [
                glint_score(float(values.mean()), scale),
                round_half_up(float((values <= 2).mean() * 100)),
                round_half_up(float((values == 3).mean() * 100)),
                round_half_up(float((values >= 4).mean() * 100)),
                int(len(values)),
            ]
        )
    return rows


def survey_response_rows(
    frame: pd.DataFrame, questions: list[str]
) -> pd.DataFrame:
    return frame.loc[frame[questions].notna().any(axis=1)].copy()


def segment_cube(
    frame: pd.DataFrame, questions: list[str], attributes: list[str], scale: int
) -> dict[str, Any]:
    result = {}
    for attribute in attributes:
        values = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute, sort=True):
            employees = group["__employee_id"].nunique()
            if employees >= MIN_N:
                values[str(value)] = {
                    "n": int(employees),
                    "items": metrics(group, questions, scale),
                }
        result[attribute] = {"label": label(attribute), "values": values}
    return result


def comment_theme_payload(
    path: Path | None,
    frame: pd.DataFrame,
    questions: list[str],
    segments: dict[str, Any],
    emp_id: str,
    cycle_col: str | None,
    question_col: str,
    text_col: str,
) -> dict[str, Any]:
    empty = {
        "overall": {},
        "segments": {},
        "minimumComments": COMMENT_THEME_MIN_N,
    }
    if not path or not path.exists():
        return empty
    comments = pd.read_csv(path, low_memory=False)
    if question_col not in comments or text_col not in comments:
        return empty

    normalized_columns = {
        re.sub(r"[^a-z0-9]+", "", str(column).casefold()): str(column)
        for column in comments.columns
    }
    comment_emp_id = normalized_columns.get(
        re.sub(r"[^a-z0-9]+", "", emp_id.casefold())
    )
    if not comment_emp_id:
        comment_emp_id = next(
            (
                normalized_columns.get(candidate)
                for candidate in (
                    "userid",
                    "employeeid",
                    "respondentid",
                    "personid",
                )
                if normalized_columns.get(candidate)
            ),
            None,
        )
    if not comment_emp_id:
        return empty
    if comment_emp_id != emp_id:
        comments = comments.rename(columns={comment_emp_id: emp_id})

    join_keys = [emp_id]
    for candidate in ("survey_cycle_id", "survey_cycle_title"):
        if candidate in comments.columns and candidate in frame.columns:
            join_keys.append(candidate)
            break
    lookup_columns = list(dict.fromkeys([
        *join_keys,
        *segments.keys(),
        *([cycle_col] if cycle_col else []),
    ]))
    lookup = frame[lookup_columns].drop_duplicates(subset=join_keys)
    comments = comments.merge(lookup, on=join_keys, how="left", validate="many_to_one")
    question_lookup: dict[str, str] = {}
    for question in questions:
        normalized = str(question).strip().casefold()
        question_lookup[normalized] = question
        if normalized.startswith("q_"):
            question_lookup[normalized[2:]] = question
    comments["__question"] = comments[question_col].map(
        lambda value: question_lookup.get(str(value).strip().casefold())
    )
    comments = comments[
        comments["__question"].notna()
        & comments[text_col].fillna("").astype(str).str.strip().ne("")
    ].copy()
    if comments.empty:
        return empty
    comments["__cycle"] = (
        comments[cycle_col].fillna("__all__").astype(str)
        if cycle_col and cycle_col in comments.columns
        else "__all__"
    )
    def normalize_text(value: Any) -> str:
        return " " + re.sub(
            r"[^a-z0-9]+", " ", str(value).casefold()
        ).strip() + " "

    normalized_keywords = {
        theme: tuple(normalize_text(keyword).strip() for keyword in keywords)
        for theme, keywords in COMMENT_THEME_LEXICON.items()
    }

    def themes(source: pd.DataFrame) -> dict[str, list[list[Any]]]:
        result = {}
        for question, group in source.groupby("__question", sort=False):
            texts = [normalize_text(value) for value in group[text_col]]
            threshold = max(COMMENT_THEME_MIN_N, math.ceil(len(texts) * 0.02))
            counts = []
            for theme, keywords in normalized_keywords.items():
                count = sum(
                    any(f" {keyword} " in text for keyword in keywords)
                    for text in texts
                )
                if count >= threshold:
                    counts.append((theme, count))
            selected = sorted(counts, key=lambda item: (-item[1], item[0]))[:3]
            if selected:
                result[str(question)] = [
                    [theme, int(count)] for theme, count in selected
                ]
        return result

    def build_view(source: pd.DataFrame) -> dict[str, Any]:
        overall = {
            cycle: themes(group)
            for cycle, group in source.groupby("__cycle", sort=False)
            if len(group) >= COMMENT_THEME_MIN_N
        }
        filtered: dict[str, Any] = {}
        for attribute, segment in segments.items():
            if attribute not in source.columns:
                continue
            values = {}
            for value in segment["values"]:
                group = source[source[attribute].astype(str) == value]
                cycles = {
                    cycle: themes(cycle_group)
                    for cycle, cycle_group in group.groupby("__cycle", sort=False)
                    if len(cycle_group) >= COMMENT_THEME_MIN_N
                }
                if cycles:
                    values[value] = cycles
            if values:
                filtered[attribute] = values
        return {"overall": overall, "segments": filtered}

    return {
        **build_view(comments),
        "minimumComments": COMMENT_THEME_MIN_N,
    }


def ordered_cycle_names(frame: pd.DataFrame, cycle_col: str) -> list[str]:
    """Return cycle titles ordered chronologically, oldest first.

    Prefers the numeric ``survey_cycle_id`` column (lower id = earlier cycle)
    when present; otherwise falls back to first-appearance order in the
    export, which is the best available signal without a real date field.
    """
    names = list(dict.fromkeys(frame[cycle_col].dropna().astype(str)))
    if "survey_cycle_id" in frame.columns:
        ids = frame[[cycle_col, "survey_cycle_id"]].dropna()
        ids[cycle_col] = ids[cycle_col].astype(str)
        min_id = ids.groupby(cycle_col)["survey_cycle_id"].min()
        if set(names) <= set(min_id.index):
            names = sorted(names, key=lambda name: min_id[name])
    return names


def cycle_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None,
    scale: int,
) -> dict[str, Any]:
    if not cycle_col:
        return {
            "cycles": [],
            "overall": {},
            "segments": {},
            "repeat": {"overall": {}, "segments": {}},
        }
    cycles = ordered_cycle_names(frame, cycle_col)

    def cycle_metrics(source: pd.DataFrame) -> list[list[float | int]]:
        rows = []
        for question in questions:
            values = source[question].dropna()
            rows.append(
                [
                    glint_score(float(values.mean()), scale),
                    round_half_up(float(values.std(ddof=1) * (100 / (scale - 1)))),
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
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None = None,
) -> dict[str, Any]:
    overall = correlation_rows(frame, questions)
    result = {
        "overall": overall,
        "segments": {},
        "cycles": {},
        "segment_cycles": {},
        "clusters": {
            "overall": cluster_plan(overall, len(questions)),
            "segments": {},
            "cycles": {},
            "segment_cycles": {},
        },
    }

    def fit_rows(group: pd.DataFrame) -> list[list[Any]] | None:
        if len(group) < RELATIONSHIP_MIN_N:
            return None
        rows = correlation_rows(group, questions)
        if len(rows) != len(questions) * (len(questions) - 1) // 2:
            return None
        return rows

    for attribute in attributes:
        values = {}
        cluster_values = {}
        value_cycles = {}
        cluster_value_cycles = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(attribute):
            rows = fit_rows(group)
            if rows is not None:
                values[str(value)] = rows
                cluster_values[str(value)] = cluster_plan(rows, len(questions))
            if cycle_col:
                cycle_rows = {}
                cycle_cluster_rows = {}
                for cycle_name, cycle_group in group.dropna(
                    subset=[cycle_col]
                ).groupby(cycle_col, sort=False):
                    cycle_name = str(cycle_name)
                    cross_rows = fit_rows(cycle_group)
                    if cross_rows is not None:
                        cycle_rows[cycle_name] = cross_rows
                        cycle_cluster_rows[cycle_name] = cluster_plan(
                            cross_rows, len(questions)
                        )
                if cycle_rows:
                    value_cycles[str(value)] = cycle_rows
                    cluster_value_cycles[str(value)] = cycle_cluster_rows
        result["segments"][attribute] = values
        result["clusters"]["segments"][attribute] = cluster_values
        if value_cycles:
            result["segment_cycles"][attribute] = value_cycles
            result["clusters"]["segment_cycles"][attribute] = cluster_value_cycles
    if cycle_col:
        cycle_values = {}
        cycle_cluster_values = {}
        for cycle_name, group in frame.dropna(subset=[cycle_col]).groupby(
            cycle_col, sort=False
        ):
            cycle_name = str(cycle_name)
            rows = fit_rows(group)
            if rows is not None:
                cycle_values[cycle_name] = rows
                cycle_cluster_values[cycle_name] = cluster_plan(
                    rows, len(questions)
                )
        result["cycles"] = cycle_values
        result["clusters"]["cycles"] = cycle_cluster_values
    return result


def heatmap_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    cycle_col: str | None,
    scale: int,
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
                                "items": metrics(group, questions, scale),
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


def factor_cube(
    frame: pd.DataFrame,
    questions: list[str],
    attributes: list[str],
    overall_rows: list[dict[str, Any]],
    progress: ProgressReporter | None = None,
    progress_start: float = 0,
    progress_end: float = 100,
    cycle_col: str | None = None,
) -> dict[str, Any]:
    minimum = max(FACTOR_MIN_N, FACTOR_RESPONDENTS_PER_ITEM * len(questions))
    factor_names = sorted(
        {str(row.get("factor")) for row in overall_rows if row.get("factor")},
        key=lambda value: int(re.sub(r"\D", "", value) or 0),
    )
    factor_count = len(factor_names)

    def clean_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [
            {
                "question": str(row["question"]),
                "factor": str(row["factor"]),
                "loading": round(float(row["loading"]), 6),
                "loading_label": str(row["loading_label"]),
                "communality": round(float(row["communality"]), 6),
                "factor_variance_pct": round(
                    float(row["factor_variance_pct"]), 6
                ),
            }
            for row in rows
            if math.isfinite(float(row["loading"]))
        ]

    def unavailable(
        source: pd.DataFrame,
        status: str,
        reason: str,
    ) -> dict[str, Any]:
        complete = source.dropna(subset=questions)
        return {
            "status": status,
            "reason": reason,
            "n": int(source["__employee_id"].nunique()),
            "completeN": int(complete["__employee_id"].nunique()),
            "responseRows": int(len(source)),
            "minimumN": minimum,
            "factorCount": factor_count,
            "rows": [],
        }

    def fit(source: pd.DataFrame) -> dict[str, Any]:
        complete = source.dropna(subset=questions)
        complete_n = int(complete["__employee_id"].nunique())
        if complete_n < minimum:
            return unavailable(
                source,
                "suppressed",
                (
                    f"At least {minimum} complete responses are required "
                    f"({FACTOR_RESPONDENTS_PER_ITEM} per item, minimum "
                    f"{FACTOR_MIN_N})."
                ),
            )
        if not factor_count:
            return unavailable(
                source,
                "unavailable",
                "The company factor solution did not provide a factor count.",
            )
        varying = [
            question
            for question in questions
            if source[question].dropna().nunique() > 1
        ]
        if len(varying) != len(questions):
            return unavailable(
                source,
                "unavailable",
                "One or more survey items have no response variation in this cut.",
            )
        try:
            from vivaglint import extract_survey_factors
            from vivaglint.import_ import build_glint_survey

            survey_frame = source[["__employee_id", *questions]].copy()
            for question in questions:
                survey_frame[f"{question}_COMMENT"] = ""
                survey_frame[f"{question}_COMMENT_TOPICS"] = ""
                survey_frame[f"{question}_SENSITIVE_COMMENT_FLAG"] = ""
            survey = build_glint_survey(
                survey_frame,
                emp_id_col="__employee_id",
                first_name_col=None,
                last_name_col=None,
                email_col=None,
                status_col=None,
                completion_date_col=None,
                sent_date_col=None,
                manager_id_col=None,
            )
            result = extract_survey_factors(
                survey,
                n_factors=factor_count,
                rotation="varimax",
                min_loading=0,
            )
            rows = clean_rows(result["factor_summary"].to_dict("records"))
        except (ValueError, np.linalg.LinAlgError) as error:
            return unavailable(
                source,
                "unavailable",
                f"The factor model could not be estimated: {error}",
            )
        return {
            "status": "available",
            "reason": "",
            "n": int(source["__employee_id"].nunique()),
            "completeN": complete_n,
            "responseRows": int(len(source)),
            "minimumN": minimum,
            "factorCount": factor_count,
            "rows": rows,
        }

    overall_clean = clean_rows(overall_rows)
    expected_rows = len(questions) * factor_count
    overall = {
        "status": "available" if overall_clean else "unavailable",
        "reason": "" if overall_clean else "Factor analysis was not completed.",
        "n": int(frame["__employee_id"].nunique()),
        "completeN": int(
            frame.dropna(subset=questions)["__employee_id"].nunique()
        ),
        "responseRows": int(len(frame)),
        "minimumN": minimum,
        "factorCount": factor_count,
        "rows": overall_clean,
    }
    if overall_clean and len(overall_clean) < expected_rows:
        overall = fit(frame)

    total = sum(frame[attribute].nunique(dropna=True) for attribute in attributes)
    if cycle_col:
        for attribute in attributes:
            total += int(
                frame.dropna(subset=[attribute, cycle_col])
                .groupby(attribute)[cycle_col]
                .nunique()
                .sum()
            )
    completed = 0
    last_percent = -1
    segments: dict[str, Any] = {}
    segment_cycles: dict[str, Any] = {}
    for attribute in attributes:
        values = {}
        value_cycles = {}
        for value, group in frame.dropna(subset=[attribute]).groupby(
            attribute, sort=True
        ):
            values[str(value)] = fit(group)
            completed += 1
            percent = int(
                progress_start
                + (progress_end - progress_start) * completed / max(1, total)
            )
            if progress is not None and percent != last_percent:
                progress.update(
                    percent,
                    (
                        "Estimating filter-specific factor models "
                        f"({completed:,}/{total:,} cuts)"
                    ),
                )
                last_percent = percent
            if cycle_col:
                cycle_fits = {}
                for cycle_name, cycle_group in group.dropna(
                    subset=[cycle_col]
                ).groupby(cycle_col, sort=False):
                    cycle_fits[str(cycle_name)] = fit(cycle_group)
                    completed += 1
                    percent = int(
                        progress_start
                        + (progress_end - progress_start) * completed / max(1, total)
                    )
                    if progress is not None and percent != last_percent:
                        progress.update(
                            percent,
                            (
                                "Estimating filter-specific factor models "
                                f"({completed:,}/{total:,} cuts)"
                            ),
                        )
                        last_percent = percent
                if cycle_fits:
                    value_cycles[str(value)] = cycle_fits
        segments[attribute] = values
        if value_cycles:
            segment_cycles[attribute] = value_cycles
    cycles: dict[str, Any] = {}
    if cycle_col:
        cycle_names = frame[cycle_col].dropna().astype(str).unique().tolist()
        total += len(cycle_names)
        for cycle_name, group in frame.dropna(subset=[cycle_col]).groupby(
            cycle_col, sort=False
        ):
            cycles[str(cycle_name)] = fit(group)
            completed += 1
            percent = int(
                progress_start
                + (progress_end - progress_start) * completed / max(1, total)
            )
            if progress is not None and percent != last_percent:
                progress.update(
                    percent,
                    (
                        "Estimating filter-specific factor models "
                        f"({completed:,}/{total:,} cuts)"
                    ),
                )
                last_percent = percent
    return {
        "overall": overall,
        "segments": segments,
        "cycles": cycles,
        "segment_cycles": segment_cycles,
        "minimumN": minimum,
        "respondentsPerItem": FACTOR_RESPONDENTS_PER_ITEM,
        "rotation": "varimax",
    }


def html_page(data: dict[str, Any]) -> str:
    encoded = (
        json.dumps(data, separators=(",", ":"))
        .replace("&", "\\u0026")
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )
    template_path = (
        Path(__file__).resolve().parents[1]
        / "skills"
        / "analyze-survey"
        / "references"
        / "golden-report.html"
    )
    template = template_path.read_text(encoding="utf-8")
    marker = "<script>const D="
    payload_start = template.index(marker) + len(marker)
    payload_end = template.index(";\nconst names=", payload_start)
    return template[:payload_start] + encoded + template[payload_end:]


def attrition_payload(
    path: Path,
    questions: list[str],
    segments: dict[str, Any],
    minimum_category_n: int,
) -> dict[str, Any]:
    frame = pd.read_csv(
        path,
        dtype={"attribute_name": str, "attribute_value": str},
        low_memory=False,
    )
    attributes = list(segments)
    attribute_values = [
        list(segments[attribute]["values"]) for attribute in attributes
    ]
    attribute_index = {name: index for index, name in enumerate(attributes)}
    value_index = {
        name: {value: index for index, value in enumerate(attribute_values[index])}
        for index, name in enumerate(attributes)
    }
    question_index = {question: index for index, question in enumerate(questions)}
    days = sorted(int(value) for value in frame["days"].dropna().unique())
    day_index = {value: index for index, value in enumerate(days)}
    rows = []
    for record in frame.to_dict("records"):
        question = record["question"]
        if question not in question_index:
            continue
        if record["analysis_scope"] == "overall":
            attr_i = value_i = -1
        else:
            attribute = record["attribute_name"]
            value = record["attribute_value"]
            if (
                attribute not in attribute_index
                or value not in value_index.get(attribute, {})
            ):
                continue
            attr_i = attribute_index[attribute]
            value_i = value_index[attribute][value]
        favorable_n = int(record["favorable_n"])
        unfavorable_n = int(record["unfavorable_n"])
        suppressed = (
            favorable_n < minimum_category_n
            or unfavorable_n < minimum_category_n
        )
        multiplier = record["attrition_ratio"]
        favorable_rate = record["favorable_attrition"]
        unfavorable_rate = record["unfavorable_attrition"]
        p_value = None
        significant = False
        if (
            not suppressed
            and not pd.isna(favorable_rate)
            and not pd.isna(unfavorable_rate)
        ):
            favorable_exits = min(
                favorable_n,
                max(0, round(favorable_n * float(favorable_rate))),
            )
            unfavorable_exits = min(
                unfavorable_n,
                max(0, round(unfavorable_n * float(unfavorable_rate))),
            )
            _, calculated_p = fisher_exact(
                [
                    [unfavorable_exits, unfavorable_n - unfavorable_exits],
                    [favorable_exits, favorable_n - favorable_exits],
                ],
                alternative="two-sided",
            )
            if math.isfinite(float(calculated_p)):
                p_value = round(float(calculated_p), 4)
                significant = calculated_p < 0.05
        rows.append(
            [
                attr_i,
                value_i,
                question_index[question],
                day_index[int(record["days"])],
                None if suppressed else favorable_n,
                (
                    None
                    if suppressed or pd.isna(record["favorable_attrition"])
                    else round(float(record["favorable_attrition"]), 4)
                ),
                None if suppressed else unfavorable_n,
                (
                    None
                    if suppressed or pd.isna(record["unfavorable_attrition"])
                    else round(float(record["unfavorable_attrition"]), 4)
                ),
                (
                    None
                    if suppressed
                    or pd.isna(multiplier)
                    or not math.isfinite(float(multiplier))
                    else round(float(multiplier), 2)
                ),
                1 if suppressed else 0,
                p_value,
                1 if significant else 0,
            ]
        )
    return {
        "questions": questions,
        "labels": [label(question) for question in questions],
        "attributes": attributes,
        "values": attribute_values,
        "days": days,
        "rows": rows,
        "minimumCategoryN": minimum_category_n,
    }


def attrition_alert_payload(
    path: Path,
    questions: list[str],
    segments: dict[str, Any],
    overall: list[list[float | int]],
    minimum_category_n: int,
) -> dict[str, Any]:
    frame = pd.read_csv(
        path,
        dtype={"attribute_name": str, "attribute_value": str},
        low_memory=False,
    )
    days = sorted(int(value) for value in frame["days"].dropna().unique())
    frame = frame[frame["analysis_scope"] == "attribute"].copy()
    frame["attrition_ratio"] = pd.to_numeric(
        frame["attrition_ratio"], errors="coerce"
    )
    frame = frame[
        frame["attribute_name"].isin(segments)
        & (frame["favorable_n"] >= minimum_category_n)
        & (frame["unfavorable_n"] >= minimum_category_n)
        & np.isfinite(frame["attrition_ratio"])
    ]
    question_index = {question: index for index, question in enumerate(questions)}
    by_day: dict[str, Any] = {}
    for days_value in days:
        day_frame = frame[frame["days"] == days_value]
        attributes: dict[str, Any] = {}
        for attribute in segments:
            attribute_frame = day_frame[day_frame["attribute_name"] == attribute]
            if attribute_frame.empty:
                continue
            item_multipliers = (
                attribute_frame.groupby("question", sort=False)["attrition_ratio"]
                .median()
                .dropna()
            )
            top_questions = sorted(
                (
                    (question_index[question], float(multiplier))
                    for question, multiplier in item_multipliers.items()
                    if question in question_index
                ),
                key=lambda item: (-item[1], item[0]),
            )[:5]
            rows = []
            for item_index, priority_multiplier in top_questions:
                question = questions[item_index]
                item_frame = attribute_frame[
                    attribute_frame["question"] == question
                ]
                for record in item_frame.to_dict("records"):
                    value = str(record["attribute_value"])
                    segment = segments[attribute]["values"].get(value)
                    if not segment:
                        continue
                    group_score = float(segment["items"][item_index][0])
                    company_score = float(overall[item_index][0])
                    rows.append(
                        [
                            value,
                            item_index,
                            group_score,
                            company_score,
                            int(round_half_up(group_score - company_score)),
                            int(segment["items"][item_index][4]),
                            round(float(record["attrition_ratio"]), 2),
                            round(priority_multiplier, 2),
                        ]
                    )
            if rows:
                attributes[attribute] = {
                    "label": segments[attribute]["label"],
                    "topItems": [
                        [item_index, round(multiplier, 2)]
                        for item_index, multiplier in top_questions
                    ],
                    "rows": rows,
                }
        by_day[str(days_value)] = attributes
    default_days = next(
        (
            candidate
            for candidate in ([180] + days)
            if candidate in days and by_day.get(str(candidate))
        ),
        180 if 180 in days else (days[0] if days else None),
    )
    return {
        "questions": questions,
        "labels": [label(question) for question in questions],
        "days": days,
        "defaultDays": default_days,
        "byDay": by_day,
        "minimumCategoryN": minimum_category_n,
        "method": "Top items use the median eligible attrition multiplier across "
        "values within each attribute.",
    }


def remove_legacy_alert_script(html: str) -> str:
    start = html.find("const alertSeverity=")
    end_marker = "alertSearch.oninput=renderAlerts;"
    end = html.find(end_marker, start)
    if start >= 0 and end >= 0:
        html = (
            html[:start]
            + 'function signed(value){const n=Math.round(Number(value));return`${n>0?"+":""}${n}`}'
            + html[end + len(end_marker):]
        )
    return html.replace("renderAlerts();", "")


def remove_section(html: str, section_id: str, next_section_id: str) -> str:
    start = html.index(f"<section class=panel id={section_id}")
    end = html.index(f"<section class=panel id={next_section_id}", start)
    return html[:start] + html[end:]


def remove_between_markers(html: str, start_marker: str, end_marker: str) -> str:
    start = html.index(start_marker)
    end = html.index(end_marker, start) + len(end_marker)
    return html[:start] + html[end:]


def replace_live_alert_summary(html: str) -> str:
    start = html.index('else if(tab==="alerts"){')
    end_marker = '}else if(tab==="factors"){'
    end = html.index(end_marker, start)
    replacement = r'''else if(tab==="alerts"){const days=D.alerts.defaultDays,source=D.alerts.byDay?.[String(days)]||{},attribute=attr.value?source[attr.value]:null;let rows=[];if(attribute&&val.value){rows=attribute.rows.filter(row=>row[0]===val.value).map(row=>({label:attribute.label,row}))}else{for(const item of Object.values(source)){for(const [itemIndex] of item.topItems){const candidates=item.rows.filter(row=>row[1]===itemIndex).sort((a,b)=>a[4]-b[4]||a[0].localeCompare(b[0]));if(candidates[0])rows.push({label:item.label,row:candidates[0]})}}}rows.sort((a,b)=>a.row[4]-b.row[4]);const top=rows[0];if(top){summary.headline=`${scope}: ${D.labels[D.alerts.questions[top.row[1]]]} has the largest visible score gap`;summary.observation=`At ${days} days, ${top.label}: ${top.row[0]} scores ${Math.abs(top.row[4])} points ${top.row[4]<0?"below":"above"} company overall on ${D.labels[D.alerts.questions[top.row[1]]]}, with a ${top.row[6].toFixed(2)}x attrition multiplier.`;summary.interpretation=`This combines an aggregate attrition association with a group score gap to prioritize follow-up, not to predict individual departures.`;summary.recommendation=`Validate the experience behind the item with the selected group and review related lifecycle context before choosing an action.`;summary.caveat=`Items are selected from the top five median eligible attrition multipliers for the attribute; group results remain descriptive and non-causal.`}else{summary.headline=`${scope}: attrition alerts are unavailable`;summary.observation=`No privacy-eligible group comparison is available for the selected population.`;summary.interpretation=`Unavailable alerts do not imply low attrition risk or a strong employee experience.`;summary.recommendation=`Use a broader population or improve outcome coverage before interpreting this view.`;summary.caveat=`Do not bypass minimum-category thresholds or infer individual risk.`}}else if(tab==="factors"){'''
    return html[:start] + replacement + html[end + len(end_marker):]


def prepare_report_shell(html: str, has_attrition: bool) -> str:
    html = html.replace(
        'data-id="relationships" aria-selected="true">Relationships</button>',
        'data-id="relationships" aria-selected="true">Correlation</button>',
        1,
    ).replace("<h2>Relationships</h2>", "<h2>Correlation</h2>", 1)
    html = remove_legacy_alert_script(html)
    html = replace_live_alert_summary(html)
    html = remove_section(html, "alerts", "attrition")
    html = html.replace(
        '<button class="tab" data-id="alerts" aria-selected="false">Attrition alerts</button>',
        "",
        1,
    )
    if has_attrition:
        html = html.replace("<!-- methodology-attrition-start -->", "").replace(
            "<!-- methodology-attrition-end -->",
            "",
        )
        html = html.replace("<!-- methodology-attrition-nav-start -->", "").replace(
            "<!-- methodology-attrition-nav-end -->",
            "",
        )
        old_navigation = (
            '<button class="tab" data-id="factors" aria-selected="false">Factors</button>'
            '<button class="tab" data-id="attrition" aria-selected="false">'
            'Attrition analysis</button>'
        )
        new_navigation = (
            '<button class="tab" data-id="factors" aria-selected="false">Factors</button>'
            '<button class="tab" data-id="attrition" aria-selected="false">'
            'Attrition analysis</button>'
            '<button class="tab" data-id="alerts" aria-selected="false">'
            'Attrition alerts</button>'
        )
        return html.replace(old_navigation, new_navigation, 1)

    html = html.replace(
        '<button class="tab" data-id="attrition" aria-selected="false">'
        'Attrition analysis</button>',
        "",
        1,
    )
    html = remove_between_markers(
        html,
        "<!-- methodology-attrition-nav-start -->",
        "<!-- methodology-attrition-nav-end -->",
    )
    html = remove_between_markers(
        html,
        "<!-- methodology-attrition-start -->",
        "<!-- methodology-attrition-end -->",
    )
    attrition_start = html.index("<section class=panel id=attrition")
    next_section_match = re.search(
        r"<section class=panel id=\w+", html[attrition_start + 1 :]
    )
    if not next_section_match:
        raise ValueError("No section follows the attrition section to anchor removal.")
    next_section_start = attrition_start + 1 + next_section_match.start()
    html = html[:attrition_start] + html[next_section_start:]
    return html.replace(
        'function renderStatic(){document.querySelector("#attritionStatus").textContent='
        'D.attrition;document.querySelector("#downloadList").innerHTML=',
        'function renderStatic(){document.querySelector("#downloadList").innerHTML=',
        1,
    )


def inject_attrition_report(
    html: str,
    payload: dict[str, Any],
    alerts_payload: dict[str, Any],
    completion_date: str | None,
) -> str:
    old_section = (
        "<section class=panel id=attrition role=tabpanel hidden><h2>Attrition analysis</h2>"
        "<p class=tab-intro>This chart ranks survey items by how strongly they're "
        "associated with later attrition based on actual outcomes — not assumed risk "
        "factors. Each bar shows a multiplier: how much more often an unfavorable "
        "respondent left within the selected window compared to a favorable "
        "respondent, centered on a 1.00x reference line. A multiplier of 2.00x means "
        "unfavorable respondents left twice as often as favorable ones; a multiplier "
        "of 1.10x is a weak, near-baseline signal. You can't read a high multiplier "
        "as a prediction for any one person — a multiplier is a group-level "
        "screening association across many respondents, not a forecast (even a "
        "strong multiplier still describes a minority of respondents who eventually "
        "left, not a certainty); applying it to an individual reintroduces the noise "
        "the aggregate was built to remove. Multipliers that aren't statistically "
        "significant or don't repeat across the 90-, 180-, and 365-day windows are "
        "weak signals — read these with extra care.</p>"
        "<div class=ai-summary data-summary=attrition></div>"
        "<div class=notice id=attritionStatus></div></section>"
    )
    if old_section not in html:
        raise ValueError("The canonical attrition section was not found.")
    completion_text = (
        f" Predictor-cycle completion is registered as {completion_date}."
        if completion_date
        else ""
    )
    attrition_section = (
        '<section class=panel id=attrition role=tabpanel hidden>'
        '<div class=attrition-heading><div><h2>Attrition analysis</h2>'
        '<p class=muted>Survey item multipliers linked to subsequent Exit outcomes.</p>'
        '</div><label>Outcome window<select id=attritionDays>'
        + "".join(
            (
                f'<option value={index}'
                + (" selected" if days == 180 else "")
                + f'>{days} days'
                + (" (6 months)" if days == 180 else "")
                + "</option>"
            )
            for index, days in enumerate(payload["days"])
        )
        + '</select></label></div><p class=tab-intro>Compare later exit rates for '
        'respondents with favorable and unfavorable item responses. Focus on '
        'multipliers that are statistically significant and repeat across outcome '
        'windows, then investigate the employee experience behind those items '
        'without predicting individual departures.</p>'
        '<div class=ai-summary data-summary=attrition></div>'
        '<div class=notice id=attritionStatus></div>'
        '<p class=muted id=attritionFilterNote></p>'
        '<div class=scroll><table class=attrition-table><thead><tr>'
        '<th>Rank</th><th>Item text</th><th>Attrition multiplier</th></tr></thead>'
        '<tbody id=attritionTableBody></tbody></table></div>'
        '<p class="muted attrition-method">Multiplier = unfavorable attrition rate '
        '÷ favorable attrition rate. The table responds to the shared report filter. '
        f'Cells with fewer than {payload["minimumCategoryN"]} favorable or unfavorable '
        'respondents are suppressed. These are screening associations, not causal '
        f'estimates.{completion_text}</p></section>'
    )
    alerts_section = (
        '<section class=panel id=alerts role=tabpanel hidden>'
        '<div class=alert-heading><div><h2>Attrition alerts</h2>'
        '<p class=muted>Find low-scoring groups on the items most associated '
        'with later attrition.</p></div><label>Outcome window'
        '<select id=alertDays>'
        + "".join(
            (
                f'<option value={days}'
                + (" selected" if days == alerts_payload["defaultDays"] else "")
                + f'>{days} days'
                + (" (6 months)" if days == 180 else "")
                + "</option>"
            )
            for days in alerts_payload["days"]
        )
        + '</select></label></div><p class=tab-intro>Find privacy-eligible groups '
        'that score lower on the items most associated with later exits. Start '
        'with the largest score gaps, confirm the local context, and use the result '
        'to plan a focused listening conversation—not to rank managers or predict '
        'departures.</p>'
        '<div class=ai-summary data-summary=alerts></div>'
        '<p class="notice">For each attribute, the five items with the highest '
        'median eligible attrition multipliers are selected. The table compares '
        'group scores on those items with company overall.</p>'
        '<p class=muted id=alertNote></p><div class=scroll>'
        '<table class=alert-table><thead><tr><th>Attribute</th><th>Group</th>'
        '<th>Attrition item</th><th>Group score</th><th>Company</th>'
        '<th>Gap</th><th>Attrition multiplier</th><th>n</th></tr></thead>'
        '<tbody id=alertsList></tbody></table></div>'
        '<p class="muted attrition-method">Item priority uses the median eligible '
        'multiplier across values within each attribute. Group alerts are '
        'screening signals, not causal estimates or individual predictions.</p>'
        '</section>'
    )
    css = """
/* attrition-live-table */
.attrition-heading{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:16px}
.attrition-heading p{margin:4px 0 0}.attrition-heading label{min-width:210px}
.attrition-table{min-width:760px;font-size:12px}.attrition-table th,.attrition-table td{padding:12px}
.attrition-table th:last-child{width:48%}.attrition-rank{color:var(--muted);font-weight:600}
.attrition-question{font-size:14px;font-weight:600}.attrition-question-id{font-size:11px}
.attrition-bar-cell{display:grid;grid-template-columns:minmax(240px,1fr) 180px;align-items:center;gap:12px}
.attrition-bar-track{position:relative;height:22px;border-radius:3px;background:var(--soft);overflow:hidden}
.attrition-bar{display:block;height:100%;width:var(--bar-width);min-width:2px;background:var(--blue);border-radius:3px}
.attrition-baseline{position:absolute;top:0;bottom:0;left:var(--baseline);width:2px;background:var(--text);opacity:.65}
.attrition-multiplier{display:block;font-size:18px;font-weight:700;color:var(--blue);text-align:left}
.attrition-significant{display:inline-block;margin-top:4px;padding:3px 7px;border-radius:99px;background:var(--success-soft);color:var(--green);font-size:10px;font-weight:700}
.attrition-not-significant{display:block;margin-top:4px;color:var(--muted);font-size:10px}
.attrition-method{margin:12px 0 0}.attrition-empty{text-align:center!important;padding:28px!important}
.attrition-suppressed{color:var(--muted);font-style:italic}
.alert-heading label{min-width:210px}.alert-table{min-width:980px}
.alert-table td:nth-child(3){min-width:190px;white-space:normal}
.alert-gap{font-weight:700}.alert-gap.negative{color:var(--red)}
@media(max-width:800px){.attrition-heading{display:block}.attrition-heading label{margin-top:12px}}
"""
    encoded = (
        json.dumps(payload, separators=(",", ":"))
        .replace("&", "\\u0026")
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
    )
    alerts_encoded = (
        json.dumps(alerts_payload, separators=(",", ":"))
        .replace("&", "\\u0026")
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
    )
    script = """
<script>
const ATTRITION_DATA=__PAYLOAD__;
const ATTRITION_ALERTS=__ALERTS_PAYLOAD__;
const attritionIndex=new Map();
for(const row of ATTRITION_DATA.rows){
  const key=`${row[0]}|${row[1]}|${row[3]}`;
  if(!attritionIndex.has(key))attritionIndex.set(key,[]);
  attritionIndex.get(key).push(row);
}
function attritionFilterKey(){
  const day=Number(document.querySelector("#attritionDays").value);
  if(!attr.value)return`-1|-1|${day}`;
  const attrIndex=ATTRITION_DATA.attributes.indexOf(attr.value);
  const valueIndex=attrIndex<0?-1:ATTRITION_DATA.values[attrIndex].indexOf(val.value);
  return`${attrIndex}|${valueIndex}|${day}`;
}
function renderAttritionTable(){
  const body=document.querySelector("#attritionTableBody");
  const note=document.querySelector("#attritionFilterNote");
  const dayIndex=Number(document.querySelector("#attritionDays").value);
  const days=ATTRITION_DATA.days[dayIndex];
  const rows=[...(attritionIndex.get(attritionFilterKey())||[])];
  const scope=attr.value?`${D.segments[attr.value].label}: ${val.value}`:"Company overall";
  note.textContent=`${scope} · all ${ATTRITION_DATA.questions.length} items · ${days}-day outcome window`;
  if(!rows.length){
    body.innerHTML='<tr><td class=attrition-empty colspan=3>No privacy-eligible attrition aggregate is available for this filter selection.</td></tr>';
    return;
  }
  rows.sort((a,b)=>{
    if(a[8]===null&&b[8]!==null)return 1;if(a[8]!==null&&b[8]===null)return-1;
    if(a[8]!==null&&b[8]!==null&&b[8]!==a[8])return b[8]-a[8];
    return ATTRITION_DATA.labels[a[2]].localeCompare(ATTRITION_DATA.labels[b[2]]);
  });
  const visible=rows.filter(row=>row[9]!==1&&row[8]!==null);
  const scaleMax=Math.max(2,...visible.map(row=>row[8]));
  const significantCount=visible.filter(row=>row[11]===1).length;
  note.textContent+=` · bars use a 0–${scaleMax.toFixed(1)}x scale; marker = 1.00x · ${significantCount} statistically significant`;
  body.innerHTML=rows.map((row,index)=>{
    const suppressed=row[9]===1;
    const multiplier=suppressed?"Suppressed":row[8]===null?"—":`${row[8].toFixed(2)}x`;
    const barWidth=row[8]===null?0:Math.min(100,row[8]/scaleMax*100);
    const baseline=Math.min(100,1/scaleMax*100);
    const significance=row[11]===1
      ?`<span class=attrition-significant title="Fisher exact test p=${row[10]?.toFixed(4)}">Statistically significant</span>`
      :row[10]===null?"":`<span class=attrition-not-significant>p=${row[10].toFixed(3)}</span>`;
    return`<tr><td class=attrition-rank>${index+1}</td>
      <td><span class=attrition-question>${ATTRITION_DATA.labels[row[2]]}</span><br><span class="muted attrition-question-id">${ATTRITION_DATA.questions[row[2]]}</span></td>
      <td>${suppressed?`<span class=attrition-suppressed>${multiplier}</span>`:
        `<div class=attrition-bar-cell><div class=attrition-bar-track style="--baseline:${baseline}%"><span class=attrition-bar style="--bar-width:${barWidth}%"></span><i class=attrition-baseline aria-hidden=true></i></div><div><strong class=attrition-multiplier>${multiplier}</strong>${significance}</div></div>`}</td></tr>`;
  }).join("");
}
document.querySelector("#attritionDays").addEventListener("change",renderAttritionTable);
attr.addEventListener("change",()=>setTimeout(renderAttritionTable,0));
val.addEventListener("change",renderAttritionTable);
function renderAttritionAlerts(){
  const body=document.querySelector("#alertsList");
  const note=document.querySelector("#alertNote");
  const days=document.querySelector("#alertDays").value;
  const source=ATTRITION_ALERTS.byDay[days]||{};
  let rows=[];
  if(attr.value){
    const attribute=source[attr.value];
    rows=(attribute?.rows||[]).filter(row=>row[0]===val.value)
      .map(row=>[attribute.label,...row]);
  }else{
    for(const attribute of Object.values(source)){
      for(const [itemIndex] of attribute.topItems){
        const candidates=attribute.rows.filter(row=>row[1]===itemIndex)
          .sort((a,b)=>a[4]-b[4]||a[0].localeCompare(b[0]));
        if(candidates[0])rows.push([attribute.label,...candidates[0]]);
      }
    }
  }
  rows.sort((a,b)=>a[5]-b[5]||a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
  const scope=attr.value?`${D.segments[attr.value].label}: ${val.value}`:"Lowest group for each top item and attribute";
  note.textContent=`${scope} · ${days}-day outcome window · ${rows.length} alerts shown`;
  body.innerHTML=rows.map(row=>`<tr><td>${escapeHtml(row[0])}</td>
    <td>${escapeHtml(row[1])}</td><td>${escapeHtml(ATTRITION_ALERTS.labels[row[2]])}</td>
    <td>${Number(row[3]).toFixed(1)}</td><td>${Number(row[4]).toFixed(1)}</td>
    <td class="alert-gap ${row[5]<0?"negative":""}">${signed(row[5])}</td>
    <td>${Number(row[7]).toFixed(2)}x</td><td>${Number(row[6]).toLocaleString()}</td></tr>`).join("")
    ||'<tr><td colspan=8>No privacy-eligible attrition alert is available for this selection.</td></tr>';
}
document.querySelector("#alertDays").addEventListener("change",renderAttritionAlerts);
attr.addEventListener("change",()=>setTimeout(renderAttritionAlerts,0));
val.addEventListener("change",renderAttritionAlerts);
renderAttritionTable();
renderAttritionAlerts();
</script>
""".replace("__PAYLOAD__", encoded).replace("__ALERTS_PAYLOAD__", alerts_encoded)
    return (
        html.replace(old_section, attrition_section + alerts_section, 1)
        .replace("</style>", css + "</style>", 1)
        .replace("</body>", script + "</body>", 1)
    )


def summary_context(
    questions: list[str],
    cycles: dict[str, Any],
    relationships: dict[str, Any],
    alerts_data: dict[str, Any],
    factors: dict[str, Any],
    attrition: str,
    downloads: list[str],
) -> dict[str, Any]:
    labels = {question: label(question) for question in questions}
    cycle_names = cycles.get("cycles", [])
    changes: dict[str, Any] = {"cycles": cycle_names, "largest_changes": []}
    if len(cycle_names) >= 2:
        old_cycle, new_cycle = cycle_names[0], cycle_names[-1]
        old = cycles.get("overall", {}).get(old_cycle, {}).get("items", [])
        new = cycles.get("overall", {}).get(new_cycle, {}).get("items", [])
        change_rows = [
            {
                "question": labels[question],
                "old_score": old[index][0],
                "new_score": new[index][0],
                "change": int(round_half_up(new[index][0] - old[index][0])),
                "n_old": old[index][2],
                "n_new": new[index][2],
            }
            for index, question in enumerate(questions)
            if index < len(old) and index < len(new)
        ]
        changes.update(
            {
                "old_cycle": old_cycle,
                "new_cycle": new_cycle,
                "largest_changes": sorted(
                    change_rows,
                    key=lambda row: abs(row["change"]),
                    reverse=True,
                )[:8],
            }
        )

    strongest = sorted(
        relationships.get("overall", []),
        key=lambda row: abs(row[2]),
        reverse=True,
    )[:8]
    relationship_context = {
        "strongest_relationships": [
            {
                "question_1": labels[questions[row[0]]],
                "question_2": labels[questions[row[1]]],
                "correlation": row[2],
                "p_value": row[3],
                "n": row[4],
            }
            for row in strongest
        ],
        "cluster_recommendation": relationships.get("clusters", {}).get(
            "overall", {}
        ),
    }

    default_days = alerts_data.get("defaultDays")
    default_alerts = alerts_data.get("byDay", {}).get(str(default_days), {})
    alert_rows = []
    for attribute, attribute_data in default_alerts.items():
        for item_index, priority_multiplier in attribute_data["topItems"]:
            candidates = sorted(
                (
                    row for row in attribute_data["rows"]
                    if row[1] == item_index
                ),
                key=lambda row: (row[4], row[0]),
            )
            if candidates:
                row = candidates[0]
                alert_rows.append(
                    {
                        "attribute": attribute_data["label"],
                        "group": row[0],
                        "question": labels[questions[item_index]],
                        "group_score": row[2],
                        "company_score": row[3],
                        "gap": row[4],
                        "n": row[5],
                        "group_multiplier": row[6],
                        "priority_multiplier": priority_multiplier,
                    }
                )
    alert_context = {
        "available": bool(alert_rows),
        "outcome_window_days": default_days,
        "method": alerts_data.get("method"),
        "attributes": len(default_alerts),
        "alerts": sorted(alert_rows, key=lambda row: row["gap"])[:12],
    }
    return {
        "schema_version": "1.0.0",
        "privacy": (
            "Aggregate context only. Do not add employee identifiers, raw comments, "
            "or suppressed group details to summaries."
        ),
        "tabs": {
            "changes": changes,
            "relationships": relationship_context,
            "alerts": alert_context,
            "factors": {
                "overall": {
                    **factors.get("overall", {}),
                    "rows": factors.get("overall", {}).get("rows", [])[:60],
                },
                "minimum_n": factors.get("minimumN"),
                "rotation": factors.get("rotation"),
            },
            "attrition": {"status": attrition},
            "downloads": {"artifacts": downloads},
        },
    }


def load_ai_summaries(
    output: Path,
    *,
    required: bool = False,
) -> dict[str, Any]:
    path = output / "people-science-summaries.json"
    if not path.exists():
        if required:
            raise ValueError(
                "Summary mode 'required' needs people-science-summaries.json."
            )
        return {}
    summaries = json.loads(path.read_text(encoding="utf-8"))
    if summaries.get("schema_version") != "1.0.0":
        raise ValueError(
            "people-science-summaries.json must use schema_version 1.0.0."
        )
    tabs = summaries.get("tabs")
    if not isinstance(tabs, dict):
        raise ValueError("people-science-summaries.json must contain a tabs object.")
    missing = [tab for tab in SUMMARY_TABS if tab not in tabs]
    if missing:
        raise ValueError(
            "people-science-summaries.json is missing tab summaries: "
            + ", ".join(missing)
        )

    def validate_summary(summary: Any, location: str) -> None:
        if not isinstance(summary, dict):
            raise ValueError(f"{location} must be an object.")
        for field in (
            "headline",
            "observation",
            "interpretation",
            "recommendation",
            "caveat",
        ):
            if not isinstance(summary.get(field), str) or not summary[field].strip():
                raise ValueError(f"{location}.{field} must be a non-empty string.")
        sources = summary.get("sources")
        if not isinstance(sources, list):
            raise ValueError(f"{location}.sources must be an array.")
        for index, source in enumerate(sources):
            if (
                not isinstance(source, dict)
                or not isinstance(source.get("title"), str)
                or not source["title"].strip()
                or not isinstance(source.get("url"), str)
                or not source["url"].startswith("https://")
            ):
                raise ValueError(
                    f"{location}.sources[{index}] must have a title and HTTPS URL."
                )

    for tab in SUMMARY_TABS:
        tab_document = tabs[tab]
        if not isinstance(tab_document, dict) or "overall" not in tab_document:
            raise ValueError(f"tabs.{tab}.overall is required.")
        validate_summary(tab_document["overall"], f"tabs.{tab}.overall")
        segments = tab_document.get("segments", {})
        if not isinstance(segments, dict):
            raise ValueError(f"tabs.{tab}.segments must be an object.")
        for attribute, values in segments.items():
            if not isinstance(values, dict):
                raise ValueError(
                    f"tabs.{tab}.segments.{attribute} must be an object."
                )
            for value, summary in values.items():
                validate_summary(
                    summary,
                    f"tabs.{tab}.segments.{attribute}.{value}",
                )
    return tabs


def remove_ai_summary_cards(html: str) -> str:
    for tab in SUMMARY_TABS:
        html = html.replace(
            f"<div class=ai-summary data-summary={tab}></div>",
            "",
        )
    return html


def main() -> int:
    options = args()
    progress = ProgressReporter(
        start=options.progress_start,
        end=options.progress_end,
        started_at=options.progress_started_at or time.monotonic(),
    )
    progress.update(0, "Preparing interactive report data")
    config_path = Path(options.config).resolve()
    output = Path(options.output_dir).resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    summary_mode = options.summary_mode or config.get("summary_mode", "off")
    if summary_mode not in {"off", "optional", "required"}:
        raise ValueError(
            "summary_mode must be one of: off, optional, required."
        )
    manifest = json.loads((output / "analysis-manifest.json").read_text(encoding="utf-8"))
    if manifest["repeatability_check"]["status"] != "passed":
        raise ValueError("Interactive report requires a passed repeatability check.")

    survey_path = resolve(config_path.parent, config["survey_csv"])
    frame = pd.read_csv(survey_path)
    questions = config.get("question_cols") or pd.read_csv(output / "descriptives.csv")[
        "question"
    ].tolist()
    scale = int(config["scale_points"])
    normalize_items(frame, questions, scale)
    frame = frame.loc[frame[questions].notna().any(axis=1)].copy()
    if frame.empty:
        raise ValueError("No respondents have a value for any selected survey item.")
    progress.update(8, "Survey responses normalized")
    emp_id = config["emp_id_col"]
    frame["__employee_id"] = frame[emp_id]

    attribute_file = resolve(config_path.parent, config.get("attribute_file"))
    if attribute_file:
        attribute_frame = pd.read_csv(attribute_file)
        frame = frame.merge(
            attribute_frame,
            on=emp_id,
            how="left",
            validate="many_to_one",
        )
    frame = survey_response_rows(frame, questions)

    configured = config.get("attribute_cols") or []
    attributes = (
        list(dict.fromkeys(configured))
        if configured
        else [
            column
            for column in (
                "client_uuid",
                "survey_cycle_title",
                "after_hours_collab",
                "internal_network_size",
                "meeting_hours",
            )
            if column in frame.columns
        ]
    )
    attributes = [
        column
        for column in attributes
        if column in frame.columns and not identifier_column(column)
    ]
    cycle_col = "survey_cycle_title" if "survey_cycle_title" in frame.columns else None
    bucket_numeric(frame, {emp_id, "__employee_id", *questions})

    overall = metrics(frame, questions, scale)
    segments = segment_cube(frame, questions, attributes, scale)
    progress.update(25, "Overall and segment score views prepared")
    progress.update(28, "Building cycle comparisons and repeat-respondent views")
    cycles = cycle_cube(frame, questions, attributes, cycle_col, scale)
    progress.update(42, "Cycle comparisons and repeat-respondent views prepared")
    comment_themes = comment_theme_payload(
        resolve(config_path.parent, config.get("comments_file")),
        frame,
        questions,
        segments,
        emp_id,
        cycle_col,
        config.get("comments_question_col", "question_uuid"),
        config.get("comments_text_col", "comment"),
    )
    progress.update(45, "Clustering relationship matrices for each filter view")
    relationships = relationship_cube(frame, questions, attributes, cycle_col)
    progress.update(60, "Relationship matrices and cluster recommendations prepared")
    factors_path = output / "factor_analysis_summary.csv"
    overall_factor_rows = (
        pd.read_csv(factors_path).to_dict("records") if factors_path.exists() else []
    )
    progress.update(62, "Preparing filter-specific factor models")
    factors = factor_cube(
        frame,
        questions,
        attributes,
        overall_factor_rows,
        progress,
        62,
        84,
        cycle_col,
    )
    progress.update(84, "Filter-specific factor models prepared")
    attrition_status = next(
        (
            item.get("message", item["status"])
            for item in manifest["analyses"]
            if item["name"] == "attrition"
        ),
        "Attrition analysis was not requested.",
    )
    attrition_path = output / "attrition.csv"
    attrition_settings = config.get("embedded_attrition") or {}
    attrition_data: dict[str, Any] | None = None
    alert_data: dict[str, Any] = {
        "questions": questions,
        "labels": [label(question) for question in questions],
        "days": [],
        "defaultDays": None,
        "byDay": {},
        "minimumCategoryN": int(
            attrition_settings.get("minimum_category_n", MIN_N)
        ),
        "method": "",
    }
    if attrition_path.exists():
        attrition_status = "H2-to-Exit attrition analysis completed."
        progress.update(86, "Preparing attrition analysis and alerts")
        minimum_category_n = int(
            attrition_settings.get("minimum_category_n", MIN_N)
        )
        attrition_data = attrition_payload(
            attrition_path,
            questions,
            segments,
            minimum_category_n,
        )
        alert_data = attrition_alert_payload(
            attrition_path,
            questions,
            segments,
            overall,
            minimum_category_n,
        )
        progress.update(90, "Attrition analysis and alerts prepared")
    report_name = f"{output.name}-report.html"
    zip_name = f"{output.name}-share.zip"
    ai_summaries = (
        {}
        if summary_mode == "off"
        else load_ai_summaries(output, required=summary_mode == "required")
    )
    manifest["report_generation"] = {
        "status": "completed",
        "report": report_name,
        "share_zip": zip_name,
        "summary_mode": summary_mode,
        "format_contract": "skills/analyze-survey/references/interactive-report-contract.md",
    }
    (output / "analysis-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    excluded_downloads = {survey_path.name}
    if attribute_file:
        excluded_downloads.add(attribute_file.name)
    if summary_mode == "off":
        excluded_downloads.add("people-science-summaries.json")
    downloads = sorted(
        path.name
        for path in output.iterdir()
        if path.is_file() and path.suffix.lower() in {".csv", ".json"}
        and path.name not in excluded_downloads
    )
    context = summary_context(
        questions,
        cycles,
        relationships,
        alert_data,
        factors,
        attrition_status,
        downloads,
    )
    context_path = output / "people-science-summary-context.json"
    context_path.write_text(
        json.dumps(context, indent=2) + "\n",
        encoding="utf-8",
    )
    if context_path.name not in downloads:
        downloads.append(context_path.name)
        downloads.sort()
    data = {
        "aiSummaries": ai_summaries,
        "knowledgeSources": json.loads(
            (
                Path(__file__).resolve().parents[1]
                / "skills"
                / "analyze-survey"
                / "references"
                / "people-science-source-index.json"
            ).read_text(encoding="utf-8")
        ) if ai_summaries else {},
        "questions": questions,
        "labels": {question: label(question) for question in questions},
        "overall": overall,
        "segments": segments,
        "cycles": cycles,
        "commentThemes": comment_themes,
        "relationships": relationships,
        "alerts": alert_data,
        "factors": factors,
        "attrition": attrition_status,
        "attritionData": attrition_data,
        "downloads": downloads,
    }
    report_path = output / report_name
    report_html = html_page(data)
    report_html = prepare_report_shell(report_html, attrition_data is not None)
    if attrition_data is not None:
        minimum_category_n = int(
            attrition_settings.get("minimum_category_n", MIN_N)
        )
        report_html = inject_attrition_report(
            report_html,
            attrition_data,
            alert_data,
            attrition_settings.get("predictor_completion_date"),
        )
        manifest["attrition_report"] = {
            "format": "live_multiplier_table",
            "default_window_days": 180,
            "available_windows_days": attrition_data["days"],
            "items": len(attrition_data["questions"]),
            "uses_shared_report_filter": True,
            "embedded_aggregate_rows": len(attrition_data["rows"]),
            "minimum_category_n": minimum_category_n,
            "source_artifact": attrition_path.name,
        }
        default_alert_days = alert_data["defaultDays"]
        manifest["attrition_alerts_report"] = {
            "format": "top_attrition_items_lowest_group_scores",
            "default_window_days": default_alert_days,
            "top_items_per_attribute": 5,
            "attributes": len(
                alert_data["byDay"].get(str(default_alert_days), {})
            ),
            "source_artifact": attrition_path.name,
        }
        (output / "analysis-manifest.json").write_text(
            json.dumps(manifest, indent=2) + "\n",
            encoding="utf-8",
        )
    if not ai_summaries:
        report_html = remove_ai_summary_cards(report_html)
    report_path.write_text(report_html, encoding="utf-8")
    progress.update(96, "Interactive HTML report written")

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
    progress.update(100, "Safe share package written")
    print(json.dumps({"report": str(report_path), "share_zip": str(zip_path)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

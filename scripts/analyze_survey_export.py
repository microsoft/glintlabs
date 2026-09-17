#!/usr/bin/env python
"""Turn a CSV or XLSX survey export into the standard interactive report."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

import pandas as pd

SCRIPT_DIR = str(Path(__file__).resolve().parent)
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from progress import ProgressReporter


EMPLOYEE_ID_CANDIDATES = (
    "user_id",
    "employee_id",
    "employeeid",
    "respondent_id",
    "respondentid",
    "person_id",
    "personid",
)
SURVEY_SHEET_CANDIDATES = ("sheet1", "survey", "responses", "survey responses")
ATTRIBUTE_SHEET_CANDIDATES = (
    "user_properties",
    "attributes",
    "employee attributes",
    "demographics",
)
SENSITIVE_ATTRIBUTE_TOKENS = (
    "comment",
    "email",
    "first_name",
    "firstname",
    "last_name",
    "lastname",
    "full_name",
    "fullname",
    "address",
    "phone",
)
OUTCOME_ATTRIBUTE_TOKENS = (
    "attrition",
    "termination",
    "exit date",
)
PREFERRED_ATTRIBUTES = (
    "survey_cycle_title",
    "survey_cycle",
    "organization",
    "organization_group",
    "management_level",
    "job_title",
    "location",
    "tenure",
)
IDENTIFIER_ATTRIBUTE_NAMES = {
    normalized
    for normalized in (
        "user_id",
        "employee_id",
        "employeeid",
        "respondent_id",
        "respondentid",
        "person_id",
        "personid",
        "manager_id",
        "managerid",
        "team_id",
        "teamid",
        "client_uuid",
        "clientuuid",
        "survey_cycle_id",
        "surveycycleid",
    )
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze a survey export and create an interactive HTML report."
    )
    parser.add_argument("--survey-export", required=True, help="CSV or XLSX survey export.")
    parser.add_argument("--output-dir", required=True, help="Directory for generated outputs.")
    parser.add_argument("--sheet", help="Survey worksheet name for XLSX inputs.")
    parser.add_argument("--attribute-sheet", help="Optional employee-attribute worksheet name.")
    parser.add_argument("--emp-id-col", help="Employee/respondent identifier column.")
    parser.add_argument("--scale-points", type=int, default=5)
    parser.add_argument(
        "--question-cols",
        nargs="+",
        help="Explicit item columns. Defaults to numeric Q_* columns.",
    )
    parser.add_argument(
        "--attribute-cols",
        nargs="+",
        help="Explicit report attributes. Defaults to privacy-safe categorical columns.",
    )
    parser.add_argument("--min-group-size", type=int, default=5)
    return parser.parse_args()


def normalized_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def choose_name(available: list[str], requested: str | None, candidates: tuple[str, ...]) -> str:
    if requested:
        if requested not in available:
            raise ValueError(
                f"Worksheet '{requested}' was not found. Available worksheets: "
                + ", ".join(available)
            )
        return requested
    lookup = {normalized_name(name): name for name in available}
    for candidate in candidates:
        match = lookup.get(normalized_name(candidate))
        if match:
            return match
    return available[0]


def detect_emp_id(frame: pd.DataFrame, configured: str | None) -> str:
    if configured:
        if configured not in frame.columns:
            raise ValueError(f"Employee ID column '{configured}' was not found.")
        return configured
    lookup = {normalized_name(str(column)): str(column) for column in frame.columns}
    for candidate in EMPLOYEE_ID_CANDIDATES:
        match = lookup.get(normalized_name(candidate))
        if match:
            return match
    raise ValueError(
        "Could not detect an employee ID column. Pass --emp-id-col explicitly."
    )


def numeric_series(frame: pd.DataFrame, column: str) -> pd.Series:
    return pd.to_numeric(frame[column], errors="coerce")


def detect_questions(
    frame: pd.DataFrame,
    emp_id_col: str,
    configured: list[str] | None,
    scale_points: int,
) -> list[str]:
    auto_detected = configured is None
    if configured:
        missing = [column for column in configured if column not in frame.columns]
        if missing:
            raise ValueError("Question columns not found: " + ", ".join(missing))
        questions = configured
    else:
        questions = [
            str(column)
            for column in frame.columns
            if str(column).upper().startswith("Q_")
            and numeric_series(frame, str(column)).notna().any()
        ]
    if not questions:
        raise ValueError(
            "No numeric Q_* survey items were found. Pass --question-cols explicitly."
        )
    valid_questions = []
    invalid = []
    for question in questions:
        numeric = numeric_series(frame, question)
        values = numeric.dropna()
        unique = sorted(values.unique())
        if values.empty:
            invalid.append(question)
            continue
        if values.min() >= 1 and values.max() <= scale_points:
            frame[question] = numeric
            valid_questions.append(question)
            continue
        if len(unique) == scale_points:
            mapping = {value: index + 1 for index, value in enumerate(unique)}
            frame[question] = numeric.map(mapping)
            valid_questions.append(question)
            continue
        if not auto_detected:
            invalid.append(question)
    if invalid:
        raise ValueError(
            f"Question values must be between 1 and {scale_points}: "
            + ", ".join(invalid)
        )
    if not valid_questions:
        raise ValueError(
            "No numeric Q_* survey items matched the configured scale. "
            "Pass --question-cols explicitly."
        )
    if emp_id_col in valid_questions:
        raise ValueError("The employee ID column cannot also be a survey item.")
    return valid_questions


def safe_attribute(column: str) -> bool:
    normalized = column.casefold()
    compact = normalized_name(column)
    if any(token in normalized for token in SENSITIVE_ATTRIBUTE_TOKENS):
        return False
    if any(token in normalized for token in OUTCOME_ATTRIBUTE_TOKENS):
        return False
    if compact in IDENTIFIER_ATTRIBUTE_NAMES:
        return False
    if re.search(r"(?:^|[^a-z0-9])(id|uuid|guid)$", normalized):
        return False
    return True


def sidecar_config(source: Path) -> dict[str, Any]:
    config_path = source.with_name("config.json")
    if not config_path.exists():
        return {}
    config = json.loads(config_path.read_text(encoding="utf-8"))
    configured_source = config.get("survey_csv")
    if configured_source and Path(configured_source).name == source.name:
        return config
    return {}


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def linked_source_registry(source: Path) -> dict[str, Any]:
    if "viva glint dataset with attributes" not in source.name.casefold():
        return {}
    registry = (
        Path(__file__).resolve().parents[1]
        / "skills"
        / "analyze-survey"
        / "references"
        / "linked-dataset.json"
    )
    if not registry.exists():
        return {}
    return json.loads(registry.read_text(encoding="utf-8"))


def linked_source_url(source: Path) -> str | None:
    return linked_source_registry(source).get("source_url")


def detect_attributes(
    frame: pd.DataFrame,
    excluded: set[str],
    configured: list[str] | None,
) -> list[str]:
    if configured:
        missing = [column for column in configured if column not in frame.columns]
        if missing:
            raise ValueError("Attribute columns not found: " + ", ".join(missing))
        unsafe = [column for column in configured if not safe_attribute(column)]
        if unsafe:
            raise ValueError(
                "Attribute columns cannot contain identifiers or sensitive data: "
                + ", ".join(unsafe)
            )
        return configured

    candidates = []
    for column in frame.columns:
        name = str(column)
        if name in excluded or not safe_attribute(name):
            continue
        unique = int(frame[name].nunique(dropna=True))
        if 2 <= unique <= 50 or normalized_name(name) in {
            normalized_name(item) for item in PREFERRED_ATTRIBUTES
        }:
            candidates.append(name)
    preferred = {normalized_name(name): index for index, name in enumerate(PREFERRED_ATTRIBUTES)}
    return sorted(
        candidates,
        key=lambda name: (preferred.get(normalized_name(name), len(preferred)), name.casefold()),
    )


def read_export(
    source: Path,
    input_dir: Path,
    sheet: str | None,
    attribute_sheet: str | None,
) -> tuple[pd.DataFrame, Path, pd.DataFrame | None, Path | None, dict[str, str | None]]:
    suffix = source.suffix.casefold()
    if suffix == ".csv":
        return pd.read_csv(source), source, None, None, {
            "survey_sheet": None,
            "attribute_sheet": None,
        }
    if suffix not in {".xlsx", ".xlsm"}:
        raise ValueError("Survey export must be a .csv, .xlsx, or .xlsm file.")

    workbook = pd.ExcelFile(source)
    survey_sheet = choose_name(workbook.sheet_names, sheet, SURVEY_SHEET_CANDIDATES)
    survey = pd.read_excel(workbook, sheet_name=survey_sheet)
    survey_csv = input_dir / "survey.csv"
    survey.to_csv(survey_csv, index=False)

    selected_attribute_sheet = attribute_sheet
    if not selected_attribute_sheet:
        matches = [
            name
            for name in workbook.sheet_names
            if normalized_name(name)
            in {normalized_name(candidate) for candidate in ATTRIBUTE_SHEET_CANDIDATES}
        ]
        selected_attribute_sheet = matches[0] if matches else None
    if not selected_attribute_sheet:
        return survey, survey_csv, None, None, {
            "survey_sheet": survey_sheet,
            "attribute_sheet": None,
        }
    if selected_attribute_sheet not in workbook.sheet_names:
        raise ValueError(f"Attribute worksheet '{selected_attribute_sheet}' was not found.")

    attributes = pd.read_excel(workbook, sheet_name=selected_attribute_sheet)
    attributes_csv = input_dir / "attributes.csv"
    attributes.to_csv(attributes_csv, index=False)
    return survey, survey_csv, attributes, attributes_csv, {
        "survey_sheet": survey_sheet,
        "attribute_sheet": selected_attribute_sheet,
    }


def build_config(options: argparse.Namespace, output: Path) -> Path:
    source = Path(options.survey_export).resolve()
    if not source.exists():
        raise FileNotFoundError(f"Survey export not found: {source}")
    if not 2 <= options.scale_points <= 11:
        raise ValueError("--scale-points must be between 2 and 11.")
    if options.min_group_size < 5:
        raise ValueError("--min-group-size must be at least 5.")

    input_dir = output / "_input"
    input_dir.mkdir(parents=True, exist_ok=True)
    registered_defaults = sidecar_config(source)
    survey, survey_path, attribute_frame, attribute_path, workbook_source = read_export(
        source, input_dir, options.sheet, options.attribute_sheet
    )
    emp_id_col = detect_emp_id(
        survey,
        options.emp_id_col or registered_defaults.get("emp_id_col"),
    )
    questions = detect_questions(
        survey,
        emp_id_col,
        options.question_cols,
        options.scale_points,
    )
    normalized_survey_path = input_dir / "survey.csv"
    survey.to_csv(normalized_survey_path, index=False)
    survey_path = normalized_survey_path

    configured_attributes = options.attribute_cols or registered_defaults.get(
        "attribute_cols"
    )
    inline_attributes = (
        detect_attributes(
            survey,
            {emp_id_col, *questions},
            configured_attributes,
        )
        if attribute_frame is None
        else []
    )
    external_attributes: list[str] = []
    if attribute_frame is not None:
        external_emp_id = detect_emp_id(attribute_frame, emp_id_col)
        if external_emp_id != emp_id_col:
            attribute_frame = attribute_frame.rename(columns={external_emp_id: emp_id_col})
            assert attribute_path is not None
            attribute_frame.to_csv(attribute_path, index=False)
        external_attributes = detect_attributes(
            attribute_frame,
            {emp_id_col},
            configured_attributes,
        )
        external_attributes = [
            column for column in external_attributes if column not in survey.columns
        ]

    attribute_cols = list(dict.fromkeys([*inline_attributes, *external_attributes]))
    analyses = [
        "descriptives",
        "response_distribution",
        "correlations",
        "factor_analysis",
    ]
    if attribute_cols:
        analyses.append("by_attribute")
    linked_source = linked_source_registry(source)
    attrition = linked_source.get("attrition")
    if attrition:
        required = {
            attrition["cycle_column"],
            attrition["termination_date_column"],
        }
        if required.issubset(survey.columns):
            analyses.append("attrition")

    config: dict[str, Any] = {
        "survey_csv": str(survey_path),
        "input_format": "wide_items",
        "scale_points": options.scale_points,
        "emp_id_col": emp_id_col,
        "question_cols": questions,
        "attribute_cols": attribute_cols,
        "min_group_size": options.min_group_size,
        "analyses": analyses,
        "source_file_name": source.name,
        "source_sha256": file_sha256(source),
        "source_url": linked_source_url(source),
        "source_survey_sheet": workbook_source["survey_sheet"],
        "source_attribute_sheet": workbook_source["attribute_sheet"],
    }
    if attrition and "attrition" in analyses:
        config["embedded_attrition"] = attrition
        config["attrition_attribute_cols"] = attribute_cols
    if attribute_cols:
        config["attribute_view_mode"] = "separate"
    if attribute_path:
        config["attribute_file"] = str(attribute_path)

    config_path = input_dir / "analysis-config.json"
    config_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    return config_path


def main() -> int:
    options = parse_args()
    progress = ProgressReporter()
    progress.update(0, "Starting survey report generation")
    output = Path(options.output_dir).resolve()
    output.mkdir(parents=True, exist_ok=True)
    progress.update(3, "Reading the survey export and detecting its structure")
    config_path = build_config(options, output)
    progress.update(10, "Input prepared; starting the analysis pipeline")
    command = [
        sys.executable,
        str(Path(__file__).with_name("run_vivaglint_analysis.py")),
        "--config",
        str(config_path),
        "--output-dir",
        str(output),
        "--progress-start",
        "10",
        "--progress-end",
        "100",
        "--progress-started-at",
        str(progress.started_at),
    ]
    completed = subprocess.run(command, check=False)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())

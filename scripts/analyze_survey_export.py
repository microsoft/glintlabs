#!/usr/bin/env python
"""Turn a CSV or XLSX survey export into the standard interactive report."""

from __future__ import annotations

import argparse
import csv
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
from attrition_discovery import (
    candidate_kind, exit_cycle_labels, inspect_source, normalized_name,
    outcome_name_hint,
)


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
COMMENT_SHEET_CANDIDATES = ("comments", "comment", "verbatims", "open text")
OPTIONAL_ANALYSES = (
    "correlations",
    "factor_analysis",
    "attrition",
    "scores_change",
    "response_distribution",
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
PLATFORM_METADATA = (
    "Survey Cycle Creation Date",
    "Survey Cycle Completion Date",
    "Survey Cycle Title",
    "Survey Cycle UUID",
    "Survey Cycle Sent Date",
)
QUESTION_COMPANIONS = ("_COMMENT", "_COMMENT_TOPICS", "_SENSITIVE_COMMENT_FLAG")
PREPARATION_REASONS = {
    "attrition_unavailable": "Attrition analysis was excluded because outcome columns, dates, or predictor/Exit cycle mappings could not be established reliably. Uncertain outcome data was not used.",
    "attrition_not_provided": "Attrition analysis was excluded because reliable exit outcomes were not provided. Matching employee IDs, actual exit dates, predictor survey timing, and outcome coverage are needed.",
    "attrition_followup": "Attrition follow-up windows extending beyond the confirmed outcome observation date were excluded.",
    "incomplete_question": "An incomplete or out-of-order question block was excluded.",
    "question_excluded": "A question was excluded by the confirmed loading decisions.",
    "invalid_scores": "Nonblank responses outside the confirmed integer scale were excluded.",
    "empty_question": "A question with no usable scores was excluded.",
    "invalid_records": "Records with missing or ambiguous respondent/cycle keys were excluded.",
    "attribute_excluded": "An attribute was excluded because its meaning was not established or it was not selected; comparisons using it are unavailable.",
    "private_attribute": "An identifying, sensitive, or overly granular attribute was excluded.",
    "comment_excluded": "Sensitive or unknown-flag comments and their topics were excluded; eligible scores were retained.",
    "orphan_topics": "Topics without comment text were excluded.",
    "no_attributes": "No attributes were retained, so attribute comparisons are unavailable.",
}


class AttritionUnavailableError(ValueError):
    def __init__(self, message: str, code: str = "attrition_unavailable"):
        super().__init__(message)
        self.code = code


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
    parser.add_argument(
        "--analyses",
        nargs="*",
        choices=OPTIONAL_ANALYSES,
        help="Optional reports to run. An empty list runs item scores only; omission preserves legacy defaults.",
    )
    parser.add_argument(
        "--attrition-config",
        help="JSON Exit-analysis settings when outcome columns or cycles are ambiguous.",
    )
    parser.add_argument("--exit-data", help="User-provided CSV/XLSX/XLSM exit outcomes.")
    parser.add_argument("--exit-sheet", help="Exit worksheet in --exit-data or the survey workbook.")
    parser.add_argument(
        "--inspect-attrition", action="store_true",
        help="Search all input worksheets for exit dates/flags without running analysis.",
    )
    parser.add_argument(
        "--inspect-only", action="store_true",
        help="Write a private platform-export preparation proposal without running analysis.",
    )
    parser.add_argument(
        "--preparation-decisions",
        help="User-confirmed, source-bound JSON decisions for a platform export.",
    )
    parser.add_argument(
        "--summary-mode",
        choices=("off", "optional", "required"),
        default="off",
        help="Control AI People Science summaries in the generated report.",
    )
    return parser.parse_args()


def apply_analysis_selection(config: dict[str, Any], options: argparse.Namespace) -> None:
    selected = getattr(options, "analyses", None)
    if selected is None:
        return
    unknown = set(selected) - set(OPTIONAL_ANALYSES)
    if unknown:
        raise ValueError("Unknown analyses: " + ", ".join(sorted(unknown)))
    config["selected_analyses"] = list(dict.fromkeys(selected))
    config["analyses"] = [
        name for name in config["analyses"]
        if name in {"descriptives", "by_attribute"} or name in selected
    ]


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
            and candidate_kind(str(column), frame[column]) not in {"flag_or_status", "exit_date"}
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
    if outcome_name_hint(column):
        return False
    if compact in IDENTIFIER_ATTRIBUTE_NAMES:
        return False
    if re.search(r"(?:^|[^a-z0-9])(id|uuid|guid)$", normalized):
        return False
    return True


def sidecar_config(source: Path) -> dict[str, Any]:
    config_path = source.with_name("config.json")
    if not config_path.exists():
        config = {}
    else:
        config = json.loads(config_path.read_text(encoding="utf-8"))
        configured_source = config.get("survey_csv")
        if configured_source and Path(configured_source).name == source.name:
            return config

    registry = (
        Path(__file__).resolve().parents[1]
        / "skills"
        / "analyze-survey"
        / "references"
        / "linked-dataset.json"
    )
    if registry.exists():
        registered = json.loads(registry.read_text(encoding="utf-8"))
        registered_path = registered.get("source_path")
        if registered_path and Path(registered_path).name == source.name:
            return registered
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


def resolve_attrition_settings(
    survey: pd.DataFrame,
    settings: dict[str, Any],
) -> dict[str, Any]:
    resolved = dict(settings)
    completion_column = settings.get("predictor_completion_date_column")
    if not completion_column:
        return resolved

    cycle_column = settings.get("cycle_column")
    predictor_cycle = settings.get("predictor_cycle")
    population = survey[survey[cycle_column] == predictor_cycle] if cycle_column else survey
    values = population[completion_column].dropna()
    values = values.loc[values.astype(str).str.strip().ne("")]
    if pd.api.types.is_datetime64_any_dtype(values):
        dates = pd.to_datetime(values, errors="coerce")
    else:
        numeric = pd.to_numeric(values, errors="coerce")
        all_numeric = (
            numeric.notna().sum() == values.notna().sum()
            and numeric.notna().any()
        )
        if all_numeric:
            dates = pd.to_datetime(
                numeric,
                unit="D",
                origin="1899-12-30",
                errors="coerce",
            )
        else:
            dates = pd.to_datetime(values, errors="coerce")
    if dates.isna().any():
        raise AttritionUnavailableError(f"Invalid predictor completion dates in '{completion_column}'.")
    unique_dates = dates.dropna().dt.normalize().unique()
    if len(unique_dates) != 1:
        raise AttritionUnavailableError(
            f"Expected one completion date in '{completion_column}' for "
            f"predictor cycle {predictor_cycle}; found {len(unique_dates)}."
        )
    resolved["predictor_completion_date"] = pd.Timestamp(
        unique_dates[0]
    ).date().isoformat()
    return resolved


def read_exit_data(
    config: dict[str, Any], options: argparse.Namespace, settings: dict[str, Any],
) -> pd.DataFrame | None:
    source_name = getattr(options, "exit_data", None)
    sheet = getattr(options, "exit_sheet", None)
    if not source_name and not sheet:
        return None
    source = Path(source_name or options.survey_export).resolve()
    if source.suffix.casefold() == ".csv":
        if sheet:
            raise AttritionUnavailableError("--exit-sheet requires an Excel workbook.")
        frame = pd.read_csv(source, dtype=str, keep_default_na=False)
    elif source.suffix.casefold() in {".xlsx", ".xlsm"}:
        with pd.ExcelFile(source) as workbook:
            if not sheet:
                discovery = inspect_source(source)
                sheets = {
                    item["sheet"] for item in discovery["candidates"]
                    if item["kind"] == "exit_date"
                }
                if len(sheets) != 1:
                    raise AttritionUnavailableError("Choose the outcome worksheet with --exit-sheet.")
                sheet = sheets.pop()
            if sheet not in workbook.sheet_names:
                raise AttritionUnavailableError("The selected exit worksheet does not exist.")
            frame = pd.read_excel(workbook, sheet_name=sheet, dtype=str, keep_default_na=False)
    else:
        raise AttritionUnavailableError("Exit data must be a CSV, XLSX, or XLSM file.")
    employee_id = settings.get("outcome_emp_id_col")
    if not employee_id and config["emp_id_col"] in frame:
        employee_id = config["emp_id_col"]
    if not employee_id:
        matches = [
            name for name in frame
            if normalized_name(name) in {normalized_name(value) for value in EMPLOYEE_ID_CANDIDATES}
        ]
        if len(matches) != 1:
            raise AttritionUnavailableError("Confirm outcome_emp_id_col in --attrition-config.")
        employee_id = matches[0]
    if employee_id not in frame:
        raise AttritionUnavailableError("The configured outcome employee ID column is missing.")
    return frame.rename(columns={employee_id: config["emp_id_col"]})


def configure_attrition(
    config: dict[str, Any],
    survey: pd.DataFrame,
    attributes: pd.DataFrame | None,
    options: argparse.Namespace,
    defaults: dict[str, Any],
) -> None:
    selected = getattr(options, "analyses", None)
    if selected is not None and "attrition" not in selected:
        return
    try:
        _configure_attrition(config, survey, attributes, options, defaults)
    except AttritionUnavailableError as error:
        config.setdefault("analysis_limitations", []).append({
            "code": error.code, "columns": [],
        })
        print(f"Attrition excluded; recorded in Limitations: {error}", file=sys.stderr)
        print(
            "I can run attrition analysis with matching employee IDs, actual exit dates, "
            "predictor survey/completion date, and outcome population coverage/as-of date. "
            "Point to a column or worksheet, or provide --exit-data and --attrition-config.",
            file=sys.stderr,
        )


def _configure_attrition(
    config: dict[str, Any],
    survey: pd.DataFrame,
    attributes: pd.DataFrame | None,
    options: argparse.Namespace,
    defaults: dict[str, Any],
) -> None:
    from run_vivaglint_analysis import parse_termination_dates

    settings_path = getattr(options, "attrition_config", None)
    supplied = (
        json.loads(Path(settings_path).read_text(encoding="utf-8"))
        if settings_path else defaults.get("embedded_attrition") or defaults.get("attrition")
    )
    if supplied is not None and not isinstance(supplied, dict):
        raise AttritionUnavailableError("Attrition settings must be a JSON object.")
    settings = dict(supplied or {})
    data = survey
    if attributes is not None:
        extra = [column for column in attributes if column not in survey.columns]
        data = survey.merge(
            attributes[[config["emp_id_col"], *extra]],
            on=config["emp_id_col"], how="left", validate="many_to_one",
        )

    def column(candidates: tuple[str, ...]) -> str | None:
        matches = [
            name for name in data
            if normalized_name(name) in {normalized_name(value) for value in candidates}
        ]
        if len(matches) > 1:
            raise AttritionUnavailableError("Ambiguous attrition columns; confirm mappings with --attrition-config.")
        return matches[0] if matches else None

    external = read_exit_data(config, options, settings)
    outcome_data = external if external is not None else data
    term_column = settings.get("termination_date_column")
    if not term_column:
        matches = [
            name for name in outcome_data
            if name not in config["question_cols"]
            and candidate_kind(name, outcome_data[name]) == "exit_date"
        ]
        if len(matches) != 1:
            hints = any(outcome_name_hint(name) for name in outcome_data)
            raise AttritionUnavailableError(
                "No unique, reliable actual exit-date column was established. "
                "Review _input/attrition-discovery.json and confirm the column or provide exit data.",
                "attrition_unavailable" if hints else "attrition_not_provided",
            )
        term_column = matches[0]
    if term_column not in outcome_data:
        raise AttritionUnavailableError("The configured termination-date column is missing.")
    settings["termination_date_column"] = term_column
    config["attribute_cols"] = [name for name in config["attribute_cols"] if name != term_column]
    if not config["attribute_cols"] and "by_attribute" in config["analyses"]:
        config["analyses"].remove("by_attribute")
    if config["scale_points"] != 5:
        raise AttritionUnavailableError("Embedded attrition requires a confirmed five-point response scale.")
    cycle_column = settings.get("cycle_column") or next(
        (name for name in ("survey_cycle_id", "survey_cycle", "survey_cycle_title") if name in data), None,
    )
    if cycle_column and cycle_column not in data:
        raise AttritionUnavailableError("The configured predictor cycle column is missing.")
    if cycle_column:
        settings["cycle_column"] = cycle_column
    if external is None and "outcome_cycle" not in settings and cycle_column:
        title_column = "survey_cycle_title" if "survey_cycle_title" in data else cycle_column
        outcome_cycles = data.loc[exit_cycle_labels(data[title_column]), cycle_column].dropna().unique()
        if not len(outcome_cycles):
            outcome_only = data[config["question_cols"]].isna().all(axis=1) & data[term_column].notna()
            outcome_cycles = data.loc[outcome_only, cycle_column].dropna().unique()
        if len(outcome_cycles) > 1:
            raise AttritionUnavailableError("The Exit cycle is ambiguous; confirm --attrition-config.")
        if len(outcome_cycles) == 1:
            cycle = outcome_cycles[0]
            settings["outcome_cycle"] = cycle.item() if hasattr(cycle, "item") else cycle
    completion_column = settings.get("predictor_completion_date_column")
    if not completion_column and not settings.get("predictor_completion_date"):
        completion_column = column((
            "survey_completion_date", "Survey Cycle Completion Date", "completion_date",
        ))
        if not completion_column:
            raise AttritionUnavailableError("Confirm the predictor completion date in --attrition-config.")
        settings["predictor_completion_date_column"] = completion_column
    if completion_column and completion_column not in data:
        raise AttritionUnavailableError("The predictor completion-date column is missing.")
    predictors = data[data[config["question_cols"]].notna().any(axis=1)]
    if cycle_column and "outcome_cycle" in settings:
        predictors = predictors[predictors[cycle_column].ne(settings["outcome_cycle"])]
    if cycle_column and "predictor_cycle" not in settings:
        candidates = []
        for cycle in predictors[cycle_column].dropna().unique():
            resolved = resolve_attrition_settings(predictors, {
                **settings, "predictor_cycle": cycle,
            })
            if not resolved.get("predictor_completion_date"):
                raise AttritionUnavailableError("Multiple predictor cycles need confirmed completion-date chronology.")
            candidates.append((resolved["predictor_completion_date"], cycle))
        if not candidates:
            raise AttritionUnavailableError("Exit data has no predictor survey cycle; provide --attrition-config.")
        latest = max(date for date, _ in candidates)
        latest_cycles = [cycle for date, cycle in candidates if date == latest]
        if len(latest_cycles) != 1:
            raise AttritionUnavailableError("Predictor chronology is ambiguous; confirm cycles with --attrition-config.")
        cycle = latest_cycles[0]
        settings["predictor_cycle"] = cycle.item() if hasattr(cycle, "item") else cycle
    if cycle_column:
        predictors = predictors[predictors[cycle_column] == settings["predictor_cycle"]]
    predictor_ids = predictors[config["emp_id_col"]]
    if (
        predictors.empty or predictor_ids.duplicated().any()
        or predictor_ids.isna().any() or predictor_ids.astype(str).str.strip().eq("").any()
    ):
        raise AttritionUnavailableError("The predictor population is empty or contains duplicate employee IDs.")
    settings = resolve_attrition_settings(predictors, settings)
    completion = pd.to_datetime(settings.get("predictor_completion_date"), errors="coerce")
    if completion is None or pd.isna(completion):
        raise AttritionUnavailableError("Attrition requires a valid predictor_completion_date or completion-date column.")
    embedded = external is None and "outcome_cycle" in settings
    if embedded:
        if settings["predictor_cycle"] == settings["outcome_cycle"]:
            raise AttritionUnavailableError("Predictor and Exit cycles must be distinct.")
        outcomes = data[data[cycle_column] == settings["outcome_cycle"]][[config["emp_id_col"], term_column]].copy()
    else:
        outcomes = outcome_data[[config["emp_id_col"], term_column]].copy()
        nonempty = outcomes[term_column].notna() & outcomes[term_column].astype(str).str.strip().ne("")
        outcomes = outcomes.loc[nonempty].drop_duplicates()
    if outcomes.empty:
        raise AttritionUnavailableError("No actual exit dates were provided.")
    outcome_ids = outcomes[config["emp_id_col"]]
    if outcome_ids.isna().any() or outcome_ids.astype(str).str.strip().eq("").any():
        raise AttritionUnavailableError("Exit outcomes contain missing employee IDs.")
    if outcomes[config["emp_id_col"]].duplicated().any():
        raise AttritionUnavailableError("Exit survey outcomes must contain one row per employee.")
    dates = parse_termination_dates(outcomes[term_column])
    if dates.isna().any():
        raise AttritionUnavailableError("Exit survey termination dates contain invalid values.")
    matched = outcomes[config["emp_id_col"]].isin(predictors[config["emp_id_col"]])
    if not matched.any():
        raise AttritionUnavailableError("Outcome employee IDs do not match the predictor population.")
    if (dates.loc[matched] <= completion).any():
        raise AttritionUnavailableError("Matched exit dates must follow the predictor survey completion date.")
    periods = settings.get("time_periods", [90, 180, 365])
    minimum = settings.get("minimum_category_n", config["min_group_size"])
    if not isinstance(periods, list) or not periods or any(type(days) is not int or days <= 0 for days in periods):
        raise AttritionUnavailableError("Attrition time_periods must contain positive integer day windows.")
    if type(minimum) is not int or minimum < config["min_group_size"]:
        raise AttritionUnavailableError("Attrition minimum_category_n cannot weaken the configured minimum group size.")
    if not embedded:
        as_of = pd.to_datetime(settings.get("outcome_as_of_date"), errors="coerce")
        if settings.get("outcome_population_confirmed") is not True or as_of is None or pd.isna(as_of):
            raise AttritionUnavailableError(
                "Confirm outcome_population_confirmed=true and outcome_as_of_date before treating unmatched employees as non-leavers."
            )
        if (dates > as_of).any():
            raise AttritionUnavailableError("Exit dates exceed the confirmed outcome observation date.")
        observed = [days for days in periods if completion + pd.Timedelta(days=days) <= as_of]
        if not observed:
            raise AttritionUnavailableError("No requested attrition window has complete follow-up coverage.")
        if observed != periods:
            config.setdefault("analysis_limitations", []).append({
                "code": "attrition_followup", "columns": [],
            })
        periods = observed
        outcomes_path = Path(config["survey_csv"]).parent / "exit-outcomes.csv"
        outcomes[term_column] = dates.dt.strftime("%Y-%m-%d")
        outcomes.to_csv(outcomes_path, index=False)
        settings["outcome_file"] = str(outcomes_path)
    settings.update(time_periods=periods, minimum_category_n=minimum)
    config["analyses"].append("attrition")
    config["embedded_attrition"] = settings
    config["attrition_attribute_cols"] = config["attribute_cols"]


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
    employee_id: str | None = None,
) -> tuple[
    pd.DataFrame,
    Path,
    pd.DataFrame | None,
    Path | None,
    Path | None,
    dict[str, str | None],
]:
    def id_types(columns: Any) -> dict[str, type[str]]:
        return {
            name: str for name in columns
            if name == employee_id or normalized_name(name) in {
                normalized_name(value) for value in EMPLOYEE_ID_CANDIDATES
            }
        }

    suffix = source.suffix.casefold()
    if suffix == ".csv":
        headers = pd.read_csv(source, nrows=0).columns
        return pd.read_csv(source, converters=id_types(headers)), source, None, None, None, {
            "survey_sheet": None,
            "attribute_sheet": None,
            "comment_sheet": None,
        }
    if suffix not in {".xlsx", ".xlsm"}:
        raise ValueError("Survey export must be a .csv, .xlsx, or .xlsm file.")

    workbook = pd.ExcelFile(source)
    survey_sheet = choose_name(workbook.sheet_names, sheet, SURVEY_SHEET_CANDIDATES)
    headers = pd.read_excel(workbook, sheet_name=survey_sheet, nrows=0).columns
    survey = pd.read_excel(workbook, sheet_name=survey_sheet, converters=id_types(headers))
    survey_csv = input_dir / "survey.csv"
    survey.to_csv(survey_csv, index=False)

    comment_sheet = next(
        (
            name
            for name in workbook.sheet_names
            if normalized_name(name)
            in {normalized_name(candidate) for candidate in COMMENT_SHEET_CANDIDATES}
        ),
        None,
    )
    comments_csv = None
    if comment_sheet:
        comments = pd.read_excel(workbook, sheet_name=comment_sheet)
        required_comment_columns = {"comment", "question_uuid"}
        if required_comment_columns.issubset(comments.columns):
            comments_csv = input_dir / "comments.csv"
            comments.to_csv(comments_csv, index=False)

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
        return survey, survey_csv, None, None, comments_csv, {
            "survey_sheet": survey_sheet,
            "attribute_sheet": None,
            "comment_sheet": comment_sheet,
        }
    if selected_attribute_sheet not in workbook.sheet_names:
        raise ValueError(f"Attribute worksheet '{selected_attribute_sheet}' was not found.")

    headers = pd.read_excel(workbook, sheet_name=selected_attribute_sheet, nrows=0).columns
    attributes = pd.read_excel(workbook, sheet_name=selected_attribute_sheet, converters=id_types(headers))
    attributes_csv = input_dir / "attributes.csv"
    attributes.to_csv(attributes_csv, index=False)
    return survey, survey_csv, attributes, attributes_csv, comments_csv, {
        "survey_sheet": survey_sheet,
        "attribute_sheet": selected_attribute_sheet,
        "comment_sheet": comment_sheet,
    }


def read_platform_export(
    source: Path, options: argparse.Namespace,
) -> tuple[pd.DataFrame, str | None] | None:
    if source.suffix.casefold() == ".csv":
        with source.open(encoding="utf-8-sig", newline="") as stream:
            headers = next(csv.reader(stream), [])
        worksheet = None
    elif source.suffix.casefold() in {".xlsx", ".xlsm"}:
        with pd.ExcelFile(source) as workbook:
            worksheet = choose_name(workbook.sheet_names, options.sheet, SURVEY_SHEET_CANDIDATES)
            first_row = pd.read_excel(
                workbook, sheet_name=worksheet, header=None, nrows=1,
                dtype=str, keep_default_na=False,
            )
            headers = first_row.iloc[0].tolist() if not first_row.empty else []
    else:
        return None
    native = "Survey Cycle UUID" in headers or any(
        str(header).endswith(QUESTION_COMPANIONS) for header in headers
    )
    if not native:
        return None
    if any(not str(header).strip() for header in headers) or len(set(headers)) != len(headers):
        raise ValueError(
            "Platform export has blank or duplicate headers. Ask the user to resolve "
            "the ambiguous column identities before preparation; no analysis was run."
        )
    if tuple(headers[:5]) != PLATFORM_METADATA:
        raise ValueError(
            "Platform metadata layout differs from the expected five leading columns. "
            "Confirm a corrected layout with the user before proceeding."
        )
    if getattr(options, "attribute_sheet", None):
        raise ValueError("Platform attributes are inline; confirm the input layout before selecting another sheet.")
    if worksheet is None:
        frame = pd.read_csv(source, dtype=str, keep_default_na=False)
    else:
        frame = pd.read_excel(
            source, sheet_name=worksheet, dtype=str, keep_default_na=False,
        )
    return frame, worksheet


def platform_attribute_safe(column: str, values: pd.Series) -> bool:
    compact = normalized_name(column)
    private_tokens = (
        "name", "birth", "dob", "gender", "sex", "ethnic", "religio",
        "nationality", "health", "disability", "marital",
    )
    if not safe_attribute(column) or any(token in compact for token in private_tokens):
        return False
    nonempty = values.loc[values.astype(str).str.strip().ne("")].astype(str)
    if nonempty.nunique() > 50 or nonempty.str.contains(
        r"@|https?://|\b[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\b",
        regex=True,
    ).any():
        return False
    return True


def invalid_platform_records(frame: pd.DataFrame, emp_id: str) -> pd.Series:
    cycle_id = frame["Survey Cycle UUID"]
    cycle_title = frame["Survey Cycle Title"]
    invalid = frame[emp_id].str.strip().eq("") | cycle_id.str.strip().eq("") | cycle_title.str.strip().eq("")
    invalid |= frame.duplicated([emp_id, "Survey Cycle UUID"], keep=False)
    pairs = frame[["Survey Cycle UUID", "Survey Cycle Title"]].drop_duplicates()
    ambiguous_ids = pairs.loc[pairs["Survey Cycle UUID"].duplicated(keep=False), "Survey Cycle UUID"]
    ambiguous_titles = pairs.loc[pairs["Survey Cycle Title"].duplicated(keep=False), "Survey Cycle Title"]
    return invalid | cycle_id.isin(ambiguous_ids) | cycle_title.isin(ambiguous_titles)


def platform_proposal(
    frame: pd.DataFrame, source: Path, worksheet: str | None,
    options: argparse.Namespace,
) -> dict[str, Any]:
    columns = list(frame.columns)
    stems = list(dict.fromkeys(
        column[:-len(suffix)]
        for column in columns
        for suffix in QUESTION_COMPANIONS
        if column.endswith(suffix)
    ))
    groups = []
    findings = []
    for stem in stems:
        members = [stem, *(stem + suffix for suffix in QUESTION_COMPANIONS)]
        positions = [columns.index(column) + 1 for column in members if column in columns]
        complete = (
            len(positions) == 4
            and positions == list(range(positions[0], positions[0] + 4))
        )
        invalid = False
        usable = False
        if complete:
            numeric = pd.to_numeric(frame[stem], errors="coerce")
            answered = frame[stem].str.strip().ne("") & numeric.ne(-1)
            valid = numeric.between(1, options.scale_points) & numeric.mod(1).eq(0)
            invalid = bool((answered & ~valid).any())
            usable = bool(valid.any())
        groups.append({
            "column": stem, "columns": positions, "complete": complete,
            "usable": usable,
        })
        if not complete:
            findings.append({"code": "incomplete_question", "columns": positions})
        elif invalid:
            findings.append({"code": "invalid_scores", "columns": [positions[0]]})
        if complete and not usable:
            findings.append({"code": "empty_question", "columns": [positions[0]]})
        if complete and frame[stem + "_COMMENT"].str.strip().ne("").any():
            findings.append({"code": "comment_excluded", "columns": [positions[0]]})
        if complete and (
            frame[stem + "_COMMENT"].str.strip().eq("")
            & frame[stem + "_COMMENT_TOPICS"].str.strip().ne("")
        ).any():
            findings.append({"code": "orphan_topics", "columns": [positions[0]]})
    if not groups:
        raise ValueError("Platform metadata was found but no question groups were identified; ask the user to clarify the layout.")
    last_question = max(position for group in groups for position in group["columns"])
    expected = set(PLATFORM_METADATA)
    for stem in stems:
        expected.update([stem, *(stem + suffix for suffix in QUESTION_COMPANIONS)])
    unclassified = [column for column in columns[5:last_question] if column not in expected]
    if unclassified:
        raise ValueError("Unclassified columns interrupt platform question groups; ask the user to resolve the layout.")
    requested_id = options.emp_id_col
    if requested_id:
        employee_id = detect_emp_id(frame, requested_id)
    else:
        candidates = [
            column for column in columns
            if normalized_name(column) in {normalized_name(name) for name in EMPLOYEE_ID_CANDIDATES}
        ]
        employee_id = candidates[0] if len(candidates) == 1 else None
    if employee_id and employee_id not in columns[last_question:]:
        raise ValueError("The employee ID must be a trailing platform attribute column; confirm the layout with the user.")
    if employee_id and invalid_platform_records(frame, employee_id).any():
        findings.append({"code": "invalid_records", "columns": []})
    attributes = []
    preferred = {normalized_name(name) for name in (*PREFERRED_ATTRIBUTES, "department", "country", "business unit")}
    for column in columns[last_question:]:
        if column == employee_id:
            continue
        safe = platform_attribute_safe(column, frame[column])
        attributes.append({
            "column": column, "position": columns.index(column) + 1, "safe": safe,
            "proposed_name": column if safe and normalized_name(column) in preferred else None,
        })
    proposal = {
        "version": 1,
        "source_sha256": file_sha256(source),
        "settings": {
            "sheet": worksheet, "scale_points": options.scale_points,
            "emp_id_col": options.emp_id_col,
            "question_cols": options.question_cols, "attribute_cols": options.attribute_cols,
            "min_group_size": options.min_group_size,
        },
        "suggested_emp_id_col": employee_id,
        "questions": groups, "attributes": attributes, "findings": findings,
        "review": [
            "Confirm employee ID, cycle UUID/title, scale, and flag encodings.",
            "Exclude uncertain optional attributes and disclose them in Limitations; include only reliably established mappings.",
            "Confirm exclusions of incomplete blocks, invalid records/scores, and unused attributes.",
            "A score of -1 is skipped; blank companions without a comment are normal.",
        ],
    }
    digest = hashlib.sha256(json.dumps(proposal, sort_keys=True).encode()).hexdigest()
    proposal["proposal_sha256"] = digest
    proposal["decisions_template"] = {
        "confirmed": False, "source_sha256": proposal["source_sha256"],
        "proposal_sha256": digest, "emp_id_col": employee_id,
        "scale_points": options.scale_points,
        "cycle_order": list(dict.fromkeys(
            frame.loc[~invalid_platform_records(frame, employee_id), "Survey Cycle Title"]
            if employee_id else frame["Survey Cycle Title"]
        )),
        "question_columns": [group["column"] for group in groups if group["complete"] and group["usable"]],
        "attribute_mappings": {item["column"]: item["proposed_name"] for item in attributes},
        "attribute_evidence": {},
        "clear_flags": ["false", "0"], "sensitive_flags": ["true", "1"],
    }
    return proposal


def prepare_platform_config(
    frame: pd.DataFrame, source: Path, worksheet: str | None,
    options: argparse.Namespace, input_dir: Path,
) -> Path:
    proposal = platform_proposal(frame, source, worksheet, options)
    proposal_path = input_dir / "preparation-proposal.json"
    proposal_path.write_text(json.dumps(proposal, indent=2) + "\n", encoding="utf-8")
    if getattr(options, "inspect_only", False):
        return proposal_path
    decisions_file = getattr(options, "preparation_decisions", None)
    if not decisions_file:
        raise ValueError(
            f"User confirmation is required before loading this platform export. "
            f"Review {proposal_path}, resolve assumptions with the user, then pass "
            "--preparation-decisions with the confirmed decisions_template."
        )
    decisions = json.loads(Path(decisions_file).read_text(encoding="utf-8"))
    if (
        not isinstance(decisions, dict)
        or decisions.get("confirmed") is not True
        or decisions.get("source_sha256") != proposal["source_sha256"]
        or decisions.get("proposal_sha256") != proposal["proposal_sha256"]
        or decisions.get("scale_points") != options.scale_points
    ):
        raise ValueError("Preparation decisions are unconfirmed or stale; inspect again and ask the user before proceeding.")
    emp_id = decisions.get("emp_id_col")
    if not isinstance(emp_id, str) or emp_id != proposal["suggested_emp_id_col"]:
        raise ValueError("Confirm the employee ID with --emp-id-col and inspect again before approving decisions.")
    cycle_order = decisions.get("cycle_order")
    available_cycles = proposal["decisions_template"]["cycle_order"]
    if (
        not isinstance(cycle_order, list)
        or any(not isinstance(value, str) for value in cycle_order)
        or len(cycle_order) != len(set(cycle_order))
        or set(cycle_order) != set(available_cycles)
    ):
        raise ValueError("Confirm every retained cycle title in chronological order; do not infer chronology from UUIDs.")
    groups = proposal["questions"]
    selected = decisions.get("question_columns")
    eligible = {group["column"] for group in groups if group["complete"] and group["usable"]}
    if (
        not isinstance(selected, list) or not selected
        or any(not isinstance(item, str) or item not in eligible for item in selected)
        or len(set(selected)) != len(selected) or emp_id in selected
        or set(selected) & {*PLATFORM_METADATA, "__response_row", "survey_cycle_id", "survey_cycle_title"}
    ):
        raise ValueError("Confirm a nonempty list of complete, usable question columns.")
    if options.question_cols is not None and selected != options.question_cols:
        raise ValueError("--question-cols differs from the confirmed preparation decisions.")
    mappings = decisions.get("attribute_mappings")
    evidence = decisions.get("attribute_evidence")
    if not isinstance(mappings, dict) or not isinstance(evidence, dict):
        raise ValueError("Preparation decisions need attribute_mappings and attribute_evidence objects.")
    candidates = {item["column"] for item in proposal["attributes"]}
    if set(mappings) != candidates:
        raise ValueError("Resolve every candidate attribute explicitly, using a name or null for exclusion.")
    flags = []
    for key in ("clear_flags", "sensitive_flags"):
        values = decisions.get(key)
        if not isinstance(values, list) or not values or any(not isinstance(value, str) or not value.strip() for value in values):
            raise ValueError("Confirm nonblank clear_flags and sensitive_flags encodings.")
        flags.append({value.strip().casefold() for value in values})
    if flags[0] & flags[1]:
        raise ValueError("Clear and sensitive flag encodings must not overlap.")

    entries: list[dict[str, Any]] = []
    def exclude(code: str, positions: list[int]) -> None:
        entries.append({"code": code, "columns": positions})

    approved_attributes = {}
    reserved = {emp_id, *selected, *PLATFORM_METADATA, "survey_cycle_id", "survey_cycle_title", "__response_row"}
    for item in proposal["attributes"]:
        column, target = item["column"], mappings[item["column"]]
        if column == emp_id:
            if target is not None:
                raise ValueError("The selected employee ID cannot also be an attribute.")
            continue
        if target is None:
            exclude("attribute_excluded" if item["safe"] else "private_attribute", [item["position"]])
            continue
        if (
            not isinstance(target, str) or not target.strip()
            or not item["safe"] or not platform_attribute_safe(target, frame[column])
            or re.fullmatch(r"attribute[\s_]*\d+", target, re.IGNORECASE)
            or target in reserved or target in approved_attributes.values()
        ):
            raise ValueError("An approved attribute is identifying, sensitive, ambiguous, or has a conflicting name; ask the user to correct its mapping.")
        if item["proposed_name"] is None and (
            not isinstance(evidence.get(column), str) or not evidence[column].strip()
        ):
            raise ValueError("An uncertain attribute needs user-confirmed meaning/rule evidence before inclusion.")
        approved_attributes[column] = target
    if options.attribute_cols is not None and list(approved_attributes) != options.attribute_cols:
        raise ValueError("--attribute-cols differs from the confirmed preparation decisions.")
    if not approved_attributes:
        exclude("no_attributes", [])
    bad_records = invalid_platform_records(frame, emp_id)
    if bad_records.any():
        exclude("invalid_records", [])
    frame = frame.loc[~bad_records].copy().reset_index(drop=True)
    for group in groups:
        question = group["column"]
        if not group["complete"]:
            exclude("incomplete_question", group["columns"])
        elif question not in selected:
            exclude("empty_question" if not group["usable"] else "question_excluded", [group["columns"][0]])
        else:
            numeric = pd.to_numeric(frame[question], errors="coerce")
            valid = numeric.between(1, options.scale_points) & numeric.mod(1).eq(0)
            invalid = frame[question].str.strip().ne("") & numeric.ne(-1) & ~valid
            if invalid.any():
                exclude("invalid_scores", [group["columns"][0]])
            frame[question] = numeric.where(valid)
    if frame.empty or not frame[selected].notna().any().any():
        raise ValueError("No valid analyzable records remain after confirmed preparation; no report was generated.")
    for question in selected:
        if not frame[question].notna().any():
            raise ValueError("A selected question has no usable scores after record exclusions; inspect and confirm a revised selection.")

    from vivaglint import extract_questions, pivot_long, split_survey_data
    from vivaglint.import_ import build_glint_survey

    # This transient row key links reshaped comments to source rows, not employee identities.
    frame["__response_row"] = frame.index.astype(str)
    question_columns = [
        column for question in selected
        for column in [question, *(question + suffix for suffix in QUESTION_COMPANIONS)]
    ]
    survey = build_glint_survey(
        frame[["__response_row", *question_columns]].copy(), emp_id_col="__response_row",
        first_name_col=None, last_name_col=None, email_col=None, status_col=None,
        completion_date_col=None, sent_date_col=None, manager_id_col=None,
    )
    if extract_questions(survey)["question"].tolist() != selected:
        raise ValueError("vivaglint question mapping differs from the approved preparation.")
    quantitative = split_survey_data(survey)["quantitative"].drop(columns="__response_row")
    outcome_columns = [
        name for name in frame
        if outcome_name_hint(name) and name not in selected
        and not name.endswith(QUESTION_COMPANIONS)
    ]
    normalized = frame[list(dict.fromkeys([
        emp_id, *PLATFORM_METADATA, *approved_attributes, *outcome_columns,
    ]))].copy()
    normalized = normalized.rename(columns={
        "Survey Cycle UUID": "survey_cycle_id", "Survey Cycle Title": "survey_cycle_title",
        **approved_attributes,
    })
    normalized = pd.concat([normalized.reset_index(drop=True), quantitative.reset_index(drop=True)], axis=1)
    survey_path = input_dir / "survey.csv"
    normalized.to_csv(survey_path, index=False)
    comments = pivot_long(survey, data_type="comments", include_standard_cols=["__response_row"])
    comments = comments.merge(
        frame[["__response_row", emp_id, "Survey Cycle UUID"]],
        on="__response_row", how="left", validate="many_to_one",
    )
    clear = comments["sensitive_flag"].fillna("").astype(str).str.strip().str.casefold().isin(flags[0])
    for question in selected:
        position = list(frame.columns).index(question) + 1
        if ((comments["question"] == question) & ~clear).any():
            exclude("comment_excluded", [position])
        if (
            frame[question + "_COMMENT"].str.strip().eq("")
            & frame[question + "_COMMENT_TOPICS"].str.strip().ne("")
        ).any():
            exclude("orphan_topics", [position])
    comments = comments.loc[clear, [emp_id, "Survey Cycle UUID", "question", "comment"]].rename(
        columns={"Survey Cycle UUID": "survey_cycle_id", "question": "question_uuid"},
    )
    comments_path = input_dir / "comments.csv"
    comments.to_csv(comments_path, index=False)
    audit = {
        "version": 1, "source_sha256": proposal["source_sha256"],
        "proposal_sha256": proposal["proposal_sha256"],
        "normalized_sha256": file_sha256(survey_path), "limitations": entries,
        "cycle_order": cycle_order,
    }
    (input_dir / "preparation-audit.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    (input_dir / "preparation-decisions.json").write_text(json.dumps(decisions, indent=2) + "\n", encoding="utf-8")
    attributes = list(approved_attributes.values())
    config = {
        "survey_csv": str(survey_path), "input_format": "wide_items",
        "scale_points": options.scale_points, "emp_id_col": emp_id,
        "question_cols": selected, "attribute_cols": attributes,
        "min_group_size": options.min_group_size,
        "summary_mode": getattr(options, "summary_mode", "off"),
        "analyses": ["descriptives", "response_distribution", "correlations", "factor_analysis"]
        + (["by_attribute"] if attributes else []),
        "source_file_name": source.name, "source_sha256": proposal["source_sha256"],
        "source_url": None, "source_survey_sheet": worksheet,
        "source_attribute_sheet": None, "source_comment_sheet": None,
        "comments_file": str(comments_path),
        "comments_question_col": "question_uuid", "comments_text_col": "comment",
    }
    if attributes:
        config["attribute_view_mode"] = "separate"
    configure_attrition(config, normalized, None, options, {})
    apply_analysis_selection(config, options)
    config_path = input_dir / "analysis-config.json"
    config_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    return config_path


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
    discovery_path = input_dir / "attrition-discovery.json"
    selected = getattr(options, "analyses", None)
    if selected is None or "attrition" in selected or getattr(options, "inspect_attrition", False):
        discovery = inspect_source(source)
        exit_source = getattr(options, "exit_data", None)
        if exit_source:
            discovery["provided_exit_data"] = inspect_source(Path(exit_source).resolve())
        discovery_path.write_text(json.dumps(discovery, indent=2) + "\n", encoding="utf-8")
    if getattr(options, "inspect_attrition", False):
        return discovery_path
    platform = read_platform_export(source, options)
    if platform is not None:
        return prepare_platform_config(platform[0], source, platform[1], options, input_dir)
    if getattr(options, "inspect_only", False) or getattr(options, "preparation_decisions", None):
        raise ValueError("Platform preparation options require a native platform export.")
    (input_dir / "preparation-audit.json").unlink(missing_ok=True)
    registered_defaults = sidecar_config(source)
    (
        survey,
        survey_path,
        attribute_frame,
        attribute_path,
        comments_path,
        workbook_source,
    ) = read_export(
        source, input_dir, options.sheet, options.attribute_sheet,
        options.emp_id_col or registered_defaults.get("emp_id_col"),
    )
    emp_id_col = detect_emp_id(
        survey,
        options.emp_id_col or registered_defaults.get("emp_id_col"),
    )
    questions = detect_questions(
        survey,
        emp_id_col,
        options.question_cols or registered_defaults.get("question_cols"),
        options.scale_points,
    )
    normalized_survey_path = input_dir / "survey.csv"
    survey.to_csv(normalized_survey_path, index=False)
    survey_path = normalized_survey_path

    configured_attributes = options.attribute_cols or registered_defaults.get(
        "attribute_cols"
    )
    inline_attributes: list[str] = []
    external_attributes: list[str] = []
    if attribute_frame is None:
        inline_attributes = detect_attributes(
            survey,
            {emp_id_col, *questions},
            configured_attributes,
        )
    else:
        external_emp_id = detect_emp_id(attribute_frame, emp_id_col)
        if external_emp_id != emp_id_col:
            attribute_frame = attribute_frame.rename(columns={external_emp_id: emp_id_col})
            assert attribute_path is not None
            attribute_frame.to_csv(attribute_path, index=False)
        if configured_attributes:
            available = set(survey.columns) | set(attribute_frame.columns)
            missing = [
                column for column in configured_attributes
                if column not in available
            ]
            if missing:
                raise ValueError("Attribute columns not found: " + ", ".join(missing))
            unsafe = [
                column for column in configured_attributes
                if not safe_attribute(column)
            ]
            if unsafe:
                raise ValueError(
                    "Attribute columns cannot contain identifiers or sensitive data: "
                    + ", ".join(unsafe)
                )
            inline_attributes = [
                column for column in configured_attributes
                if column in survey.columns
            ]
            external_attributes = [
                column for column in configured_attributes
                if column not in survey.columns and column in attribute_frame.columns
            ]
        else:
            external_attributes = detect_attributes(
                attribute_frame,
                {emp_id_col},
                None,
            )
            external_attributes = [
                column for column in external_attributes
                if column not in survey.columns
            ]

    attribute_cols = list(dict.fromkeys(
        configured_attributes or [*inline_attributes, *external_attributes]
    ))
    analyses = [
        "descriptives",
        "response_distribution",
        "correlations",
        "factor_analysis",
    ]
    if attribute_cols:
        analyses.append("by_attribute")
    config: dict[str, Any] = {
        "survey_csv": str(survey_path),
        "input_format": "wide_items",
        "scale_points": options.scale_points,
        "emp_id_col": emp_id_col,
        "question_cols": questions,
        "attribute_cols": attribute_cols,
        "min_group_size": options.min_group_size,
        "summary_mode": getattr(options, "summary_mode", "off"),
        "analyses": analyses,
        "source_file_name": source.name,
        "source_sha256": file_sha256(source),
        "source_url": linked_source_url(source),
        "source_survey_sheet": workbook_source["survey_sheet"],
        "source_attribute_sheet": workbook_source["attribute_sheet"],
        "source_comment_sheet": workbook_source["comment_sheet"],
    }
    configure_attrition(config, survey, attribute_frame, options, registered_defaults)
    apply_analysis_selection(config, options)
    if attribute_cols:
        config["attribute_view_mode"] = "separate"
    if attribute_path:
        config["attribute_file"] = str(attribute_path)
    if comments_path:
        config["comments_file"] = str(comments_path)
        config["comments_question_col"] = "question_uuid"
        config["comments_text_col"] = "comment"

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
    if options.inspect_only or options.inspect_attrition:
        key = "attrition_discovery" if options.inspect_attrition else "preparation_proposal"
        print(json.dumps({key: str(config_path), "analysis_started": False}))
        return 0
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

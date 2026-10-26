"""Inspect local outcome candidates without exporting respondent values."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd

from run_vivaglint_analysis import parse_termination_dates


def normalized_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value).casefold())


def outcome_name_hint(column: str) -> bool:
    return bool(re.search(
        r"attrit|exit|leaver|leaving|terminat|separat|departure|departed|lastworking|"
        r"lastdayworked|dateleft|offboard|turnover|lastdayofemployment|"
        r"employmentend|endofemployment|employmentstatus|"
        r"employeestatus|activestatus|isactive",
        normalized_name(column),
    ))


def exit_cycle_labels(values: pd.Series) -> pd.Series:
    return values.astype(str).map(normalized_name).isin({
        "exit", "exitsurvey", "leaver", "leavers", "leaversurvey",
        "offboarding", "offboardingsurvey", "departure", "departuresurvey",
        "termination", "separation",
    })


def candidate_kind(column: str, values: pd.Series) -> str | None:
    if not outcome_name_hint(column):
        return None
    name = normalized_name(column)
    if any(token in name for token in ("comment", "topic", "sensitive", "reason")):
        return None
    nonempty = values.loc[values.notna() & values.astype(str).str.strip().ne("")]
    if nonempty.empty:
        return "unresolved"
    numeric = pd.to_numeric(nonempty, errors="coerce")
    if (numeric.notna().all() and numeric.isin([0, 1]).all()) or nonempty.astype(str).str.casefold().isin({
        "0", "1", "true", "false", "yes", "no", "active", "inactive",
        "terminated", "separated", "leaver", "left", "departed",
    }).all():
        return "flag_or_status"
    # Status, predictive, and leave-entitlement fields need semantic confirmation.
    date_name = (
        name in {"attrition", "exit", "leaver", "leavers", "termination", "separation", "departure"}
        or "date" in name or "lastworkingday" in name
        or "lastdayofemployment" in name or "lastdayworked" in name
    )
    if not date_name or any(token in name for token in ("risk", "predict", "expect", "plan", "status", "flag")):
        return "unresolved"
    dates = parse_termination_dates(nonempty)
    if dates.notna().all() and dates.dt.year.between(1970, 2100).all():
        return "exit_date"
    return "unresolved"


def inspect_frames(frames: dict[str | None, pd.DataFrame]) -> dict[str, Any]:
    candidates = []
    exit_cycles = []
    for sheet, frame in frames.items():
        native_questions = {
            str(column)[:-len("_COMMENT")]
            for column in frame if str(column).endswith("_COMMENT")
        }
        for column in frame:
            name = str(column)
            if name not in native_questions:
                kind = candidate_kind(name, frame[column])
                if (
                    kind is None and sheet and outcome_name_hint(sheet)
                    and normalized_name(name) in {"date", "enddate", "effectivedate", "status", "flag"}
                ):
                    hinted = candidate_kind("Exit " + name, frame[column])
                    kind = "date_candidate" if hinted == "exit_date" else hinted
                if kind:
                    candidates.append({
                        "sheet": sheet, "column": name, "kind": kind,
                        "requires_confirmation": kind != "exit_date",
                    })
            if normalized_name(name) in {"surveycycletitle", "surveycycle", "surveycycleid"}:
                if exit_cycle_labels(frame[column]).any():
                    exit_cycles.append({"sheet": sheet, "column": name})
    return {
        "version": 1,
        "inspected_sheets": list(frames),
        "status": "candidates_found" if candidates or exit_cycles else "not_found",
        "candidates": candidates, "exit_cycles": exit_cycles,
        "required_inputs": [
            "Matching employee ID columns in survey and outcome data",
            "Actual exit dates; a flag/status alone cannot establish dated follow-up",
            "Predictor survey/cycle and its completion date",
            "Outcome population coverage and observation/as-of date",
            "Follow-up windows (normally 90, 180, and 365 days)",
        ],
    }


def inspect_source(source: Path) -> dict[str, Any]:
    if source.suffix.casefold() == ".csv":
        return inspect_frames({None: pd.read_csv(source, dtype=str)})
    if source.suffix.casefold() not in {".xlsx", ".xlsm"}:
        raise ValueError("Attrition discovery requires a CSV, XLSX, or XLSM file.")
    with pd.ExcelFile(source) as workbook:
        return inspect_frames({
            sheet: pd.read_excel(workbook, sheet_name=sheet, dtype=str)
            for sheet in workbook.sheet_names
        })

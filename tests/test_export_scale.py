import importlib.util
import json
import math
import sys
from pathlib import Path

import pandas as pd
import pytest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "survey_export_scale", ROOT / "scripts/run_vivaglint_analysis.py"
)
assert SPEC and SPEC.loader
runner = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = runner
SPEC.loader.exec_module(runner)


@pytest.mark.parametrize("unit", ["ns", "us"])
@pytest.mark.parametrize("missing", [False, True])
def test_termination_dates_preserve_datetime_values(unit, missing):
    values = pd.Series(
        [pd.Timestamp("2026-07-01"), pd.NaT if missing else pd.Timestamp("2026-08-01"),
         pd.Timestamp("2026-12-01")],
        dtype=f"datetime64[{unit}]",
        index=[4, 8, 12],
    )

    pd.testing.assert_series_equal(runner.parse_termination_dates(values), values)


@pytest.mark.parametrize("values", [
    [46204, None, 46357],
    ["46204", None, "46357"],
    ["2026-07-01", None, "2026-12-01"],
])
def test_termination_dates_keep_serial_and_string_support(values):
    parsed = runner.parse_termination_dates(pd.Series(values, index=[4, 8, 12]))

    assert parsed.index.tolist() == [4, 8, 12]
    assert parsed.iloc[0] == pd.Timestamp("2026-07-01")
    assert pd.isna(parsed.iloc[1])
    assert parsed.iloc[2] == pd.Timestamp("2026-12-01")


@pytest.mark.parametrize("scale_points", range(2, 12))
@pytest.mark.parametrize("name", ["descriptives", "by_attribute"])
def test_written_score_statistics_use_100_point_units(tmp_path, scale_points, name):
    frame = pd.DataFrame({
        "question": ["low", "middle", "high", "missing"],
        "mean": [1, (scale_points + 1) / 2, scale_points, math.nan],
        "sd": [0, (scale_points - 1) / 4, (scale_points - 1) / 2, math.nan],
        "glint_score": [0, 50, 100, math.nan],
        "n_responses": [5, 12, 10, 0],
        "pct_favorable": [0, 25, 100, math.nan],
    })
    if name == "by_attribute":
        frame.insert(0, "attribute_name", "Department")
        frame.insert(1, "attribute_value", "Engineering")
        frame.insert(2, "group_size", 27)
    original = frame.copy(deep=True)

    artifact = runner.write_csv(tmp_path, name, frame, scale_points)
    exported = pd.read_csv(tmp_path / artifact)

    assert exported["mean"].tolist()[:3] == pytest.approx([0, 50, 100])
    assert exported["sd"].tolist()[:3] == pytest.approx([0, 25, 50])
    assert pd.isna(exported.loc[3, "mean"])
    assert pd.isna(exported.loc[3, "sd"])
    pd.testing.assert_frame_equal(
        exported.drop(columns=["mean", "sd"]),
        original.drop(columns=["mean", "sd"]),
        check_dtype=False,
    )
    pd.testing.assert_frame_equal(frame, original)


@pytest.mark.parametrize("scale_points", range(2, 12))
def test_written_distribution_labels_use_score_values(tmp_path, scale_points):
    values = {"question": ["Q_ONE", "Q_TWO"]}
    for rating in range(1, scale_points + 1):
        values[f"count_{rating}"] = [rating, rating + 1]
        values[f"pct_{rating}"] = [rating * 2.5, rating * 1.5]
    frame = pd.DataFrame(values)
    original = frame.copy(deep=True)

    runner.write_csv(tmp_path, "response_distribution", frame, scale_points)
    exported = pd.read_csv(tmp_path / "response_distribution.csv")

    assert len(exported.columns) == len(original.columns)
    for rating in range(1, scale_points + 1):
        label = f"{(rating - 1) * 100 / (scale_points - 1):.6f}".rstrip("0").rstrip(".")
        for prefix in ("count", "pct"):
            pd.testing.assert_series_equal(
                exported[f"{prefix}_{label}"],
                original[f"{prefix}_{rating}"],
                check_names=False,
            )
    assert exported.columns[1] == "count_0"
    assert exported.columns[-2] == "count_100"
    pd.testing.assert_frame_equal(frame, original)


def test_written_cycle_changes_use_score_points_and_score_relative_percentages(tmp_path):
    frame = pd.DataFrame({
        "question": ["Q_ONE"] * 3 + ["Q_TWO"] * 2 + ["Q_MISSING"] * 2,
        "cycle": ["Old", "New", "Latest", "Old", "New", "Old", "New"],
        "mean": [3, 4, 2, 1, 2, math.nan, 3],
        "sd": [1] * 7,
        "glint_score": [50, 75, 25, 0, 25, math.nan, 50],
        "change_from_previous": [math.nan, 1, -2, math.nan, 1, math.nan, math.nan],
        "pct_change_from_previous": [math.nan, 100 / 3, -50, math.nan, 100, math.nan, math.nan],
        "glint_score_change_from_previous": [math.nan, 25, -50, math.nan, 25, math.nan, math.nan],
    })
    original = frame.copy(deep=True)

    runner.write_csv(tmp_path, "cycle_comparisons", frame, 5)
    exported = pd.read_csv(tmp_path / "cycle_comparisons.csv")

    assert exported.loc[1:2, "change_from_previous"].tolist() == pytest.approx([25, -50])
    assert exported.loc[1:2, "pct_change_from_previous"].tolist() == pytest.approx([50, -200 / 3])
    assert exported.loc[4, "change_from_previous"] == 25
    assert pd.isna(exported.loc[4, "pct_change_from_previous"])
    assert exported.loc[[0, 3, 5, 6], "pct_change_from_previous"].isna().all()
    pd.testing.assert_series_equal(
        exported["glint_score_change_from_previous"],
        original["glint_score_change_from_previous"],
    )
    pd.testing.assert_frame_equal(frame, original)


@pytest.mark.parametrize("name,values", [
    ("correlations", {"correlation": [.8], "p_value": [.001], "n": [100]}),
    ("factor_analysis_summary", {
        "loading": [.75], "communality": [.62], "factor_variance_pct": [40],
    }),
    ("attrition", {
        "days": [180], "favorable_n": [25], "favorable_attrition": [.1],
        "unfavorable_n": [20], "unfavorable_attrition": [.32], "attrition_ratio": [3.2],
    }),
])
def test_non_score_exports_keep_their_units(tmp_path, name, values):
    frame = pd.DataFrame({"question": ["Q_ONE"], **values})
    runner.write_csv(tmp_path, name, frame, 5)
    pd.testing.assert_frame_equal(pd.read_csv(tmp_path / f"{name}.csv"), frame)


@pytest.mark.parametrize("attribute_view_mode", ["combined", "separate"])
def test_runner_exports_scores_and_declares_units(tmp_path, monkeypatch, attribute_view_mode):
    survey = pd.DataFrame({
        "user_id": range(1, 41),
        "Q_ONE": [1, 2, 3, 4, 5] * 8,
        "department": ["Engineering"] * 40,
    })
    survey.to_csv(tmp_path / "survey.csv", index=False)
    config = {
        "survey_csv": "survey.csv",
        "emp_id_col": "user_id",
        "scale_points": 5,
        "input_format": "wide_items",
        "question_cols": ["Q_ONE"],
        "attribute_cols": ["department"],
        "attribute_view_mode": attribute_view_mode,
        "analyses": ["descriptives", "response_distribution", "by_attribute"],
    }
    config_path = tmp_path / "analysis-config.json"
    config_path.write_text(json.dumps(config), encoding="utf-8")
    output = tmp_path / "output"
    monkeypatch.setattr(sys, "argv", [
        "run_vivaglint_analysis.py", "--config", str(config_path),
        "--output-dir", str(output), "--skip-repeatability-check", "--no-progress",
    ])

    assert runner.main() == 0
    manifest = json.loads((output / "analysis-manifest.json").read_text(encoding="utf-8"))
    expected_profile = {
        "score_min": 0,
        "score_max": 100,
        "score_units": "points",
        "response_distribution_labels": "0-100",
        "non_score_metrics": "native",
    }
    assert manifest["input_profile"]["scale_points"] == 5
    assert manifest["export_profile"] == expected_profile
    assert manifest["runtime_provenance"]["dependencies"]["vivaglint"] == "0.1.1"
    assert len(manifest["runtime_provenance"]["plugin"]["content_sha256"]) == 64
    assert all(item["status"] == "completed" for item in manifest["analyses"])
    schema = json.loads((ROOT / "schemas/analysis-manifest.schema.json").read_text(encoding="utf-8"))
    assert {
        name: field["const"]
        for name, field in schema["properties"]["export_profile"]["properties"].items()
    } == expected_profile
    for name in ("descriptives", "by_attribute"):
        exported = pd.read_csv(output / manifest["artifacts"][name])
        assert exported.loc[0, "mean"] == 50
        assert exported.loc[0, "sd"] == pytest.approx(survey["Q_ONE"].std() * 25)
        assert exported.loc[0, "glint_score"] == 50
        assert exported.loc[0, "n_responses"] == 40
    distribution = pd.read_csv(output / manifest["artifacts"]["response_distribution"])
    for score in (0, 25, 50, 75, 100):
        assert distribution.loc[0, f"count_{score}"] == 8
        assert distribution.loc[0, f"pct_{score}"] == 20

import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("local_runtime_tests", ROOT / "scripts/local_runtime.py")
assert SPEC and SPEC.loader
runtime = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runtime)


@pytest.fixture
def healthy_runtime(monkeypatch):
    versions = {name: runtime.PINNED_VERSIONS.get(name, "1.0") for name in runtime.DEPENDENCIES}
    monkeypatch.setattr(runtime, "dependency_versions", lambda: versions)
    monkeypatch.setattr(runtime.importlib, "import_module", lambda name: object())
    monkeypatch.setattr(runtime.sys, "prefix", sys.base_prefix + "-isolated-fixture")
    monkeypatch.setattr(runtime, "isolated_environment", lambda directory: True)
    monkeypatch.setattr(
        runtime.subprocess, "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout="No broken requirements found.", stderr=""),
    )
    return versions


def test_readiness_reports_missing_dependencies_assets_and_unwritable_output(tmp_path, monkeypatch, healthy_runtime):
    healthy_runtime["vivaglint"] = None
    healthy_runtime["openpyxl"] = "0.0"
    monkeypatch.setattr(runtime, "REQUIRED_FILES", (*runtime.REQUIRED_FILES, "missing-runtime-file"))
    blocked = tmp_path / "not-a-directory"
    blocked.write_text("existing file", encoding="utf-8")

    result = runtime.check_runtime(blocked)

    assert not result["ready"]
    failures = {check["name"]: check["detail"] for check in result["checks"] if not check["passed"]}
    assert set(failures) == {"vivaglint", "openpyxl", "plugin_assets", "output_writable"}
    assert "Missing dependency" in failures["vivaglint"]
    assert "required 3.1.5" in failures["openpyxl"]
    assert blocked.read_text(encoding="utf-8") == "existing file"


def test_readiness_reports_import_and_dependency_conflicts(tmp_path, monkeypatch, healthy_runtime):
    def import_module(name):
        if name == "factor_analyzer":
            raise ImportError("test dependency unavailable")
        return object()

    monkeypatch.setattr(runtime.importlib, "import_module", import_module)
    monkeypatch.setattr(
        runtime.subprocess, "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=1, stdout="test dependency conflict", stderr=""),
    )
    result = runtime.check_runtime(tmp_path / "output")
    failures = {check["name"] for check in result["checks"] if not check["passed"]}
    assert failures == {"factor-analyzer", "dependency_consistency"}
    assert not result["ready"]


def test_readiness_passes_without_reading_a_survey(tmp_path, healthy_runtime):
    assert runtime.check_runtime(tmp_path / "output")["ready"]


def test_readiness_rejects_global_python(healthy_runtime, monkeypatch):
    monkeypatch.setattr(runtime.sys, "prefix", sys.base_prefix)
    result = runtime.check_runtime()
    assert not result["ready"]
    assert [check["name"] for check in result["checks"] if not check["passed"]] == ["isolated_environment"]


def test_setup_requires_approval_and_preserves_existing_directories(tmp_path):
    target = tmp_path / "environment"
    with pytest.raises(ValueError, match="approval"):
        runtime.setup_runtime(target, approved=False)
    assert not target.exists()
    target.mkdir()
    marker = target / "keep.txt"
    marker.write_text("untouched", encoding="utf-8")
    with pytest.raises(ValueError, match="not a virtual environment"):
        runtime.setup_runtime(target, approved=True)
    assert marker.read_text(encoding="utf-8") == "untouched"


def test_setup_installs_only_in_approved_environment_and_runs_smoke(tmp_path, monkeypatch):
    calls = []
    target = tmp_path / "environment"
    target.mkdir()
    (target / "pyvenv.cfg").write_text("include-system-site-packages = false\n", encoding="utf-8")
    interpreter = target / ("Scripts" if sys.platform == "win32" else "bin") / (
        "python.exe" if sys.platform == "win32" else "python"
    )
    interpreter.parent.mkdir()
    interpreter.touch()
    monkeypatch.setattr(runtime.subprocess, "run", lambda command, **kwargs: calls.append(command))

    runtime.setup_runtime(target, approved=True)

    assert calls == [
        [str(interpreter), "-m", "pip", "install", "-r", str(runtime.REQUIREMENTS)],
        [str(interpreter), str(Path(runtime.__file__).resolve()), "smoke"],
    ]
    (target / "pyvenv.cfg").write_text("include-system-site-packages = true\n", encoding="utf-8")
    with pytest.raises(ValueError, match="global packages"):
        runtime.setup_runtime(target, approved=True)
    assert len(calls) == 2


def test_setup_surfaces_install_failure_without_running_smoke(tmp_path, monkeypatch):
    target = tmp_path / "environment"
    target.mkdir()
    (target / "pyvenv.cfg").write_text("include-system-site-packages = false\n", encoding="utf-8")
    interpreter = target / ("Scripts" if sys.platform == "win32" else "bin") / (
        "python.exe" if sys.platform == "win32" else "python"
    )
    interpreter.parent.mkdir()
    interpreter.touch()
    calls = []

    def fail(command, **kwargs):
        calls.append(command)
        raise subprocess.CalledProcessError(1, command)

    monkeypatch.setattr(runtime.subprocess, "run", fail)
    with pytest.raises(subprocess.CalledProcessError):
        runtime.setup_runtime(target, approved=True)
    assert len(calls) == 1


def test_provenance_identifies_copied_assets_without_private_paths(tmp_path, monkeypatch):
    (tmp_path / ".claude-plugin").mkdir()
    (tmp_path / ".claude-plugin" / "plugin.json").write_text(
        json.dumps({"name": "fixture-plugin", "version": "1.0"}), encoding="utf-8",
    )
    runner = tmp_path / "runner.py"
    runner.write_text("first version", encoding="utf-8")
    monkeypatch.setattr(runtime, "ROOT", tmp_path)
    monkeypatch.setattr(runtime, "REQUIRED_FILES", (".claude-plugin/plugin.json", "runner.py"))
    monkeypatch.setattr(
        runtime.subprocess, "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=128, stdout="", stderr="not a git repository"),
    )

    first = runtime.runtime_provenance()
    runner.write_text("second version", encoding="utf-8")
    second = runtime.runtime_provenance()

    assert first["plugin"]["git_commit"] is None
    assert first["plugin"]["git_dirty"] is None
    assert first["plugin"]["content_sha256"] != second["plugin"]["content_sha256"]
    assert first["files"]["runner.py"] != second["files"]["runner.py"]
    assert str(tmp_path) not in json.dumps(first)
    assert first["dependencies"]["vivaglint"] == "0.1.1"


def test_provenance_schema_and_declared_pins_match():
    requirements = set(runtime.REQUIREMENTS.read_text(encoding="utf-8").splitlines())
    assert "vivaglint[all] @ https://github.com/microsoft/vivaglint_py/archive/761d847a8c8d38ff42c78b4501d761350c9fd03f.zip" in requirements
    assert runtime.ENGINE_REQUIREMENT in requirements
    assert "openpyxl==" + runtime.PINNED_VERSIONS["openpyxl"] in requirements
    schema = json.loads((ROOT / "schemas/analysis-manifest.schema.json").read_text(encoding="utf-8"))
    provenance = runtime.runtime_provenance()
    assert set(provenance) == set(schema["properties"]["runtime_provenance"]["required"])
    assert len(provenance["files"]) == len(runtime.REQUIRED_FILES)


def test_provenance_records_git_revision_and_dirty_state(monkeypatch):
    outputs = iter([str(ROOT), "a" * 40, " M scripts/local_runtime.py"])
    monkeypatch.setattr(
        runtime.subprocess, "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout=next(outputs), stderr=""),
    )
    provenance = runtime.runtime_provenance()
    assert provenance["plugin"]["git_commit"] == "a" * 40
    assert provenance["plugin"]["git_dirty"] is True

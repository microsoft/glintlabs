#!/usr/bin/env python
"""Set up and verify the local survey runtime without reading employee data."""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib
import json
import platform
import subprocess
import sys
import tempfile
import venv
import zipfile
from importlib import metadata
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
REQUIREMENTS = ROOT / "requirements-runtime.txt"
ENGINE_REQUIREMENT = (
    "vivaglint[all] @ https://github.com/microsoft/vivaglint_py/"
    "archive/761d847a8c8d38ff42c78b4501d761350c9fd03f.zip"
)
PINNED_VERSIONS = {"vivaglint": "0.1.1", "openpyxl": "3.1.5"}
DEPENDENCIES = {
    "vivaglint": "vivaglint",
    "pandas": "pandas",
    "numpy": "numpy",
    "scipy": "scipy",
    "scikit-learn": "sklearn",
    "factor-analyzer": "factor_analyzer",
    "openpyxl": "openpyxl",
    "rapidfuzz": "rapidfuzz",
    "requests": "requests",
    "matplotlib": "matplotlib",
    "seaborn": "seaborn",
}
REQUIRED_FILES = (
    ".claude-plugin/plugin.json",
    "requirements-runtime.txt",
    "scripts/local_runtime.py",
    "scripts/progress.py",
    "scripts/analyze_survey_export.py",
    "scripts/run_vivaglint_analysis.py",
    "scripts/build_interactive_report.py",
    "scripts/fixtures/runtime-smoke.json",
    "schemas/analysis-manifest.schema.json",
    "skills/analyze-survey/SKILL.md",
    "skills/analyze-survey/references/README.md",
    "skills/analyze-survey/references/local-runtime.md",
    "skills/analyze-survey/references/interpretation.md",
    "skills/analyze-survey/references/linked-dataset.json",
    "skills/analyze-survey/references/golden-report.html",
    "skills/analyze-survey/references/scores-change-format.png",
    "skills/analyze-survey/references/interactive-report-contract.md",
    "skills/analyze-survey/references/people-science-source-index.json",
    "skills/analyze-survey/references/people-science-summaries.schema.json",
    "references/design/glint-ui-system.md",
    "references/general/privacy-and-minimum-n.md",
    "references/general/codebook-catalog.md",
)


def dependency_versions() -> dict[str, str | None]:
    versions = {}
    for package in DEPENDENCIES:
        try:
            versions[package] = metadata.version(package)
        except metadata.PackageNotFoundError:
            versions[package] = None
    return versions


def isolated_environment(directory: Path) -> bool:
    config = directory / "pyvenv.cfg"
    if not config.is_file():
        return False
    settings = dict(
        line.split("=", 1)
        for line in config.read_text(encoding="utf-8").splitlines()
        if "=" in line
    )
    return any(
        key.strip() == "include-system-site-packages" and value.strip().lower() == "false"
        for key, value in settings.items()
    )


def runtime_provenance() -> dict[str, Any]:
    """Record implementation identity without host paths or respondent details."""
    files = {
        name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
        for name in REQUIRED_FILES
    }
    content_hash = hashlib.sha256(
        json.dumps(files, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    plugin = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
    revision = None
    dirty = None
    try:
        top = subprocess.run(
            ["git", "-C", str(ROOT), "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=10,
        )
    except FileNotFoundError:
        top = None
    if top is not None and top.returncode == 0 and Path(top.stdout.strip()).resolve() == ROOT:
        commit = subprocess.run(
            ["git", "-C", str(ROOT), "rev-parse", "HEAD"],
            capture_output=True, text=True, check=True, timeout=10,
        )
        status = subprocess.run(
            ["git", "-C", str(ROOT), "status", "--porcelain", "--untracked-files=normal"],
            capture_output=True, text=True, check=True, timeout=10,
        )
        revision = commit.stdout.strip()
        dirty = bool(status.stdout.strip())
    return {
        "plugin": {
            "name": plugin["name"],
            "version": plugin["version"],
            "git_commit": revision,
            "git_dirty": dirty,
            "content_sha256": content_hash,
        },
        "files": files,
        "python": {
            "version": platform.python_version(),
            "implementation": platform.python_implementation(),
        },
        "platform": platform.system(),
        "dependencies": dependency_versions(),
    }


def check_runtime(output_dir: Path | None = None) -> dict[str, Any]:
    checks = []

    def record(name: str, passed: bool, detail: str) -> None:
        checks.append({"name": name, "passed": passed, "detail": detail})

    record("python", sys.version_info >= (3, 10), "Python 3.10 or later is required.")
    record(
        "isolated_environment",
        sys.prefix != sys.base_prefix and isolated_environment(Path(sys.prefix)),
        "Use the approved virtual environment interpreter, without global site packages.",
    )
    missing = [name for name in REQUIRED_FILES if not (ROOT / name).is_file()]
    record("plugin_assets", not missing, "Missing: " + ", ".join(missing) if missing else "Complete plugin found.")
    versions = dependency_versions()
    for package, module in DEPENDENCIES.items():
        version = versions[package]
        if version is None:
            record(package, False, f"Missing dependency: {package}. Run the approved setup utility.")
            continue
        expected = PINNED_VERSIONS.get(package)
        if expected is not None and version != expected:
            record(package, False, f"Installed {version}; required {expected}. Run the approved setup utility.")
            continue
        try:
            importlib.import_module(module)
        except (ImportError, OSError, ValueError, RuntimeError) as exc:
            record(package, False, f"Import failed: {type(exc).__name__}: {exc}")
        else:
            record(package, True, f"Imported version {version}.")
    pip = subprocess.run(
        [sys.executable, "-m", "pip", "check"],
        capture_output=True, text=True, timeout=60,
    )
    record("dependency_consistency", pip.returncode == 0, (pip.stdout + pip.stderr).strip())
    if output_dir is not None:
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            with tempfile.TemporaryFile(dir=output_dir) as handle:
                handle.write(b"runtime-write-check")
        except OSError as exc:
            record("output_writable", False, f"{type(exc).__name__}: {exc}")
        else:
            record("output_writable", True, "Output directory is writable.")
    return {"ready": all(check["passed"] for check in checks), "checks": checks}


def smoke_test() -> None:
    """Exercise the real two-pass pipeline using only the installation fixture."""
    fixture = json.loads(
        (ROOT / "scripts" / "fixtures" / "runtime-smoke.json").read_text(encoding="utf-8")
    )
    with tempfile.TemporaryDirectory(prefix="glintlabs-runtime-smoke-") as temporary:
        work = Path(temporary)
        source = work / "installation-fixture.csv"
        with source.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["user_id", *(f"Q_RUNTIME_{i}" for i in range(1, 7)), "Location"])
            rows = fixture["responses"] * fixture["repetitions"]
            for index, responses in enumerate(rows):
                writer.writerow([f"fixture-{index}", *responses, f"Fixture group {index % 2}"])
        output = work / "smoke-report"
        subprocess.run([
            sys.executable, str(ROOT / "scripts" / "analyze_survey_export.py"),
            "--survey-export", str(source), "--output-dir", str(output),
        ], check=True)
        manifest = json.loads((output / "analysis-manifest.json").read_text(encoding="utf-8"))
        expected = {"descriptives", "response_distribution", "correlations", "factor_analysis", "by_attribute"}
        completed = {item["name"] for item in manifest["analyses"] if item["status"] == "completed"}
        if completed != expected or any(item["status"] == "failed" for item in manifest["analyses"]):
            raise ValueError("Installation smoke test did not complete every expected analysis.")
        if manifest["repeatability_check"]["status"] != "passed":
            raise ValueError("Installation smoke test failed repeatability.")
        if not manifest.get("runtime_provenance"):
            raise ValueError("Installation smoke test did not record runtime provenance.")
        for artifact in manifest["artifacts"].values():
            if not (output / artifact).is_file():
                raise ValueError(f"Installation smoke test is missing an artifact: {artifact}")
        report = output / "smoke-report-report.html"
        with zipfile.ZipFile(output / "smoke-report-share.zip") as archive:
            if archive.testzip() is not None or archive.read("OPEN_REPORT.html") != report.read_bytes():
                raise ValueError("Installation smoke test report package is invalid.")
            if any(name.startswith(("_input/", "_repeatability/")) for name in archive.namelist()):
                raise ValueError("Installation smoke test package contains private staging files.")


def setup_runtime(env_dir: Path, approved: bool) -> None:
    if not approved:
        raise ValueError("Setup requires user approval. Pass --yes only after approval to install dependencies.")
    if sys.version_info < (3, 10):
        raise ValueError("Install Python 3.10 or later before creating the runtime.")
    if not REQUIREMENTS.is_file():
        raise FileNotFoundError("Complete plugin required: requirements-runtime.txt is missing.")
    env_dir = env_dir.resolve()
    interpreter = env_dir / ("Scripts" if sys.platform == "win32" else "bin") / (
        "python.exe" if sys.platform == "win32" else "python"
    )
    if env_dir.exists() and not (env_dir / "pyvenv.cfg").is_file():
        raise ValueError("Environment destination already exists and is not a virtual environment; choose another directory.")
    if env_dir.exists() and not isolated_environment(env_dir):
        raise ValueError("Existing environment exposes global packages; choose a new isolated environment directory.")
    if not env_dir.exists():
        print("Creating an isolated Python environment.", flush=True)
        venv.EnvBuilder(with_pip=True).create(env_dir)
    if not interpreter.is_file():
        raise FileNotFoundError("Virtual environment interpreter is missing; choose a new environment directory.")
    print("Installing declared runtime dependencies; this requires GitHub and package-index access.", flush=True)
    subprocess.run([
        str(interpreter), "-m", "pip", "install", "-r", str(REQUIREMENTS),
    ], check=True)
    script = str(Path(__file__).resolve())
    subprocess.run([str(interpreter), script, "smoke"], check=True)
    print(json.dumps({"ready": True, "python": str(interpreter)}))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    checker = commands.add_parser("check", help="Check local execution prerequisites without reading a survey.")
    checker.add_argument("--output-dir", type=Path, help="Also check that this directory is writable.")
    setup = commands.add_parser("setup", help="Install an isolated runtime after explicit approval.")
    setup.add_argument("--env-dir", type=Path, required=True)
    setup.add_argument("--yes", action="store_true", help="Confirm that the user approved environment creation and downloads.")
    commands.add_parser("smoke", help="Run the official pipeline on the installation fixture, never employee data.")
    options = parser.parse_args()
    try:
        if options.command == "setup":
            setup_runtime(options.env_dir, options.yes)
            return 0
        result = check_runtime(getattr(options, "output_dir", None))
        print(json.dumps(result, indent=2), flush=True)
        if not result["ready"]:
            return 1
        if options.command == "smoke":
            print("Running the synthetic installation fixture, not a demo or user analysis.", flush=True)
            smoke_test()
            print(json.dumps({"ready": True, "smoke_test": "passed"}))
        return 0
    except (OSError, ValueError, subprocess.SubprocessError, zipfile.BadZipFile) as exc:
        print(json.dumps({"ready": False, "error": f"{type(exc).__name__}: {exc}"}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

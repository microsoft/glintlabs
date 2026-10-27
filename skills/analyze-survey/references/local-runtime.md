# Local survey runtime

The supported local workflow needs a command-capable AI host, a complete
`microsoft/glintlabs` plugin installation or repository checkout, Python 3.10
or later, and the declared analysis dependencies. A GitHub connector or a
`SKILL.md` link alone does not install these components or grant execution
access. Ordinary browser chat must not be described as locally connected.

## Before using employee data

After the user selects a data source, locate the complete plugin root and
confirm permission to execute local commands, read the chosen workbook, and
write the chosen output directory. Resolve paths from that root, not from
the user's current directory.

Check the installed source against the current supported upstream revision
using the host's supported plugin updater or Git tooling. For Copilot CLI,
the directly installed plugin can be updated with:

```text
/plugin update eve-people-science
```

Do not infer freshness from the plugin's display version: several commits can
share that version. Compare the actual revision or file content. Obtain
approval before downloads or updates, preserve local changes, and update the
complete plugin rather than mixing a new dataset with old scripts/templates.
If freshness cannot be checked offline, disclose that and ask whether to use
the existing identified installation; do not claim it is current.

The runtime checker is deliberately offline and does not update software.
Once approved, keep that implementation fixed for the whole analysis,
including its repeatability pass. Do not update between passes.

## One-time setup

The commands below are PowerShell examples, run from the complete plugin root.
Use an environment outside the plugin so a plugin update cannot remove it.
Ask the user to approve the destination and dependency downloads first:

```powershell
python .\scripts\local_runtime.py setup --env-dir "$HOME\.glintlabs\survey-runtime" --yes
```

`--yes` records the caller's assertion that approval has already been obtained;
it must never replace asking the user. No administrator access is required.
The utility creates an isolated virtual environment, installs
`requirements-runtime.txt`, checks imports and dependency consistency, then
runs the official two-pass report pipeline on the installation fixture.
It does not change global Python or install the AI host itself.

Python must already be available to start setup. If it is absent, explain
that prerequisite and follow the organization's approved Python installation
process; do not install system software without permission. Network access to
GitHub and the configured package index is needed during dependency installation.
The requirements use the documented exact `vivaglint` source commit because
version 0.1.1 is not available from every package index. The public source
archive does not require Git or a GitHub token; never fall back to another
engine version when installation fails.
Installation failures are blockers, not permission to use a different engine.

Other command-capable hosts can execute the same Python utility. On non-Windows
systems the virtual environment interpreter is in its `bin` directory rather
than `Scripts`. Windows is exercised during development; use the same smoke
test to establish readiness on another host. Do not claim an untested host or
Python/dependency combination is validated.

## Readiness and updates

Locate the approved isolated interpreter before running the checker. A path
existence check is enough to identify a missing environment; if isolation is
unclear, probe `sys.prefix != sys.base_prefix` and the environment's
`pyvenv.cfg` without importing analysis dependencies. Do not run a full
dependency audit against global Python or search unrelated environments.
If the approved environment is missing, go directly to approved setup.

Run the checker once using the isolated interpreter that will execute the
analysis. Substitute the approved output directory:

```powershell
& "$HOME\.glintlabs\survey-runtime\Scripts\python.exe" .\scripts\local_runtime.py check --output-dir "C:\SurveyAnalysis\results"
```

The checker emits JSON with `ready` and named pass/fail results, and exits
nonzero on failure. It checks Python/environment isolation, complete plugin assets, the pinned
engine and Excel reader, dependency imports/consistency, and output writing.
It does not inspect the workbook, send data to a service, access credentials,
or contact GitHub.

Reuse a passing check in the current session while the interpreter, relevant
plugin assets, dependencies, and output destination remain unchanged. After
setup, do not repeat its successful readiness check or smoke test. Verify the
chosen output directory once if setup did not check it; use a write-access
probe rather than repeating the full dependency audit solely for that purpose.

Run one smoke test after analysis-runtime code, template, or dependency changes:

```powershell
& "$HOME\.glintlabs\survey-runtime\Scripts\python.exe" .\scripts\local_runtime.py smoke
```

Setup already invokes this command. Do not rerun it immediately after successful
setup, for documentation-only or unrelated repository updates, or for an
unchanged runtime already verified in the current session. A changed Git
revision alone is not evidence that the analysis runtime changed; compare the
relevant scripts, templates, schemas, and dependency declarations.

The fixture is explicitly synthetic installation-test data, not an alternative
demo dataset. It is never selected by the analysis runner. Its temporary
outputs are removed after the test. The test requires completed descriptives,
distribution, correlations, factors, attribute analysis, SHA-256 repeatability,
runtime provenance, and a valid report/share ZIP. It does not test API
credentials, native-export loading decisions, or attrition outcomes.

If a check fails, show its specific blocker and approved remediation. Retry
only after the cause is addressed. Never silently switch to global Python,
weaken privacy/repeatability requirements, invent replacement analysis code,
or report a failed setup as a completed analysis.

## Run and provenance

After readiness passes, execute the existing official runner with the same
environment interpreter:

```powershell
& "$HOME\.glintlabs\survey-runtime\Scripts\python.exe" .\scripts\analyze_survey_export.py --survey-export "C:\SurveyData\survey.xlsx" --output-dir "C:\SurveyAnalysis\results"
```

Preserve all normal ingest confirmation, minimum-N, attrition, repeatability,
and report checks. Local computation does not authorize uploading employee
rows or raw comments to the AI provider; keep them out of prompts/tool output.

Each new manifest contains `runtime_provenance`: plugin name/version, Git
commit and dirty state when available, a content fingerprint and individual
runtime-file SHA-256 hashes, Python/platform identity, and relevant installed
dependency versions. Copied plugin installations without Git metadata have
explicitly null Git fields and use the content fingerprint as their identity.
Provenance contains no host paths, usernames, credentials, or respondent data.
Dependency versions are recorded because only the engine and Excel reader
are directly pinned; this is not a fully locked cross-platform environment.
Older manifests without provenance remain readable.

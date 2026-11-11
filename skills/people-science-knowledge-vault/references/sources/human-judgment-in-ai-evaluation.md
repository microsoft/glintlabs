# Source profile: Human Judgment in AI Evaluation

[Context entry](https://raw.githubusercontent.com/microsoft/glintlabs/main/skills/people-science-knowledge-vault/references/README.md) | [Source priority](https://raw.githubusercontent.com/microsoft/glintlabs/main/skills/people-science-knowledge-vault/references/source-priority.md)

Index review: 2026-11-10. These editorial themes route retrieval; they are not a substitute for the full public source. L locators are extraction lines, p locators are PDF pages, and s locators are reviewed audio segments. Hashes do not prove freshness.

<a id="human-judgment-in-ai-evaluation"></a>
## Human Judgment in AI Evaluation

`human-judgment-in-ai-evaluation` | catalog | reviewed

**Priority:** Original vault; retained tier `curated`.

**Source:** https://raw.githubusercontent.com/microsoft/glintlabs/main/publications/people-science/human-judgment-in-ai-evaluation.md

November 2026 approved first-party public prose summary proposing four stages: define quality, choose evidence, run and refine, and scale. Practitioner guidance to pilot and refine, not a new empirical study, validated rating instrument, universal passing threshold, or demonstrated product performance. The source edition is this summary, not the underlying full paper.

**Reviewed asset scope:** Complete approved public prose summary reviewed from its repository source. Figures, example rating tables, the full underlying paper, and separately verified research citations are not included or required. Repository-source review is not live public-URL verification.

1. **Contextual AI quality extends factual correctness** (framework) - Define AI evaluation around the intended task, intent, usefulness, clarity, trust, and user control. Observed behavior, reported experience, and downstream impact require different evidence.
   Topics: methods, ai-governance. Evidence: `L3`, "Factual correctness is one part of quality.".
2. **Define quality dimensions and behavioral rating anchors** (framework) - Start with intended users, tasks, decisions, and consequential failures. Specify observable criteria and behaviorally anchored rating scales, then pilot and calibrate them; personas plan coverage but do not replace user research.
   Topics: methods, ai-governance. Evidence: `L4`, "Behaviorally anchored rating scales describe what each level looks like".
3. **Match evaluation methods and reviewers to the claim** (method) - Use deterministic checks for explicit requirements, human reviewers for contextual qualities, and model judges within a validated scope. Trained raters, domain specialists, and intended users need the relevant interaction, sources, and context.
   Topics: methods, ai-governance. Evidence: `L5`, "Choose methods that fit the claim.".
4. **Calibrate human reviewers without confusing agreement and validity** (method) - Review shared calibration cases independently before discussing differences. Reviewer agreement alone does not establish that a criterion measures the intended quality.
   Topics: methods, ai-governance. Evidence: `L6`, "Agreement does not establish that a criterion measures the intended quality.".
5. **Preserve evaluation evidence and separate critical failures** (recommendation) - Freeze evaluation materials and system configuration, preserve outputs and rating rationales, and report missing evidence and uncertainty. Keep critical safety, privacy, security, and policy failures separate from quality averages.
   Topics: methods, ai-governance. Evidence: `L6`, "Keep critical safety, privacy, security, and policy failures separate from quality averages.".
6. **Validate AI models used as judges** (method) - For AI models used as judges, compare human and model judgments on the same held-out cases with the same rubric and context. Assess consequential errors and critical failures rather than relying on similar average scores.
   Topics: methods, ai-governance. Evidence: `L7`, "compare human and model judgments on the same held-out cases".
7. **Separate final validation from judge development and regression checks** (method) - Keep final validation separate from rubric and judge development: cases used for tuning are no longer untouched validation evidence. Use versioned regression cases to check later changes.
   Topics: methods, ai-governance. Evidence: `L7`, "cases used for tuning are no longer untouched validation evidence".
8. **Continue human audits of ordinary and flagged cases** (recommendation) - When scaling contextual scoring, continue human audits of ordinary cases as well as flagged failures. This is proposed practitioner guidance to pilot and refine, not demonstrated product performance.
   Topics: methods, ai-governance. Evidence: `L7`, "continue human audits of ordinary cases as well as flagged failures".

## Shared research context

No registered study-family link; this is not proof of independent evidence.

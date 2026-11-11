# Human Judgment in AI Evaluation

Public summary | November 2026

AI evaluation should establish whether a system helps people accomplish the task it was designed to support. Factual correctness is one part of quality. Intent, usefulness, clarity, trust, and user control can also shape the experience, especially across multiple turns. Observed behavior, reported user experience, and downstream impact require different evidence.

The proposed framework connects four stages: define quality, choose evidence, run and refine, and scale. Begin with the intended users, tasks, decisions, and consequential failures. Translate these into dimensions with observable criteria and clear rating rules. Behaviorally anchored rating scales describe what each level looks like; reviewers should pilot and calibrate the anchors before using them for decisions. Personas help plan case coverage, while research with intended users provides evidence about their experience.

Choose methods that fit the claim. Deterministic checks assess explicit requirements, human reviewers judge contextual qualities, and model judges score within a validated scope. Trained raters, domain specialists, and intended users contribute different perspectives. Give each reviewer the interaction, source material, and context needed for the judgment.

Before the reported evaluation, have reviewers assess shared calibration cases independently and discuss differences. Agreement does not establish that a criterion measures the intended quality. Freeze the evaluation materials and system configuration, preserve outputs and rating rationales, and report missing evidence and uncertainty. Keep critical safety, privacy, security, and policy failures separate from quality averages.

To scale contextual scoring, compare human and model judgments on the same held-out cases using the same rubric and context. Assess consequential errors and critical failures, rather than relying on similar average scores. Keep final validation separate from rubric and judge development; cases used for tuning are no longer untouched validation evidence. Use versioned regression cases to check later changes, and continue human audits of ordinary cases as well as flagged failures.

This is a practitioner proposal to pilot and refine. It does not establish a validated rating instrument, universal passing threshold, or demonstrated product performance.

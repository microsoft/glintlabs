# Topic aliases

Use this file to expand a user's question into close variants before searching the
Microsoft Viva Blog or the `External` workbook worksheet. Match aliases in addition
to the user's literal phrase; do not replace the literal phrase.

This list is editorial and intentionally incomplete. Add a canonical topic and its
aliases when a real query surfaces a gap; do not invent aliases speculatively.

| Canonical topic | Aliases / close variants |
|---|---|
| Employee engagement | engagement, workforce engagement, employee motivation |
| Employee experience | EX, workplace experience, employee journey |
| Psychological safety | speak up culture, fear of failure, voice safety |
| Manager effectiveness | people manager quality, frontline manager, manager capability |
| Manager action taking | action planning, closing the loop, post-survey follow-up |
| Employee listening | listening strategy, continuous listening, pulse surveys |
| Burnout / wellbeing | exhaustion, employee wellbeing, stress, overwork |
| Belonging and inclusion | DEI, inclusion, sense of belonging |
| Attrition / retention | turnover, employee churn, flight risk |
| Hybrid and flexible work | remote work, return to office, RTO, flexible work |
| High performance culture | high performing teams, performance culture |
| AI adoption and readiness | Copilot adoption, AI change readiness, generative AI uptake |
| Agentic teaming and trust | AI agents, trust in AI, human-agent teaming |
| Survey methodology | survey design, item wording, measurement validity |
| Benchmarks | normative data, industry comparison, percentile ranking |
| Onboarding | new hire experience, ramp-up, new employee onboarding |

## Maintenance

- Keep canonical topics aligned with `Theme` values observed in the workbook's
  `External` worksheet where practical, so alias expansion and workbook filtering
  stay consistent.
- When a retrieval-quality test (see `tests/test_knowledge_vault_catalog.py`) fails
  because a real user phrase was missed, add the missing alias here rather than
  special-casing it in `SKILL.md`.

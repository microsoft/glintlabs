# Glint navigation for Platform Screenshot Interpretation

Required before recommending a named Glint report/view, giving click paths, or
navigating an authorized Glint session. Apply the entry's
[required-reference gate](../SKILL.md#required-reference-gate), including same-ref
loading and recovery after lost context. This guide is not required for
research-only answers. If unavailable, withhold navigation directions; continue
otherwise-supported research or interpretation whose own requirements pass.

Use [results exploration](results-exploration.md) to choose the uncertainty worth
resolving. This is product guidance, not People Science research evidence or a
reason to prescribe the same investigation for every low score.

## Authority and scope

Public Microsoft Learn bodies below were reviewed on 2026-11-09. They support
the report purposes and entry routes, not every control in every deployment.
Retrieve the relevant current public documentation when checking changed behavior,
metric definitions, permissions, or privacy rules. Documentation can differ from
the current UI, and customer terminology, templates, roles, and programs vary.

Distinguish public-document-supported routes, controls verified in the current
authorized view, and unavailable or unverified features. For deeper click paths,
use only controls actually verified in the current view; do not fill gaps from
model memory. State a material mismatch and use a supported alternative rather
than guessing. Opening a page is not proof every control or calculation works.

Keep instance-specific navigation observations local to the authorized
conversation. Do not copy tenant URLs, report IDs, employee details, comments,
private settings, or QA-only report variants into this public reference.

## Task-to-report routes

Use the current authorized view if it already exposes the needed section.
Otherwise start at **Reports**, select the intended survey program, then its
report card. Check the cycle and population again after opening a report,
including saved reports; the catalog selection alone does not establish their
scope. These are conditional routes, not a checklist to run in order.

| What the check should resolve | Public-document-supported route | Verify before using the result |
| --- | --- | --- |
| Where should open-ended results exploration start? | **Executive summary report -> Strengths and Opportunities** ([guide][executive]) | Cycle, population, key outcome, selected comparison, and item coverage. Review both strengths and opportunities; the ranking reflects comparison and impact, not just raw scores. Honor a different user-requested starting point. |
| Which item and comparison are we discussing? | **Executive summary report -> Scores** ([guide][executive]) | Full item wording, score metric, comparison, and comment count; do not assume an item label has universal wording. |
| Does the mean hide divided responses? | The selected item's **Favorability** breakdown in **Scores** ([executive][executive], [definitions][features]) | Favorable/neutral/unfavorable response distribution and item response count when available; do not infer missing buckets. |
| Is a pattern persistent? | **Overall Results** and its cycle/filter controls ([report][overall], [past cycles][cycles]) | Same program, exact cycles/dates, wording, units, and population. A repeated title or month is not a cycle identifier. |
| Is the pattern broad or concentrated? | **Heat Map Report** with one relevant permitted demographic ([guide][heatmap]) | Active demographic and **Show** setting: Scores, Changes, vs Company, or a combined view. Check the benchmark separately; colors do not establish significance. |
| What experiences might clarify the scores? | **Comments**, filtered to the selected survey item ([report][comments], [manager guide][manager-guide], p. 2) | Actual question subset and population, comment coverage, counterexamples, and aggregate themes. Comment Sentiment describes text, not the item's response Favorability. |
| Could participation limit the comparison? | **Response Rate Report**, including history and demographic views ([guide][response]) | Respondents versus eligible population, program type, and survey status. Always-On response-rate denominators differ from recurring surveys. |
| Are we comparing direct teams or wider hierarchies? | **Manager Report -> Directs / Roll-up Hierarchy** ([guide][manager]) | Hierarchy, selected question labels, and Managers versus Respondents filter scope. This report is not the Manager survey item. |
| What follow-through is recorded? | **Reports -> Focus Area Overview** ([guide][focus]) | Current cycle, access, eligible population, and whether counts describe people, Focus Areas, or action items. Recorded completion is not proof of improved experience. |

Inspect an existing Favorability distribution; do not change the organization's
calculation method in **General settings** just to see it. Those configuration
steps in the scoring documentation are not read-only analysis.

[executive]: https://learn.microsoft.com/en-us/viva/glint/reports/executive-summary-report
[features]: https://learn.microsoft.com/en-us/viva/glint/reports/report-analytics-filtering-favorability-trending
[overall]: https://learn.microsoft.com/en-us/viva/glint/reports/overall-results
[cycles]: https://learn.microsoft.com/en-us/viva/glint/reports/filter-past-cycles
[heatmap]: https://learn.microsoft.com/en-us/viva/glint/reports/heat-map
[comments]: https://learn.microsoft.com/en-us/viva/glint/reports/comments-report
[manager-guide]: https://adoption.microsoft.com/files/viva/glint/Microsoft-Viva-Glint-manager-quick-guide.pdf
[response]: https://learn.microsoft.com/en-us/viva/glint/reports/response-rate-report
[manager]: https://learn.microsoft.com/en-us/viva/glint/reports/manager-report
[focus]: https://learn.microsoft.com/en-us/viva/glint/reports/focus-area-overview-report

## Item details and comments without a shortlist dependency

Selecting a **Heat Map Report** cell opens a report for that driver within the
team ([guide][heatmap]). Use this documented shortcut when it addresses the
selected check; verify the new item and population rather than treating it as
an unfiltered company view.

The Comments report's **Questions** section highlights Top Questions by volume,
positive sentiment, and negative sentiment; it is not a complete question list.
If the selected item is absent, do not claim its comments are unavailable or ask
the user to find it in that shortlist again.

Use the report's verified question filter instead. Where the current UI confirms
an interactive item row or comment count in **Scores**, that is another possible
entry. If it opens question details, inspect the available distribution, trend,
comparison, or comments control appropriate to the investigation. Follow a
full-comment-report control only if its actual label and destination are verified.
These deeper controls need live confirmation; the public sources above do not
certify a universal drawer sequence.

After a drill-down, verify the selected item/subset, filters, and loaded report.
A drawer can remain over the destination: dismiss it before using the underlying
filters. A report title or unchanged URL does not prove the question scope.
If question selection is restricted by access, record the limit rather than
trying to bypass it.

The Comments report has separate question and topic display controls. Verify
which section a Grid, Bubble/cloud, or Table selector belongs to; generic menu
labels can repeat. Do not confuse text sentiment with response distribution or
assume topic coverage represents every respondent.

## Safe browser use and unavailable views

Use only approved browser tools in the user's authorized signed-in session.
Verify the intended tab, loaded content, and absence of an obstructing drawer.
Hidden, loading, or unresponsive pages are not verified empty states. Recover
visibility/loading safely or pause that check; never infer zero from missing
content. A restored OS window is not proof browser automation has reconnected.

Inspect only the aggregate context needed. Suppressed, empty, role-limited, or
unconfigured views are different states, not interchangeable evidence of absence.
Record the limitation, use an available alternative only if it resolves the same
question, and do not repeat unavailable requests or reconstruct suppressed cells.

A label such as "report" or "usage" does not prove a control is read-only.
Check its documented action and verified destination before clicking an unknown
control. An absent href or a plausible label is not sufficient. **All Action
Items Report** is a documented automatic CSV download ([Focus Area guide][focus]).
Do not open export-like controls as exploratory navigation or assume a second
confirmation will prevent a download. Downloads/exports, saves, sharing,
configuration changes, messages, imports, and uploads need explicit authorization
for that action; permission to tour the platform is not that authorization.

If an unexpected download starts, stop the triggering workflow, disclose it, and
contain only the newly created tab/file under host policy. Do not inspect or
redistribute the file. Verify any permitted cleanup and do not claim that deleting
a local file undoes a server-side export or audit event.

Do not claim an exhaustive tour, production parity, or a feature's availability
from catalog presence, a preview badge, one account, or an empty view.

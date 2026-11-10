# Source profile: Viva Glint Questions setup

[Context entry](https://raw.githubusercontent.com/microsoft/glintlabs/main/skills/people-science-knowledge-vault/references/README.md) | [Source priority](https://raw.githubusercontent.com/microsoft/glintlabs/main/skills/people-science-knowledge-vault/references/source-priority.md)

Index review: 2026-11-10. These editorial themes route retrieval; they are not a substitute for the full public source. L locators are extraction lines, p locators are PDF pages, and s locators are reviewed audio segments. Hashes do not prove freshness.

<a id="viva-glint-questions-setup"></a>
## Viva Glint Questions setup

`viva-glint-questions-setup` | catalog | reviewed

**Priority:** Original vault; retained tier `low`.

**Source:** https://learn.microsoft.com/en-us/viva/glint/setup/questions-setup

Complete Engagement-program question configuration documentation; the page explicitly excludes 360 programs. Product rules and eNPS arithmetic are not employee-outcome research.

**Reviewed asset scope:** Complete freshly retrieved public Microsoft Learn article text reviewed, including substantive tables. Sign-in notices and page chrome excluded as evidence. Linked pages, courses, downloads, recordings and image-only details were not reviewed; no refreshed comprehensive figure or media review is claimed.

1. **Engagement-only configuration scope** (documentation) - This Questions setup documentation applies only to Engagement programs, not 360 feedback. In particular, editing the survey introduction is not available for 360 programs; use 360-specific instructions.
   Topics: glint-admin, survey-design, feedback. Evidence: `L23`, "This documentation applies only to Engagement survey programs. If you are creating a 360 feedback program, please refer to the 360-specific documentat".
2. **Participant messages and translations** (documentation) - Customize introduction/thank-you greetings and text and add/remove macros. Select each language to update translations; switching languages autosaves, and Save Changes completes edits. Macros draw values from Glint or employee data.
   Topics: glint-admin, survey-design. Evidence: `L28`, "If the survey uses multiple languages, choose each language from the  Language  dropdown menu to edit translations. Changes autosave when a new langua".
3. **Hyperlinks are excluded from questions** (documentation) - Hyperlinks can appear in the introduction, thank-you message, survey sections and section breaks, but not survey questions. Use the documented display-text/link syntax in each language and preview the result.
   Topics: survey-design, glint-admin. Evidence: `L32`, "A hyperlink can be added to the introduction message, the thank you message, survey section and section break. It can't be added to survey questions.".
4. **Survey logos require a published resource** (documentation) - Use a horizontally oriented transparent-background logo no larger than 16 MB. Publish it as an Image Content Resource, insert its Name with the documented image syntax into the introduction in every language and preview; logos can differ by program.
   Topics: glint-admin. Evidence: `L44`, "Ensure that logos are horizontally oriented, have a transparent background, and 16 MB or smaller in file size.".
5. **Blank recurring cycles and item allocation** (documentation) - Add cycles above the introduction for blank recurring programs and choose each question's cycle numbers. Cycle 1 is the upcoming survey on the scheduled next-send date; every cycle must have at least one selected question to save Questions.
   Topics: glint-admin, survey-design. Evidence: `L66`, "After adding cycles, go to each question and select cycle numbers to include the questions in all or specific survey cycles.".
6. **Search the library before creating items** (documentation) - Search/filter library items by source, type, benchmark and other attributes. Consult organizational survey policies and reuse/repurpose validated standard questions where appropriate; standard items typically include benchmarks and action plans.
   Topics: survey-design, benchmarks. Evidence: `L73`, "Use the Sources, Type, Benchmark, and the More Filters options to filter to items based on your survey needs.".
7. **Custom-item translation and benchmark gaps** (documentation) - New custom questions have no preloaded translations or external benchmarks; separately update every program language and consult mapping guidance if benchmark linkage is intended.
   Topics: survey-design, benchmarks. Evidence: `L83`, "There are no preloaded translations.".
8. **Custom items lack standard risk and action mappings** (documentation) - Custom questions are not included in the Attrition Risk Index and are not mapped to standard Action Plan Templates or recommended Focus Areas. Do not equate adding a question with retaining those standard capabilities.
   Topics: survey-design, retention, action-taking. Evidence: `L85`, "Custom questions aren't included in the  Attrition Risk Index .".
9. **eNPS categories and calculation** (documentation) - eNPS uses respondent-facing scores 0–10: 9–10 Promoters, 7–8 Passives and 0–6 Detractors. Score equals percentage Promoters minus percentage Detractors, ranging from −100 to +100; it is not a mean rating.
   Topics: survey-design, survey-interpretation. Evidence: `L96`, "An eNPS question uses an eleven point scale ranging from 0 (Not at all likely) to 10 (Extremely likely). Responses are categorized as:".
10. **eNPS internal scale differs from display** (documentation) - Glint stores the eNPS scale internally as 1–11 because it does not store zero, while respondents see 0–10. The documentation states this does not change calculation/reporting; verify the visible scale in survey preview.
   Topics: glint-admin, survey-interpretation. Evidence: `L102`, "Although eNPS is conceptually a 0–10 scale, the Glint system does not store a value of 0 internally. Therefore, Glint uses a 1–11 scale but the employ".
11. **eNPS requires manual creation and enabled scale** (documentation) - There is no default eNPS question. Create a Rating item using 11 Point Scale with Not at all likely/Extremely likely endpoints and translations. Advanced Configuration Default Rating Scale options must include 11 or selecting it raises an error; aggregate creation follows standard index logic.
   Topics: glint-admin, survey-design. Evidence: `L111`, "(Note: admins with advanced configuration access should add '11' as one of the  Default Rating Scale  setting options in  Advanced Configuration  if a".
12. **Check shared use before edits** (documentation) - Before editing an item, inspect Associated Programs for other surveys using it and review implications of changing standard questions. Many items cannot be edited once a survey is live; this page does not enumerate every live-edit restriction.
   Topics: glint-admin, survey-design. Evidence: `L120`, "Select the item and check whether it exists in other surveys in the Associated Programs tab.".
13. **Preserve response-option history** (documentation) - Use Add new choice for a new Multiple Choice/Multi-Select option and Hide to retire an old one. Overwriting an existing option with a different label creates report trend problems and raw-export confusion.
   Topics: survey-design, survey-interpretation. Evidence: `L130`, "To add a new response option to Multiple Choice/Multi-Select questions, always use the "+ Add new choice" feature. Switch the "Show" toggle to "Hide" ".
14. **Open text is always optional** (documentation) - Open-ended questions are always optional and have no Optional question switch. Rating and multiple-choice questions support optionality and supplementary comment controls.
   Topics: survey-design. Evidence: `L129`, "Open-Ended questions are always optional and don't include an "Optional question" setting.".
15. **Immutable identity versus editable metadata** (documentation) - For existing items, Question ID, Question Type and Rating scale are view-only. Wording, reporting labels, instructions, translations and comment placeholders are editable; rating items also support benchmark links, endpoint/all-option labels and Suggested Action Template selection.
   Topics: glint-admin, survey-design. Evidence: `L138`, "Unique question ID.".
16. **Multiple-choice controls and bulk options** (documentation) - Multiple-choice items support descriptions, response labels and CSV bulk upload of up to 500 options per question. Multi-select minimum and maximum selections govern required/allowed response counts.
   Topics: survey-design, glint-admin. Evidence: `L194`, "Survey admins can upload a CSV file to add multiple choice response options in bulk, rather than entering each option individually. Supports up to 500".
17. **Transient breaks versus persistent sections** (documentation) - A Section Break is a message that disappears when scrolling; a Survey Section retains a header with attached questions. To place existing survey questions inside a section, delete and readd them there; translate section text for each language.
   Topics: survey-design. Evidence: `L219`, "Section Break : A message that appears once for a survey taker and disappears as they scroll through a survey.".
18. **Population targeting versus response logic** (documentation) - Distribution Lists or User Roles can include/exclude items for specified populations. Display logic instead shows/hides items based on answers to preceding questions; these features tailor different aspects of the survey.
   Topics: survey-design, glint-admin. Evidence: `L243`, "Microsoft Viva Glint Administrators can use Distribution Lists or User Roles to target survey items or exclude items for specific groups of users.  Le".
19. **Program deletion preserves library items** (documentation) - Deleting a question from the program only removes that program's use. The question remains in the Question Library for reuse in other surveys.
   Topics: glint-admin, survey-design. Evidence: `L252`, "This action only removes the item from the survey program. The item still exists in the Question Library and Viva Glint Admins can add it to other sur".

## Shared research context

No registered study-family link; this is not proof of independent evidence.

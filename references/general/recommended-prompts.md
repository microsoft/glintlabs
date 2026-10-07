# Recommended prompts for the Microsoft Copilot in Viva Glint sidecar

These are example prompts for the **Copilot in Viva Glint** sidecar chat pane
— the in-product assistant that managers, HR leaders, and org leaders use
from a Viva Glint report to explore comment themes, sentiment, and survey
scores. This is distinct from the `eve-people-science` skills in this repo,
which analyze exported survey data offline; these prompts are for the native
Glint dashboard/report Copilot experience itself.

Source: [Introduction to Microsoft Copilot in Viva Glint](https://learn.microsoft.com/en-us/viva/glint/copilot/copilot-admin-intro),
[Copilot Comment Summary in Viva Glint](https://learn.microsoft.com/en-us/viva/glint/copilot/copilot-comments-summary),
[How managers use Copilot in Viva Glint](https://learn.microsoft.com/en-us/viva/glint/setup/copilot-managers),
[Manager Guide for Copilot in Viva Glint](https://learn.microsoft.com/en-us/viva/glint/setup/copilot-manager-quick-guide).

## What the sidecar can actually do

- **Copilot Highlights** — appears automatically (no prompt needed) at the
  top of Team Summary and Executive Summary reports. Summarizes
  quantitative results: response rate, key outcome score, top strengths,
  team-score breakdowns, and top opportunities.
- **Comment summarization** — an interactive chat pane that summarizes up to
  8,000 open-ended survey comments, grouped into up to 10 themes. Available
  for Recurring and Ad hoc survey programs (not Always-On or Employee
  Lifecycle programs). Respects confidentiality thresholds and only
  processes comments the signed-in user is permitted to view.

Recommended flow: start with Highlights for the "what," then use comment
summarization prompts below to explore the "why."

## Prompt starters: build on Copilot Highlights

Fill in `[bracketed]` placeholders with your own survey items, teams, or
scores from the Highlights card.

- "What are people saying about [opportunity item from Highlights]?"
- "Why did [team with the largest decrease in Highlights] score lower this
  cycle?"
- "What are employees recommending we do to improve [key outcome from
  Highlights]?"
- "Summarize comments from [highest/lowest scoring team in Highlights]."

## General comment exploration

- "Summarize all comments for me."
- "What are employees saying at my organization?"
- "Provide three actions based on the comments from my employees."
- "Provide a summary of the comment themes."
- "What are the top five topics from the comments?"
- "What are employees saying that's positive about the organization?"

## Filtered and demographic prompts

- "Provide three actions based on comments from my employees for the
  [item name] item."
- "Find comments from employees in the [department name] who've worked at
  the company for less than one year."
- "Show feedback from employees aged 50+ about our [onboarding] program."
- "Show comments related to [career development]."
- "Tell me what employees in [APAC] are saying about [work-life balance]."

## Suggested prompts by topic

| Topic | Example prompt |
| --- | --- |
| Comment summarization / filter | "What are people in the [Marketing] department saying about the [item]?" |
| Diversity and inclusion | "What are the common concerns raised by [group] in [engineering] regarding workplace inclusion? State the top three themes for item [number]." |
| Performance and productivity | "What feedback do employees give about the current performance evaluation process? Are there any recurring themes in comments from high-performing teams?" |
| Retention and turnover | "What reasons do employees give for considering leaving the company? Provide three comments from long-tenured employees." |
| Leadership and management | "What are the common themes in feedback about senior leadership? How do employees perceive the effectiveness of their managers?" |
| Work environment and culture | "What are the main concerns employees have about the current work environment? Summarize the top two comment themes around company culture from item [number] from managers." |

## Deep-dive example

> Summarize the "Microsoft Viva People Success Elements." Then suggest a few
> concrete actions for me, as a Department Manager, to improve my employee
> engagement score. Use the comments in the [survey name/date] survey.

Swap in your own organization's values in place of the Viva People Success
Elements, and ask follow-up prompts that drill into one highlighted theme at
a time.

## Tips for writing effective prompts

- **Prompts are capped at 250 characters** — be specific but concise.
- **Reference Highlights data** (scores, trends, team names) to make comment
  prompts more targeted.
- **Bundle multi-step asks into one prompt.** Copilot can't summarize its own
  summary, so ask for the full analysis up front (e.g., themes + actions)
  rather than asking it to summarize a prior answer.
- **Use available report filters** (demographic/HRIS attributes) in prompts
  — the filter must already be enabled on the report for Copilot to use it.
- **Stay within Viva Glint data.** Copilot only sees what's on the current
  dashboard/report; it can't compare across employee groups or survey cycles
  yet, and it won't answer questions outside the survey data.

## Prompts by persona and use case

A curated starter set for client-facing teams to hand to end users, grouped
by what the user is trying to accomplish rather than by product feature.
Every prompt stays within the sidecar's supported scope: single-survey,
current-session comments, and report filters that are already enabled.

### Start with the big picture (after reading Copilot Highlights)

- "What are people saying about [top opportunity from Highlights]?"
- "Why did [team] score lower this cycle on [item/outcome]?"
- "What's driving the increase in [key outcome score]?"

### Understand themes and sentiment in comments

- "Summarize all comments for me."
- "What are the top five themes in the comments from this survey?"
- "What are employees saying that's positive about the organization?"
- "What are the most common concerns raised in the comments?"

### Turn feedback into action

- "Provide three actions based on the comments from my employees."
- "What are employees recommending leadership do to improve [topic]?"
- "Summarize the comment themes, then suggest two concrete next steps for me
  as a manager."

### Segment by team or demographic

- "Summarize comments from [highest/lowest scoring team]."
- "What are people in the [department] saying about [item]?"
- "Show comments from employees who've worked here less than one year."
- "Tell me what employees in [region] are saying about [topic, e.g.,
  work-life balance]."

### Topic-specific deep dives

- "What are the common themes in feedback about senior leadership?"
- "What feedback do employees give about the performance review process?"
- "What reasons do employees give for considering leaving the company?"
- "What are the main concerns about the current work environment or
  culture?"

### Persona starter sets

| Persona | Suggested starting prompts |
| --- | --- |
| Manager | "What are people saying about [top opportunity from Highlights]?", "Tell me what employees in [region] are saying about [topic]?", "Provide three actions based on the comments from my employees.", "Summarize comments from [highest/lowest scoring team]." |
| HR leader | "What are employees saying that's positive about the organization?", "What are employees recommending leadership do to improve [topic]?", "What are the common themes in feedback about senior leadership?", "What reasons do employees give for considering leaving the company?" |
| Executive / org leader | "What are the top five themes in the comments from this survey?", "Why did [team] score lower this cycle on [item/outcome]?", "Summarize the comment themes, then suggest two concrete next steps for me as a manager.", "What are the main concerns about the current work environment or culture?" |

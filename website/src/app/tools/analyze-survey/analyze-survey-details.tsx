"use client";

import { ArrowDownExclamation24Regular } from "@fluentui/react-icons/svg/arrow-down-exclamation";
import { CameraSwitch24Regular } from "@fluentui/react-icons/svg/camera-switch";
import { DataFunnel24Regular } from "@fluentui/react-icons/svg/data-funnel";
import { EyeCircle24Regular } from "@fluentui/react-icons/svg/eye-circle";
import { Fluid24Regular } from "@fluentui/react-icons/svg/fluid";
import { PeopleCheckmark24Regular } from "@fluentui/react-icons/svg/people-checkmark";
import { PersonWarning24Regular } from "@fluentui/react-icons/svg/person-warning";
import { Production24Regular } from "@fluentui/react-icons/svg/production";
import { ShieldTask24Regular } from "@fluentui/react-icons/svg/shield-task";

import { SkillDetails, type SkillDetailsContent } from "../skill-details";

const skillUrl = "https://github.com/microsoft/glintlabs/blob/main/skills/analyze-survey/SKILL.md";
const starterPrompt = "I want to analyze employee survey data.";

const content: SkillDetailsContent = {
  title: "Analyze Survey",
  description: "Turn employee survey data into advanced analysis with an AI-guided, no-code workflow. Explore inter-item correlations, factor analysis, attrition analysis, and comparisons across surveys in an interactive report you can filter, export, and share.",
  skillUrl,
  starterPrompt,
  setupDescription: "Open your terminal and start GitHub Copilot CLI. Copy the link below, paste it into Copilot, and ask it to use the Analyze Survey skill.",
  promptTitle: "Start an analysis",
  promptDescription: "When Copilot opens, paste this prompt. The skill will ask how you want to provide survey data before it runs.",
  overview: <>The Analyze Survey skill uses advanced statistical methods from our <a href="https://github.com/microsoft/vivaglint_py" rel="noreferrer" target="_blank">Viva Glint Analytics Library</a>. Every run of Analyze Survey is inspected and evaluated for accuracy and repeatability.</>,
  analyses: [
    { Icon: Fluid24Regular, title: "Correlation", questions: [
      "How related are the questions to each-other?",
      "Are there any topics that cluster?",
      "Do we potentially have redundant items?",
    ] },
    { Icon: Production24Regular, title: "Factor Analysis", questions: [
      "Can we group items together into unique dimensions? If so, how much of the overall survey variance does that explain?",
    ] },
    { Icon: PersonWarning24Regular, title: "Attrition", questions: [
      "Why are our people leaving?",
      "We have exit data, are the employees leaving scoring worse on survey items before they exit?",
    ] },
    { Icon: PeopleCheckmark24Regular, title: "Attrition Insights", questions: ["What groups should I target?"] },
    { Icon: CameraSwitch24Regular, title: "Scores Change", questions: [
      "I have two surveys. Can you tell me how the scores have changed? And if those changes are statistically significant?",
    ] },
    { Icon: DataFunnel24Regular, title: "Attribute Deep Dive", questions: [
      "I want all of this analysis filterable by user attributes I provide.",
    ] },
  ],
  results: "Analyze Survey makes a repeatable workflow easier to run. It does not remove the need for methodological review, organizational context, or responsible handling of employee data.",
  safeguards: [
    {
      Icon: ArrowDownExclamation24Regular,
      title: "Do not infer causation",
      description: "Correlation and factor results describe patterns in the supplied data. They do not establish that one workplace condition caused another.",
    },
    {
      Icon: ShieldTask24Regular,
      title: "Protect employee privacy",
      description: "Confirm small-group suppression, attribute handling, and the contents of the share package before results leave the approved environment.",
    },
    {
      Icon: EyeCircle24Regular,
      title: "Review before acting",
      description: "A qualified reviewer should inspect data quality, assumptions, caveats, and surprising findings before the analysis informs a consequential decision.",
    },
  ],
  figmaNodeId: "1747:42711",
};

export function AnalyzeSurveyDetails({ onClose }: { onClose?: () => void }) {
  return <SkillDetails content={content} onClose={onClose} />;
}

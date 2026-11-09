import { ArrowDownExclamation24Regular } from "@fluentui/react-icons/svg/arrow-down-exclamation";
import { EyeCircle24Regular } from "@fluentui/react-icons/svg/eye-circle";
import { Fluid24Regular } from "@fluentui/react-icons/svg/fluid";
import { PeopleCheckmark24Regular } from "@fluentui/react-icons/svg/people-checkmark";
import { Production24Regular } from "@fluentui/react-icons/svg/production";
import { ShieldTask24Regular } from "@fluentui/react-icons/svg/shield-task";

import type { SkillDetailsContent } from "../skill-details";

export const knowledgeVaultContent: SkillDetailsContent = {
  title: "People Science Knowledge Vault",
  description: "Explore People Science research with an AI thought partner. Ask workplace questions, make sense of Glint results, and find sources and next steps to inform your decisions.",
  skillUrl: "https://github.com/microsoft/glintlabs/blob/main/skills/people-science-knowledge-vault/SKILL.md",
  starterPrompt: "Use People Science Knowledge Vault to explore what research says about manager effectiveness. Include sources and questions to consider next.",
  setupDescription: "Start GitHub Copilot CLI. Copy the skill link below, paste it into Copilot, and ask it to follow the linked instructions.",
  promptTitle: "Ask a People Science question",
  promptDescription: "Start with a research question. You can also share a redacted Glint screenshot or aggregate results to explore what they might mean.",
  overview: "Explore published People Science research and use it to put Glint results in context. The skill distinguishes what your results show, what research supports, and what still needs checking.",
  analyses: [
    { Icon: Fluid24Regular, title: "Explore research", questions: [
      "What does research say about manager effectiveness?",
      "How does work design relate to employee experience?",
      "Which sources could help us understand this topic?",
    ] },
    { Icon: Production24Regular, title: "Understand results", questions: [
      "What might this Glint results pattern mean, and what context or evidence would help us interpret it?",
    ] },
    { Icon: PeopleCheckmark24Regular, title: "Explore next steps", questions: [
      "What should we check before drawing a conclusion?",
      "Which follow-up view or question could help us test an explanation?",
    ] },
  ],
  results: "Expect a research-informed conversation, not a single right answer. Use the response, sources, and follow-up questions to support your judgment.",
  safeguards: [
    {
      Icon: ArrowDownExclamation24Regular,
      title: "Check the evidence",
      description: "Review the linked sources, their scope, and any limits. Research findings may not explain your organization's results.",
    },
    {
      Icon: ShieldTask24Regular,
      title: "Share safely",
      description: "Use redacted screenshots or aggregate results. Leave out employee names, raw comments, and identifying details.",
    },
    {
      Icon: EyeCircle24Regular,
      title: "Keep context in view",
      description: "Treat possible explanations as hypotheses. Check your context before turning a suggestion into action.",
    },
  ],
  figmaNodeId: "2146:606",
};

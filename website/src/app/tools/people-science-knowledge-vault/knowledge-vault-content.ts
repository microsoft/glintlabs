import { ChatMultiple24Regular } from "@fluentui/react-icons/svg/chat-multiple";
import { Fluid24Regular } from "@fluentui/react-icons/svg/fluid";
import { PersonWarning24Regular } from "@fluentui/react-icons/svg/person-warning";
import { Production24Regular } from "@fluentui/react-icons/svg/production";
import { TabDesktopSearch24Regular } from "@fluentui/react-icons/svg/tab-desktop-search";
import Image from "next/image";
import { createElement } from "react";

import type { SkillDetailsContent } from "../skill-details";

function AutoFitIcon() {
  return createElement(Image, {
    src: "/figma/site-canonical/tools/knowledge-vault-auto-fit.svg",
    alt: "",
    "aria-hidden": true,
    width: 24,
    height: 24,
    loading: "eager",
    unoptimized: true,
  });
}

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
    { Icon: PersonWarning24Regular, title: "Explore next steps", questions: [
      "What should we check before drawing a conclusion?",
      "Which follow-up view or question could help us test an explanation?",
    ] },
  ],
  results: "Move from “What am I looking at?” to “What could this mean for our people?” Explore your results with an AI thought partner that helps you connect the dots, question first impressions, and build a story grounded in evidence.",
  safeguards: [
    {
      Icon: TabDesktopSearch24Regular,
      title: "Find the story worth exploring",
      description: "Look beyond individual scores to explore how strengths, tensions, and differences between groups fit together.",
    },
    {
      Icon: AutoFitIcon,
      title: "Give the story depth",
      description: "Connect what you’re seeing with People Science research and your organization’s context. Consider different explanations and identify what would help distinguish them.",
    },
    {
      Icon: ChatMultiple24Regular,
      title: "Put the story to work",
      description: "Develop a clear narrative to discuss with leaders or your team, including what you know, what remains uncertain, and what to explore next.",
    },
  ],
  figmaNodeId: "2146:606",
};

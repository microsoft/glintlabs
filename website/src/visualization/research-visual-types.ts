export const researchVisualTemplates = [
  "manager-behaviors",
  "ai-metacognition",
  "four-is",
  "ai-friction",
  "manager-role-shifts",
  "ai-intent",
  "ai-profiles",
  "industry-utilization",
  "performance-barriers",
  "driver-item-usage",
] as const;

export type ResearchVisualTemplate = typeof researchVisualTemplates[number];

export const researchVisualColumnCounts: Record<ResearchVisualTemplate, number> = {
  "manager-behaviors": 2,
  "ai-metacognition": 2,
  "four-is": 3,
  "ai-friction": 3,
  "manager-role-shifts": 4,
  "ai-intent": 2,
  "ai-profiles": 3,
  "industry-utilization": 4,
  "performance-barriers": 5,
  "driver-item-usage": 4,
};

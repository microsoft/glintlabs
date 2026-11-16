export const toolFeedbackEvents = {
  "analyze-survey": {
    up: "tool_analyze_survey_thumbs_up",
    down: "tool_analyze_survey_thumbs_down",
  },
  "knowledge-vault": {
    up: "tool_knowledge_vault_thumbs_up",
    down: "tool_knowledge_vault_thumbs_down",
  },
} as const;

export type FeedbackTool = keyof typeof toolFeedbackEvents;
export type FeedbackRating = "up" | "down";

export const toolFeedbackReasons = [
  { value: "not_useful", label: "Not useful to me" },
  { value: "hard_to_use", label: "Hard to use" },
  { value: "technical_issue", label: "Something didn't work" },
] as const;
export type FeedbackReason = typeof toolFeedbackReasons[number]["value"];
export const toolFeedbackReasonsEvent = "glintlabs:tool-feedback-reasons";

const eventNames = new Set<string>(Object.values(toolFeedbackEvents).flatMap(Object.values));

export function isToolFeedbackEvent(name: string): boolean {
  return eventNames.has(name);
}

export function getToolFeedbackReasonEvents(tool: unknown, reasons: unknown): string[] {
  if ((tool !== "analyze-survey" && tool !== "knowledge-vault") || !Array.isArray(reasons)) return [];
  const allowed = reasons.filter((reason): reason is FeedbackReason =>
    toolFeedbackReasons.some(option => option.value === reason));
  return [...new Set(allowed)].map(reason => `${toolFeedbackEvents[tool].down}_reason_${reason}`);
}

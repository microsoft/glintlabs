import type { ReportBlock } from "../manifest/report-manifest.ts";

type ScorecardBlock = Extract<
  ReportBlock,
  { type: "listening-maturity-scorecard" }
>;

export const defaultMaturityCategories: ScorecardBlock["categories"] = [
  {
    id: "inclusive",
    title: "Inclusive participation and access",
    criteria: [
      "Easy to provide feedback",
      "Representative employee reach",
      "Listening data easy to access and use",
    ],
  },
  {
    id: "action",
    title: "Action and accountability",
    criteria: [
      "Communicate what changed",
      "Equip managers to act promptly",
      "Hold leaders and managers accountable",
    ],
  },
  {
    id: "strategic",
    title: "Strategic impact",
    criteria: [
      "Influence senior and business decisions",
      "Connect listening to outcomes",
      "Measure the impact of actions",
    ],
  },
  {
    id: "adaptive",
    title: "Adaptive intelligence",
    criteria: [
      "Listen outside formal survey cycles",
      "Identify emerging risks and friction",
      "Inform AI-adoption decisions",
    ],
  },
];

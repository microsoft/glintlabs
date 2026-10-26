import type { ReportBlock } from "../manifest/report-manifest.ts";

export const canonicalVisualTypes = [
  "listening-approach-continuum",
  "featured-statistic",
  "data-callout",
  "references",
  "listening-methods-comparison",
  "pull-quote",
  "percentage-ring-group",
  "horizontal-bar-chart",
  "grouped-column-comparison",
  "before-after-comparison",
  "impact-metrics",
  "two-column-insight",
] as const;

export type CanonicalVisualType = (typeof canonicalVisualTypes)[number];
export type CanonicalVisualBlock = Extract<
  ReportBlock,
  { type: CanonicalVisualType }
>;

export const canonicalVisualOptions: Array<{
  kind: CanonicalVisualType;
  name: string;
  reason: string;
}> = [
  {
    kind: "listening-approach-continuum",
    name: "Listening approach continuum",
    reason: "Compare three approaches across a shared progression",
  },
  {
    kind: "featured-statistic",
    name: "Featured statistic",
    reason: "Pair a prominent finding with supporting context",
  },
  {
    kind: "data-callout",
    name: "Data callout",
    reason: "Reveal approved explanatory context in a compact disclosure",
  },
  {
    kind: "references",
    name: "References",
    reason: "Present two approved references with supporting context",
  },
  {
    kind: "listening-methods-comparison",
    name: "Listening methods comparison",
    reason: "Compare four methods against a benchmark",
  },
  {
    kind: "pull-quote",
    name: "Pull quote",
    reason: "Emphasize a key statement within the report",
  },
  {
    kind: "percentage-ring-group",
    name: "Percentage ring group",
    reason: "Show three related percentages with explanations",
  },
  {
    kind: "horizontal-bar-chart",
    name: "Horizontal bar chart",
    reason: "Rank up to twelve categories by percentage",
  },
  {
    kind: "grouped-column-comparison",
    name: "Grouped column comparison",
    reason: "Compare two series across four measures",
  },
  {
    kind: "before-after-comparison",
    name: "Roles",
    reason: "Explain three transitions from a traditional to an AI-era role",
  },
  {
    kind: "impact-metrics",
    name: "Bullets",
    reason: "Highlight two or three concise evidence statements",
  },
  {
    kind: "two-column-insight",
    name: "Two-column insight",
    reason: "Pair a lead statement with two supporting insights",
  },
];

export function isCanonicalVisualBlock(
  block: ReportBlock,
): block is CanonicalVisualBlock {
  return canonicalVisualTypes.some((type) => block.type === type);
}

export function createCanonicalVisualBlock(
  type: CanonicalVisualType,
  id: string,
  source: ReportBlock["source"],
): CanonicalVisualBlock {
  switch (type) {
    case "listening-approach-continuum":
      return {
        id,
        source,
        type,
        eyebrow: "Right-fit listening signal",
        title: "Match listening to the questions, decisions, and pace of work",
        description:
          "The goal is not maximum collection. It is enough timely signal to understand what is changing without overwhelming the ability to synthesize and act.",
        rows: [
          {
            id: `${id}-row-1`,
            label: "Pace of work",
            description: "Events arrive closer together",
            positions: [7, 23, 38, 51, 60, 68, 77, 88],
          },
          {
            id: `${id}-row-2`,
            label: "Traditional listening",
            description: "Survey moments remain periodic",
            positions: [15, 49, 83],
          },
          {
            id: `${id}-row-3`,
            label: "Understanding",
            description: "Context and judgment take time",
            positions: [32, 68],
          },
        ],
      };
    case "featured-statistic":
      return {
        id,
        source,
        type,
        title: "The tenuous balance of trust",
        statistic:
          "Even though listening leaders rank strengthening trust as one of their top three value adds, they also place losing that trust as their number one challenge.",
        description:
          "It’s a fine balance: how do you encourage employees and create that space? If participation becomes a compliance exercise, we see comments saying, ‘I was forced to do it’, ‘I didn’t want to do it.’",
        sourceNote:
          "Mona Kane   /   Head of People at Contoso",
      };
    case "data-callout":
      return {
        id,
        source,
        type,
        variant: "compact",
        title: "Research drop in brief",
        paragraphs: [
          "Managers are a catalyst of AI transformation as they bridge strategy and execution.",
          "Enabling managers scales impact when leaders role model effective AI use.",
          "Managers who create psychological safety help teams build readiness, trust, and realized value.",
        ],
      };
    case "references":
      return {
        id,
        source,
        type,
        title: "References",
        references: [
          {
            id: `${id}-reference-1`,
            title:
              "Microsoft People Science research supporting the findings in this report.",
            citation: "Microsoft People Science",
          },
          {
            id: `${id}-reference-2`,
            title:
              "Microsoft Work Trend Index research on AI adoption and organizational change.",
            citation: "Work Trend Index",
          },
          {
            id: `${id}-reference-3`,
            title:
              "Supporting research on manager enablement, learning, and responsible AI.",
            citation: "Supporting research",
          },
        ],
      };
    case "listening-methods-comparison":
      return {
        id,
        source,
        type,
        eyebrow: "---",
        methods: [
          {
            id: `${id}-method-1`,
            label: "Facilitated dialogue",
            value: 78,
            badge: "Qualitative depth",
          },
          {
            id: `${id}-method-2`,
            label: "Open and ongoing",
            value: 74,
            badge: "Outside scheduled cycles",
          },
          {
            id: `${id}-method-3`,
            label: "Ambient or passive",
            value: 71,
            badge: "Behavioral patterns",
          },
          {
            id: `${id}-method-4`,
            label: "Embedded and frontline",
            value: 48,
            badge: "Close to work",
          },
        ],
        benchmark: {
          label: "Core surveys",
          description:
            "Representative employee voice at scale · comparison · trends over time",
          value: 91,
        },
      };
    case "pull-quote":
      return {
        id,
        source,
        type,
        quote:
          "Employees adopted AI faster when learning centered on a real task from their role.",
      };
    case "percentage-ring-group":
      return {
        id,
        source,
        type,
        title: "Strong manager optimism around integrating AI agents into their team",
        metrics: [
          {
            id: `${id}-metric-1`,
            value: 73,
            description:
              "I believe teams that embrace AI agents will have a competitive advantage.",
          },
          {
            id: `${id}-metric-2`,
            value: 62,
            description:
              "I am an advocate for AI Agents to be integrated into my team.",
          },
          {
            id: `${id}-metric-3`,
            value: 64,
            description:
              "I believe AI Agents could help my team achieve goals we couldn’t reach alone.",
          },
        ],
        footnote:
          "Source: Microsoft People Science Agentic Teaming & Trust Survey, n = 520 global, full-time, English-speaking managers. July 2025.",
      };
    case "horizontal-bar-chart":
      return {
        id,
        source,
        type,
        title:
          "In the last six months, which of the following activities have you done regarding AI at work?",
        items: [
          { id: `${id}-item-1`, label: "I tested how AI could help by running a small trial project", value: 32 },
          { id: `${id}-item-2`, label: "I experimented with prompting at work", value: 31 },
          { id: `${id}-item-3`, label: "I collected feedback about AI tools we use on our team", value: 31 },
          { id: `${id}-item-4`, label: "I shared successful AI use cases or prompt strategies", value: 31 },
          { id: `${id}-item-5`, label: "I sought out updates or access to new AI features or tools", value: 30 },
          { id: `${id}-item-6`, label: "I shared feedback with my leadership about our AI tools", value: 30 },
          { id: `${id}-item-7`, label: "I engaged in non-mandatory learning or training on AI", value: 29 },
          { id: `${id}-item-8`, label: "I took a mandatory training course on AI", value: 26 },
          { id: `${id}-item-9`, label: "I created a prompt library or \"how-to\" guide for my team", value: 20 },
          { id: `${id}-item-10`, label: "I coached or mentored coworkers 1:1 on how to effectively use AI", value: 19 },
          { id: `${id}-item-11`, label: "I joined a social community at my company related to AI", value: 17 },
        ],
        legend: "% of managers",
        sourceNote:
          "Source: Microsoft People Science Agentic Teaming & Trust Survey, n = 520 global, full-time, English-speaking managers. July 2025.",
      };
    case "grouped-column-comparison":
      return {
        id,
        source,
        type,
        title:
          "Psychologically safe employees report higher readiness and impact of AI agents",
        subtitle: "Average percent favorable",
        series: ["Psychologically safe", "Everyone else"],
        groups: [
          {
            id: `${id}-group-1`,
            label: "Individual Agent Readiness",
            values: [76, 60],
          },
          {
            id: `${id}-group-2`,
            label: "Team Agent Readiness",
            values: [76, 56],
          },
          { id: `${id}-group-3`, label: "Agent RIVA", values: [82, 71] },
          { id: `${id}-group-4`, label: "Agent RTVA", values: [85, 72] },
        ],
        sourceNote:
          "Note: Agent RIVA stands for \"Realized Individual Value of Agentic AI\", and Agent RTVA stands for \"Realized Team Value of Agentic AI\".\nSource: Microsoft People Science Agentic Teaming & Trust Survey, n = 1,800 global, full-time, English-speaking employees. July 2025.",
      };
    case "before-after-comparison":
      return {
        id,
        source,
        type,
        title: "The manager role is evolving for an AI-first future",
        sections: ["Mindset", "Knowledge", "Skill"].map((label, index) => ({
          id: `${id}-section-${index + 1}`,
          label,
          beforeTitle: "Traditional role",
          beforeDescription:
            "Managers rely on established ways of directing and completing work.",
          afterTitle: "AI-era role",
          afterDescription:
            "Managers combine human judgment with AI to expand what the team can achieve.",
          summary:
            "Build confidence through role-specific practice, reflection, and clear accountability.",
        })),
      };
    case "impact-metrics":
      return {
        id,
        source,
        type,
        title: "And when leaders role model, the impact is clear",
        intro:
          "For those who agree that their leaders role model effective AI use, they see:",
        metrics: [
          { id: `${id}-metric-1`, text: "+17pp uplift in realized value from agentic AI" },
          { id: `${id}-metric-2`, text: "+22pp increase in critical thinking about AI" },
          { id: `${id}-metric-3`, text: "+30pp boost in trust in agentic AI" },
        ],
      };
    case "two-column-insight":
      return {
        id,
        source,
        type,
        eyebrow: "What this means",
        lead:
          "Employees build confidence when learning is connected to meaningful work.",
        insights: [
          {
            id: `${id}-insight-1`,
            title: "Practice in context",
            description: "Use real tasks so employees can judge where AI adds value.",
          },
          {
            id: `${id}-insight-2`,
            title: "Reinforce through reflection",
            description: "Create space to compare approaches and discuss output quality.",
          },
        ],
      };
  }
}

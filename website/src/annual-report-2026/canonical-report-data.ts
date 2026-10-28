export const capabilityRatings = ["Poor", "Fair", "Good", "Strong", "Best in class"] as const;

export const sampleDemographics = [
  {
    name: "Employee listening leader survey",
    sample: "103 respondents • Global",
    countLabel: "n",
    tables: [
      { title: "Region", rows: [
        ["NAMER", 61, 59.2], ["EMEA", 28, 27.2], ["APAC", 14, 13.6],
      ] },
      { title: "Country", rows: [
        ["United States", 61, 59.2], ["United Kingdom", 17, 16.5],
        ["India", 13, 12.6], ["Germany", 4, 3.9], ["Spain", 3, 2.9],
        ["France", 2, 1.9], ["Italy", 2, 1.9], ["China", 1, 1.0],
      ] },
      { title: "Industry", rows: [
        ["Technology", 26, 25.2], ["Healthcare", 20, 19.4],
        ["Retail, Food, and Beverage", 18, 17.5], ["Manufacturing", 15, 14.6],
        ["Financial and Professional Services, such as accounting, consulting, or legal services", 10, 9.7],
        ["Transportation, Travel, and Hospitality", 6, 5.8],
        ["Media and Entertainment", 4, 3.9], ["Other", 3, 2.9],
        ["Construction", 1, 1.0],
      ] },
      { title: "Company size", rows: [
        ["1,000 to 4,999", 31, 30.1], ["5,000 to 14,999", 21, 20.4],
        ["15,000 to 24,999", 19, 18.4], ["25,000 or more", 32, 31.1],
      ] },
      { title: "Job level", rows: [
        ["Senior Director / Director", 39, 37.9],
        ["Head of Department / Functional Lead", 16, 15.5],
        ["C-level executive, such as CHRO, Chief People Officer, Chief Experience Officer", 14, 13.6],
        ["Vice President", 14, 13.6], ["Senior Manager / Manager", 11, 10.7],
        ["Executive Vice President / Senior Vice President", 9, 8.7],
      ] },
    ],
  },
  {
    name: "Employee and people manager survey",
    sample: "500 respondents • United States only",
    countLabel: "n",
    tables: [
      { title: "Industry", rows: [
        ["Technology", 94, 18.8], ["Manufacturing", 89, 17.8], ["Healthcare", 84, 16.8],
        ["Retail, Food, and Beverage", 82, 16.4],
        ["Financial and Professional Services (e.g., accounting, consulting, legal firm)", 65, 13.0],
        ["Transportation, Travel, and Hospitality", 29, 5.8], ["Construction", 28, 5.6],
        ["Other", 23, 4.6], ["Media and Entertainment", 6, 1.2],
      ] },
      { title: "Company size", rows: [
        ["1,000 to 4,999 employees", 285, 57.0],
        ["5,000 to 14,999 employees", 105, 21.0], ["15,000 or more employees", 110, 22.0],
      ] },
      { title: "Job level", rows: [
        ["People Manager (50+ reports)", 100, 20.0],
        ["People Manager (1-49 reports)", 150, 30.0], ["Individual Contributor", 250, 50.0],
      ] },
      { title: "Department / function", rows: [
        ["Information Technology / Digital Transformation", 167, 33.4], ["Operations", 97, 19.4],
        ["Customer Service", 62, 12.4], ["Finance", 50, 10.0], ["Sales & Marketing", 39, 7.8],
        ["Human Resources", 33, 6.6], ["Other", 30, 6.0],
        ["Research & Development / Engineering", 22, 4.4],
      ] },
    ],
  },
  {
    name: "Employee listening interviews",
    sample: "18 organizations • 29 participants • Global",
    countLabel: "Orgs",
    tables: [
      { title: "Region", rows: [
        ["NAMER", 12, 66.7], ["EMEA", 3, 16.7], ["APAC", 3, 16.7],
      ] },
      { title: "Industry", rows: [
        ["Manufacturing", 4, 22.2],
        ["Financial and Professional Services (e.g., accounting, consulting, legal firm)", 4, 22.2],
        ["Consumer Goods", 3, 16.7], ["Transportation, Travel, and Hospitality", 2, 11.1],
        ["Healthcare", 2, 11.1], ["Technology", 2, 11.1], ["Mining and Metals", 1, 5.6],
      ] },
      { title: "Interview source", rows: [
        ["Non-customer practitioners", 10, 55.6], ["Customers, including Microsoft", 6, 33.3],
        ["Partners", 2, 11.1],
      ] },
    ],
  },
] as const;

export const listeningCapabilities = [
  {
    name: "Accessibility",
    criteria: [
      "Making it easy for employees to provide feedback",
      "Reaching a representative range of employee groups",
      "Making listening data easy to access and use",
    ],
    percentages: [1.9, 10.7, 37.9, 46.6, 2.9],
  },
  {
    name: "Action and accountability",
    criteria: [
      "Communicating what changed because of employee feedback",
      "Equipping managers to take timely action on their results",
      "Holding leaders and managers accountable for acting on listening insights",
    ],
    percentages: [5.8, 15.5, 51.5, 27.2, 0],
  },
  {
    name: "Strategic impact",
    criteria: [
      "Influencing senior leadership or business decisions",
      "Connecting listening data to meaningful outcomes",
      "Measuring the impact of actions taken",
    ],
    percentages: [3.9, 18.4, 48.5, 29.1, 0],
  },
  {
    name: "Adaptable",
    criteria: [
      "Supporting continuous listening outside formal survey cycles",
      "Identifying emerging risks and friction points that affect work and employee experience",
      "Driving AI adoption decisions",
    ],
    percentages: [4.9, 28.2, 51.5, 15.5, 0],
  },
] as const;

export const aiListeningPhases = [
  {
    name: "Strategy, planning, & design",
    percentage: 27,
    color: "#5f82f2",
    capabilities: [
      ["Help design survey questions, items, or content", 34],
      ["Support sampling, targeting, or audience selection", 23],
      ["Recommend listening topics based on business priorities or workforce risks", 22],
    ],
  },
  {
    name: "Listening",
    percentage: 30,
    color: "#7eaba7",
    capabilities: [
      ["Help employees draft or refine their feedback responses", 33],
      ["Use a chatbot or AI agent to collect employee feedback through natural, conversational dialogue", 30],
      ["Help manage survey cadence, timing, or over-surveying risk", 27],
    ],
  },
  {
    name: "Analysis",
    percentage: 43,
    color: "#a79bcc",
    capabilities: [
      ["Summarize themes from employee feedback", 55],
      ["Prepare summaries or briefings for leaders ahead of feedback discussions", 45],
      ["Interpret feedback results for managers or leaders", 42],
      ["Enable HR or managers to query listening data using natural language", 32],
    ],
  },
  {
    name: "Action taking",
    percentage: 25,
    color: "#dec98f",
    capabilities: [
      ["Recommend actions managers should take based on feedback", 38],
      ["Coach managers through conversations or action plans with their team", 30],
      ["Take actions on behalf of managers or leaders in response to feedback", 18],
      ["Simulate how employees might respond to a proposed change before it is implemented", 15],
    ],
  },
] as const;

// Q9 counts supplied for the 103-response listening leader sample.
export const listeningPortfolio = ([
  {
    name: "Company-wide engagement survey",
    description: "e.g., annual survey from HR or leadership",
    counts: [1, 5, 71, 26],
  },
  {
    name: "Pulse or ad hoc surveys",
    description: "e.g., from manager or change leader",
    counts: [5, 12, 59, 27],
  },
  {
    name: "Employee-initiated always-on feedback",
    description: "e.g., event-triggered surveys, post-meeting prompts",
    counts: [18, 6, 62, 17],
  },
  {
    name: "Lifecycle or moment survey",
    description: "e.g., onboarding, exit, promotion",
    counts: [3, 5, 66, 29],
  },
  {
    name: "Qualitative channels",
    description: "e.g., focus groups, structured interviews",
    counts: [4, 15, 65, 19],
  },
  {
    name: "Real-time feedback tools",
    description: "e.g., event-triggered surveys, post-meeting prompts",
    counts: [12, 4, 57, 30],
  },
  {
    name: "Passive, ambient or telemetry data",
    description: "e.g., collaboration signals, productivity data",
    counts: [30, 9, 45, 19],
  },
  {
    name: "Agentic AI conversational listening",
    description: "e.g., AI assistants that proactively solicit feedback through conversation",
    counts: [29, 1, 21, 52],
  },
] as const).map((approach) => {
  const total = approach.counts.reduce<number>((sum, count) => sum + count, 0);
  const percentage = (count: number) => Math.round(count / total * 1000) / 10;
  return {
    ...approach,
    percentages: approach.counts.map(percentage),
    use: percentage(total - approach.counts[0]),
    netExpansion: percentage(approach.counts[3] - approach.counts[1]),
  };
});

export const canonicalReportSource = {
  fileKey: "rkrC8mdVsXC1rAITLp04Sq",
  sectionNode: "1582:75690",
  defaultNode: "1584:78960",
  interactionNode: "1584:82404",
  status: "Private preview; editorial and permission notes remain unresolved.",
  capabilityDataSource: "User-supplied interacted-state screenshot for Figma node 1591:2722",
  portfolioDataSource: "User-supplied Q9 listening approach counts and percentages, n = 103",
} as const;

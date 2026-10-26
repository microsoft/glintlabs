export const listeningApproaches = [
  {
    short: "Company-wide engagement survey",
    full: "Company-wide engagement survey (e.g., annual survey from HR or leadership)",
    values: [1, 5, 69, 25],
  },
  {
    short: "Pulse or ad hoc surveys",
    full: "Pulse or ad hoc surveys (e.g., from manager or change leader)",
    values: [5, 12, 57, 26],
  },
  {
    short: "Employee-led / always-on channels",
    full: "Employee-led, or always-on feedback channels that employees can initiate on their own",
    values: [18, 6, 60, 16],
  },
  {
    short: "Lifecycle / moment survey",
    full: "Lifecycle / moment survey (e.g., onboarding, exit, promotion)",
    values: [3, 5, 64, 28],
  },
  {
    short: "Qualitative channels",
    full: "Qualitative channels (e.g., focus groups, structured interviews)",
    values: [4, 15, 63, 18],
  },
  {
    short: "Real-time feedback tools",
    full: "Real-time or near-real-time feedback tools (e.g., event-triggered surveys, post-meeting prompts)",
    values: [12, 4, 55, 29],
  },
  {
    short: "Passive / telemetry data",
    full: "Passive, ambient, or telemetry-based data (e.g., collaboration signals, productivity data)",
    values: [29, 9, 44, 18],
  },
  {
    short: "Agentic AI listening tools",
    full: "Agentic AI conversational listening tools (e.g., AI assistants that proactively solicit feedback through conversation)",
    values: [28, 1, 20, 51],
  },
  {
    short: "AI-assisted feedback analysis",
    full: "AI-assisted analysis of feedback themes and sentiment",
    values: [17, 0, 19, 64],
  },
  {
    short: "Cross-source data synthesis",
    full: "Synthesis across multiple employee data sources (e.g., surveys, open text, HRIS, workforce data)",
    values: [11, 3, 43, 43],
  },
  {
    short: "Predictive experience signals",
    full: "Predictive employee experience signals (e.g., attrition risk, experience forecasting)",
    values: [13, 6, 45, 36],
  },
  {
    short: "Self-service listening insights",
    full: "Employee or leader self-service access to listening data and insights (e.g., dashboards, AI-powered queries, individual results)",
    values: [13, 1, 50, 36],
  },
  {
    short: "Action planning tools",
    full: "Action planning tools for managers or leaders (e.g., templates, recommended actions, or guided planning workflows)",
    values: [7, 5, 52, 36],
  },
  {
    short: "AI-assisted manager coaching",
    full: "AI-assisted manager coaching (e.g., AI tools that guide managers through feedback conversations or action planning)",
    values: [27, 3, 16, 54],
  },
  {
    short: "Insights in leader workflows",
    full: "Listening insights embedded into manager or leader workflows (e.g., 1:1 prep, team health reviews)",
    values: [18, 5, 48, 29],
  },
] as const;

export const listeningTopics = [
  { name: "Manager / leader effectiveness", past: 1, future: 2 },
  { name: "Career growth and development opportunities", past: 2, future: 6 },
  { name: "Recognition and appreciation", past: 3, future: 8 },
  { name: "Company leadership and strategy", past: 4, future: 4 },
  { name: "Communication and transparency from leadership", past: 5, future: 5 },
  { name: "Team collaboration", past: 6, future: 12 },
  { name: "Mental health and wellbeing", past: 7, future: 9 },
  { name: "Diversity, equity, and inclusion", past: 8, future: 16 },
  { name: "Skills, capabilities, and readiness for the future of work", past: 9, future: 7 },
  { name: "Compensation and benefits", past: 10, future: 11 },
  { name: "Processes, workflows, and operational friction", past: 11, future: 13 },
  { name: "Change and organizational transformation", past: 12, future: 3 },
  { name: "Workload and burnout", past: 13, future: 10 },
  { name: "AI and technology tools adoption and impact", past: 14, future: 1 },
  { name: "Psychological safety and speaking up", past: 15, future: 15 },
  { name: "Job security and stability", past: 16, future: 17 },
  { name: "Productivity", past: 17, future: 14 },
] as const;

export const responseCategories = [
  { label: "Not using", color: "#c4e7ff" },
  { label: "Scaling back", color: "#7fbce7" },
  { label: "Maintaining", color: "#38cce8" },
  { label: "Expanding", color: "#9299f7" },
] as const;

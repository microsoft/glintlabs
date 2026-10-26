export type VisualStatus = 'draft' | 'review' | 'approved' | 'deprecated'

export type VisualCollectionId = 'glint-labs-core' | 'annual-report-2026'

export type VisualCollection = {
  id: VisualCollectionId
  name: string
  description: string
}

export type VisualCapability =
  | 'interactive'
  | 'keyboard'
  | 'responsive'
  | 'reduced-motion'
  | 'static-export'
  | 'table-fallback'

export type VisualDataField = {
  name: string
  type: 'string' | 'number' | 'color'
  required: boolean
  description: string
  constraints?: string
}

export type VisualDefinition = {
  id: string
  name: string
  collection: VisualCollectionId
  version: number
  status: VisualStatus
  description: string
  useWhen: readonly string[]
  avoidWhen: readonly string[]
  dataContract: {
    shape: string
    minimumItems?: number
    maximumItems?: number
    fields: readonly VisualDataField[]
  }
  capabilities: readonly VisualCapability[]
  figma: {
    status: 'needs-component' | 'linked'
    fileKey: string
    nodeId?: string
    url?: string
  }
  publishingStudio: {
    adapterId: string
    compatibility: 'planned' | 'available'
    sourceShape: string
    manifestBlockType?: string
  }
}

export const visualCollections = [
  {
    id: 'glint-labs-core',
    name: 'Glint Labs Core',
    description:
      'Site-wide interface components shared across Glint Labs experiences.',
  },
  {
    id: 'annual-report-2026',
    name: '2026 Annual Report',
    description:
      'Canonical editorial and data-storytelling components for the 2026 report.',
  },
] as const satisfies readonly VisualCollection[]

export const glintLabsNavigationDefinition: VisualDefinition = {
  id: 'glint-labs-navigation',
  name: 'Glint Labs navigation',
  collection: 'glint-labs-core',
  version: 2,
  status: 'review',
  description:
    'Provides the primary site-wide navigation for Glint Labs experiences.',
  useWhen: [
    'A Glint Labs page needs the canonical brand and primary section navigation.',
    'The navigation appears over a light or image-backed surface.',
  ],
  avoidWhen: [
    'The page belongs to a publication with its own navigation system.',
    'The available width cannot support horizontal navigation without scrolling.',
  ],
  dataContract: {
    shape: 'glint-labs-navigation',
    fields: [
      {
        name: 'brand',
        type: 'string',
        required: true,
        description: 'Brand link label and destination.',
      },
      {
        name: 'items',
        type: 'string',
        required: true,
        description: 'Ordered primary navigation links.',
      },
    ],
  },
  capabilities: ['interactive', 'keyboard', 'responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1470:16708',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1470-16708&m=dev',
  },
  publishingStudio: {
    adapterId: 'glint-labs-navigation-v1',
    compatibility: 'planned',
    sourceShape: 'brand link and ordered navigation links',
  },
}

export const annualReportNavigationDefinition: VisualDefinition = {
  id: 'annual-report-navigation',
  name: 'Annual Report navigation',
  collection: 'annual-report-2026',
  version: 2,
  status: 'review',
  description:
    'Applies the approved directional glass treatment to the Glint Labs navigation.',
  useWhen: [
    'The Glint Labs navigation appears over the 2026 Annual Report hero.',
    'The navigation needs opaque controls over a background-adaptive glass rail.',
  ],
  avoidWhen: [
    'The navigation appears on a light Glint Labs page outside the Annual Report.',
    'The available width cannot support horizontal navigation without scrolling.',
  ],
  dataContract: glintLabsNavigationDefinition.dataContract,
  capabilities: ['interactive', 'keyboard', 'responsive', 'static-export'],
  figma: glintLabsNavigationDefinition.figma,
  publishingStudio: {
    adapterId: 'annual-report-navigation-v1',
    compatibility: 'available',
    sourceShape: 'brand link and ordered navigation links',
  },
}

export const glintResearchCardDefinition: VisualDefinition = {
  id: 'glint-research-card',
  name: 'Research card',
  collection: 'glint-labs-core',
  version: 1,
  status: 'review',
  description: 'Presents a featured study with evidence tags and a clear action.',
  useWhen: ['A study needs prominent placement in a research collection.'],
  avoidWhen: ['The content is a tool, prompt, or short trending link.'],
  dataContract: {
    shape: 'glint-research-card',
    fields: [
      { name: 'title', type: 'string', required: true, description: 'Study title.' },
      { name: 'description', type: 'string', required: true, description: 'Study summary.' },
      { name: 'visualSrc', type: 'string', required: true, description: 'Card visual asset.' },
      { name: 'tags', type: 'string', required: true, description: 'Evidence tags.' },
      { name: 'href', type: 'string', required: true, description: 'Study destination.' },
    ],
  },
  capabilities: ['interactive', 'keyboard', 'responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '395:31698',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=395-31698&m=dev',
  },
  publishingStudio: {
    adapterId: 'glint-research-card-v1',
    compatibility: 'planned',
    sourceShape: 'title, description, image, evidence tags, and destination',
  },
}

export const glintTrendingCardDefinition: VisualDefinition = {
  id: 'glint-trending-card',
  name: 'Trending card',
  collection: 'glint-labs-core',
  version: 1,
  status: 'review',
  description: 'Ranks a frequently read or shared resource.',
  useWhen: ['A compact ranked link needs reading or sharing context.'],
  avoidWhen: ['The resource requires a full description or evidence tags.'],
  dataContract: {
    shape: 'glint-trending-card',
    fields: [
      { name: 'rank', type: 'number', required: true, description: 'Display rank.' },
      { name: 'title', type: 'string', required: true, description: 'Resource title.' },
      { name: 'detail', type: 'string', required: true, description: 'Trend context.' },
      { name: 'href', type: 'string', required: true, description: 'Resource destination.' },
    ],
  },
  capabilities: ['interactive', 'keyboard', 'responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '395:32783',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=395-32783&m=dev',
  },
  publishingStudio: {
    adapterId: 'glint-trending-card-v1',
    compatibility: 'planned',
    sourceShape: 'rank, title, trend detail, and destination',
  },
}

export const glintToolCardDefinition: VisualDefinition = {
  id: 'glint-tool-card',
  name: 'Tool card',
  collection: 'glint-labs-core',
  version: 1,
  status: 'review',
  description: 'Promotes a skill, prompt, or analysis resource.',
  useWhen: ['A practical resource needs an image, type badge, and action.'],
  avoidWhen: ['The item is research content rather than a reusable resource.'],
  dataContract: {
    shape: 'glint-tool-card',
    fields: [
      { name: 'title', type: 'string', required: true, description: 'Tool title.' },
      { name: 'description', type: 'string', required: true, description: 'Tool summary.' },
      { name: 'badge', type: 'string', required: true, description: 'Resource type.' },
      { name: 'imageSrc', type: 'string', required: true, description: 'Card image.' },
      { name: 'href', type: 'string', required: true, description: 'Tool destination.' },
    ],
  },
  capabilities: ['interactive', 'keyboard', 'responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '395:32154',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=395-32154&m=dev',
  },
  publishingStudio: {
    adapterId: 'glint-tool-card-v1',
    compatibility: 'planned',
    sourceShape: 'type, title, description, image, theme, and destination',
  },
}

export const glintResourceLinkRowDefinition: VisualDefinition = {
  id: 'glint-resource-link-row',
  name: 'Resource link row',
  collection: 'glint-labs-core',
  version: 1,
  status: 'review',
  description: 'Links to a resource collection with supporting context.',
  useWhen: ['A resource category needs a concise description and destination.'],
  avoidWhen: ['The destination needs a visual card or ranking treatment.'],
  dataContract: {
    shape: 'glint-resource-link-row',
    fields: [
      { name: 'title', type: 'string', required: true, description: 'Category title.' },
      { name: 'description', type: 'string', required: true, description: 'Category summary.' },
      { name: 'href', type: 'string', required: true, description: 'Category destination.' },
    ],
  },
  capabilities: ['interactive', 'keyboard', 'responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '310:14828',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=310-14828&m=dev',
  },
  publishingStudio: {
    adapterId: 'glint-resource-link-row-v1',
    compatibility: 'planned',
    sourceShape: 'icon, title, description, and destination',
  },
}

export const pullQuoteDefinition: VisualDefinition = {
  id: 'pull-quote',
  name: 'Pull quote',
  collection: 'annual-report-2026',
  version: 1,
  status: 'review',
  description:
    'Emphasizes an approved quotation with optional speaker attribution.',
  useWhen: [
    'A concise quotation adds human voice or expert interpretation.',
    'The exact wording has been approved for publication.',
  ],
  avoidWhen: [
    'The text is a paraphrase rather than a direct quotation.',
    'The quote is too long to scan as an editorial interruption.',
  ],
  dataContract: {
    shape: 'pull-quote',
    fields: [
      {
        name: 'quote',
        type: 'string',
        required: true,
        description: 'Approved quotation without decorative quote marks.',
      },
      {
        name: 'attribution',
        type: 'string',
        required: false,
        description: 'Speaker or source name.',
      },
      {
        name: 'role',
        type: 'string',
        required: false,
        description: 'Speaker role or source context.',
      },
    ],
  },
  capabilities: ['responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1070:3429',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1070-3429&m=dev',
  },
  publishingStudio: {
    adapterId: 'pull-quote-v1',
    compatibility: 'planned',
    sourceShape: 'approved quotation with optional attribution',
    manifestBlockType: 'pull-quote',
  },
}

export const leadStatementDefinition: VisualDefinition = {
  id: 'lead-statement',
  name: 'Lead statement',
  collection: 'annual-report-2026',
  version: 1,
  status: 'review',
  description:
    'Introduces a consequential section-level idea in a compact editorial treatment.',
  useWhen: [
    'One approved statement should frame the argument that follows.',
    'The message needs emphasis without quotation or numeric treatment.',
  ],
  avoidWhen: [
    'The copy is a direct quotation requiring attribution.',
    'The statement contains several independently scannable ideas.',
  ],
  dataContract: {
    shape: 'lead-statement',
    fields: [
      {
        name: 'children',
        type: 'string',
        required: true,
        description: 'Approved editorial statement.',
      },
    ],
  },
  capabilities: ['responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '798:64562',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=798-64562&m=dev',
  },
  publishingStudio: {
    adapterId: 'lead-statement-v1',
    compatibility: 'planned',
    sourceShape: 'one approved section-level statement',
  },
}

export const outcomeMetricCardDefinition: VisualDefinition = {
  id: 'outcome-metric-card',
  name: 'Outcome metric card',
  collection: 'annual-report-2026',
  version: 1,
  status: 'review',
  description:
    'Connects an outcome principle to a verified numerator, denominator, and computed percentage.',
  useWhen: [
    'One metric needs a concise explanation and clear denominator.',
    'The percentage should remain visibly grounded in source counts.',
  ],
  avoidWhen: [
    'Several metrics need direct comparison.',
    'The denominator is unknown or inferred.',
  ],
  dataContract: {
    shape: 'outcome-metric-card',
    fields: [
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Short outcome principle.',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        description: 'Concise explanation of the metric.',
      },
      {
        name: 'numerator',
        type: 'number',
        required: true,
        description: 'Verified count meeting the condition.',
        constraints: 'Nonnegative integer not greater than denominator',
      },
      {
        name: 'denominator',
        type: 'number',
        required: true,
        description: 'Verified total count.',
        constraints: 'Positive integer',
      },
    ],
  },
  capabilities: ['responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1138:19427',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1138-19427&m=dev',
  },
  publishingStudio: {
    adapterId: 'outcome-metric-card-v1',
    compatibility: 'planned',
    sourceShape:
      'one outcome label, explanation, verified numerator, and denominator',
  },
}

export const outcomeFocusCardDefinition: VisualDefinition = {
  id: 'outcome-focus-card',
  name: 'Outcome focus card',
  collection: 'annual-report-2026',
  version: 1,
  status: 'review',
  description:
    'Names one intended talent outcome with a fixed directional illustration.',
  useWhen: [
    'A workflow, framework, or model needs one concise outcome destination.',
    'The outcome can be expressed as a short, scannable phrase.',
  ],
  avoidWhen: [
    'A measured result or percentage should be shown.',
    'The content needs explanatory detail beyond a short outcome phrase.',
  ],
  dataContract: {
    shape: 'outcome-focus-card',
    fields: [
      {
        name: 'illustration',
        type: 'string',
        required: false,
        description:
          'Canonical illustration variant: growth, action, or trust.',
      },
      {
        name: 'label',
        type: 'string',
        required: true,
        description: 'Concise intended talent outcome.',
      },
    ],
  },
  capabilities: ['responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1136:6428',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1136-6428&m=dev',
  },
  publishingStudio: {
    adapterId: 'outcome-focus-card-v1',
    compatibility: 'planned',
    sourceShape: 'one concise intended talent outcome',
  },
}

export const dataInsightCardDefinition: VisualDefinition = {
  id: 'data-insight-card',
  name: 'Data insight card',
  collection: 'annual-report-2026',
  version: 1,
  status: 'review',
  description:
    'Connects an observed signal pattern to a concise interpretation and response.',
  useWhen: [
    'A finding needs an explicit evidence-based interpretation.',
    'The interpretation leads to a concrete organizational response.',
  ],
  avoidWhen: [
    'The evidence does not support a specific interpretation.',
    'A direct quotation or numeric metric is the primary content.',
  ],
  dataContract: {
    shape: 'data-insight-card',
    fields: [
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Short topic or maturity label.',
      },
      {
        name: 'statement',
        type: 'string',
        required: true,
        description: 'Primary observed signal pattern.',
      },
      {
        name: 'interpretation',
        type: 'string',
        required: true,
        description: 'Evidence-based interpretation and response.',
      },
    ],
  },
  capabilities: ['responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1144:20688',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1144-20688&m=dev',
  },
  publishingStudio: {
    adapterId: 'data-insight-card-v1',
    compatibility: 'planned',
    sourceShape:
      'one observed signal pattern with an evidence-based interpretation',
  },
}

export const rightFitGuardrailsDefinition: VisualDefinition = {
  id: 'right-fit-guardrails',
  name: 'Right-fit listening guardrails',
  collection: 'annual-report-2026',
  version: 1,
  status: 'review',
  description:
    'Frames five operating guardrails around one calibrated listening standard.',
  useWhen: [
    'Five complementary standards need to be understood as one system.',
    'A central decision principle connects the surrounding questions.',
  ],
  avoidWhen: [
    'The concepts have a ranked or sequential relationship.',
    'The content requires more than one concise question per guardrail.',
  ],
  dataContract: {
    shape: 'right-fit-guardrails',
    fields: [
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Diagram title.',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        description: 'Concise instruction for reading the diagram.',
      },
      {
        name: 'guardrails',
        type: 'string',
        required: true,
        description:
          'Named trustworthy, intelligent, embedded, responsive, and outcome-driven questions.',
        constraints: 'Exactly five named guardrail entries',
      },
      {
        name: 'center',
        type: 'string',
        required: true,
        description: 'Central right-fit listening standard and constraint.',
      },
      {
        name: 'footer',
        type: 'string',
        required: true,
        description: 'Reassessment guidance.',
      },
    ],
  },
  capabilities: ['responsive', 'static-export'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1146:4385',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1146-4385&m=dev',
  },
  publishingStudio: {
    adapterId: 'right-fit-guardrails-v1',
    compatibility: 'planned',
    sourceShape:
      'five named guardrail questions around one central listening standard',
  },
}

export const skillPriorityStackDefinition: VisualDefinition = {
  id: 'skill-priority-stack',
  name: 'Skill priority stack',
  collection: 'annual-report-2026',
  version: 1,
  status: 'review',
  description:
    'Connects three closely ranked skill priorities to practical knowledge and behaviors.',
  useWhen: [
    'Exactly three complementary capability layers need explanation.',
    'Percentages should remain visible without implying a large ranking gap.',
  ],
  avoidWhen: [
    'The items form a sequential process rather than complementary layers.',
    'More than three priority areas need equal explanatory detail.',
  ],
  dataContract: {
    shape: 'skill-priority-stack',
    minimumItems: 3,
    maximumItems: 3,
    fields: [
      {
        name: 'eyebrow',
        type: 'string',
        required: true,
        description: 'Short uppercase category label.',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Skill-stack title.',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        description: 'Relationship between the three priorities.',
      },
      {
        name: 'layers',
        type: 'string',
        required: true,
        description:
          'Three ordered layers with badge, percentage, skill, summary, and details.',
        constraints: 'Exactly three entries with integer percentages from 0 to 100',
      },
    ],
  },
  capabilities: ['responsive', 'static-export', 'table-fallback'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1146:4897',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1146-4897&m=dev',
  },
  publishingStudio: {
    adapterId: 'skill-priority-stack-v1',
    compatibility: 'planned',
    sourceShape:
      'three ordered skill priorities with percentages and supporting behaviors',
  },
}

export const listeningSpeedGapDefinition: VisualDefinition = {
  id: 'listening-speed-gap',
  name: 'Listening speed gap',
  collection: 'annual-report-2026',
  version: 3,
  status: 'review',
  description:
    'Explores whether listening density is insufficient, right-fit, or overwhelming synthesis capacity.',
  useWhen: [
    'A story needs to help readers reflect on listening density relative to the pace of work.',
    'The consequence of insufficient signal or synthesis overload should be made actionable.',
  ],
  avoidWhen: [
    'A precise maturity score or external benchmark is required.',
    'The available data supports only one fixed listening state.',
  ],
  dataContract: {
    shape: 'listening-speed-gap',
    fields: [
      {
        name: 'fit',
        type: 'string',
        required: false,
        description:
          'Controlled fit: minimum, low, balanced, high, or overload.',
      },
      {
        name: 'defaultFit',
        type: 'string',
        required: false,
        description: 'Initial fit when the component is uncontrolled.',
      },
      {
        name: 'eyebrow',
        type: 'string',
        required: false,
        description: 'Short category label above the visual.',
      },
      {
        name: 'title',
        type: 'string',
        required: false,
        description: 'Primary statement explaining the listening-speed gap.',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'Supporting explanation beneath the title.',
      },
    ],
  },
  capabilities: [
    'interactive',
    'keyboard',
    'responsive',
    'reduced-motion',
    'static-export',
  ],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1300:5116',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1300-5116&m=dev',
  },
  publishingStudio: {
    adapterId: 'listening-speed-gap-v2',
    compatibility: 'available',
    sourceShape:
      'five listening-fit states mapped to signal density, interpretation, and recommended action',
  },
}

export const channelPortfolioDefinition: VisualDefinition = {
  id: 'channel-portfolio',
  name: 'Channel portfolio',
  collection: 'annual-report-2026',
  version: 3,
  status: 'review',
  description:
    'Compares listening-channel adoption while revealing one channel’s purpose and examples in context.',
  useWhen: [
    'A report needs to compare adoption across a small portfolio of listening channels.',
    'Supporting examples should be available without making every row permanently tall.',
  ],
  avoidWhen: [
    'The channels cannot be expressed as comparable percentages.',
    'Every channel’s supporting detail must remain visible simultaneously.',
  ],
  dataContract: {
    shape: 'channel-portfolio',
    minimumItems: 1,
    maximumItems: 6,
    fields: [
      {
        name: 'items',
        type: 'string',
        required: true,
        description:
          'Ordered channels with stable ids, titles, percentages, colors, opaque selected-state colors, descriptions, and examples.',
        constraints: 'Values must be between 0 and 100 and ids must be unique.',
      },
      {
        name: 'selectedId',
        type: 'string',
        required: false,
        description: 'Controlled id of the expanded channel.',
      },
      {
        name: 'defaultSelectedId',
        type: 'string',
        required: false,
        description: 'Initially expanded channel when uncontrolled.',
      },
    ],
  },
  capabilities: [
    'interactive',
    'keyboard',
    'responsive',
    'static-export',
    'table-fallback',
  ],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1327:19497',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1327-19497&m=dev',
  },
  publishingStudio: {
    adapterId: 'channel-portfolio-v3',
    compatibility: 'available',
    sourceShape:
      'ordered channel adoption values with opaque selected states, descriptions, and inline examples',
  },
}

export const listeningMaturityDefinition: VisualDefinition = {
  id: 'listening-maturity',
  name: 'Listening maturity',
  collection: 'annual-report-2026',
  version: 1,
  status: 'review',
  description:
    'Helps readers reflect on four qualitative listening capabilities and receive immediate narrative guidance.',
  useWhen: [
    'A report needs a qualitative reflection rather than a maturity score.',
    'Readers should see how participation, accountability, impact, and adaptability work together.',
  ],
  avoidWhen: [
    'A benchmarked numeric maturity score is required.',
    'The assessment cannot provide one clear statement for each capability.',
  ],
  dataContract: {
    shape: 'listening-maturity',
    minimumItems: 4,
    maximumItems: 4,
    fields: [
      {
        name: 'capabilities',
        type: 'string',
        required: true,
        description:
          'Exactly four capabilities with stable ids, titles, questions, colors, three qualitative options, and next-step guidance.',
        constraints:
          'Each capability requires one constrained, uneven, and embedded option.',
      },
      {
        name: 'selections',
        type: 'string',
        required: false,
        description: 'Controlled qualitative selection for each capability.',
      },
      {
        name: 'defaultSelections',
        type: 'string',
        required: false,
        description: 'Initial qualitative selections when uncontrolled.',
      },
      {
        name: 'resultPanelTop',
        type: 'string',
        required: false,
        description:
          'Sticky result-panel offset supplied by the host layout, such as the navigation height plus 16 pixels.',
      },
    ],
  },
  capabilities: [
    'interactive',
    'keyboard',
    'responsive',
    'static-export',
    'table-fallback',
  ],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1345:24761',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1345-24761&m=dev',
  },
  publishingStudio: {
    adapterId: 'listening-maturity-v1',
    compatibility: 'available',
    sourceShape:
      'four qualitative capability prompts with constrained, uneven, and embedded statements',
    manifestBlockType: 'listening-maturity-scorecard',
  },
}

export const employeeAiReadinessDefinition: VisualDefinition = {
  id: 'employee-ai-readiness',
  name: 'Employee AI readiness',
  collection: 'annual-report-2026',
  version: 1,
  status: 'review',
  description:
    'Compares employee trust, organizational openness, and self-directed AI use in the feedback process.',
  useWhen: [
    'A report needs to show three related employee AI-readiness indicators.',
    'The relationship between formal openness and behavior outside safeguards is important.',
  ],
  avoidWhen: [
    'The measures do not share a common 0–100 percentage scale.',
    'More than three measures need equal visual prominence.',
  ],
  dataContract: {
    shape: 'employee-ai-readiness',
    minimumItems: 3,
    maximumItems: 3,
    fields: [
      {
        name: 'metrics',
        type: 'string',
        required: true,
        description:
          'Exactly three metrics with stable ids, labels, display values, descriptions, percentages, detail labels, and color tokens.',
        constraints: 'Percentages must be between 0 and 100 and ids must be unique.',
      },
      {
        name: 'title',
        type: 'string',
        required: false,
        description: 'Centered visual headline.',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'One-line framing statement beneath the headline.',
      },
      {
        name: 'insight',
        type: 'string',
        required: false,
        description: 'Closing implication shown with the lightbulb icon.',
      },
    ],
  },
  capabilities: ['responsive', 'static-export', 'table-fallback'],
  figma: {
    status: 'linked',
    fileKey: 'rkrC8mdVsXC1rAITLp04Sq',
    nodeId: '1352:6534',
    url: 'https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1352-6534&m=dev',
  },
  publishingStudio: {
    adapterId: 'employee-ai-readiness-v1',
    compatibility: 'available',
    sourceShape:
      'three percentage-based employee AI indicators with supporting context and a closing implication',
  },
}

export const visualRegistry = [
  glintLabsNavigationDefinition,
  glintResearchCardDefinition,
  glintTrendingCardDefinition,
  glintToolCardDefinition,
  glintResourceLinkRowDefinition,
  annualReportNavigationDefinition,
  pullQuoteDefinition,
  leadStatementDefinition,
  outcomeMetricCardDefinition,
  outcomeFocusCardDefinition,
  dataInsightCardDefinition,
  rightFitGuardrailsDefinition,
  skillPriorityStackDefinition,
  listeningSpeedGapDefinition,
  channelPortfolioDefinition,
  listeningMaturityDefinition,
  employeeAiReadinessDefinition,
] as const satisfies readonly VisualDefinition[]

export function getVisualDefinition(id: string) {
  return visualRegistry.find((definition) => definition.id === id)
}

export function getVisualsByCollection(collection: VisualCollectionId) {
  return visualRegistry.filter(
    (definition) => definition.collection === collection,
  )
}

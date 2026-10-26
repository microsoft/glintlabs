import { useEffect, useState, type ReactNode } from 'react'
import './App.css'
import {
  ChannelPortfolio,
  DataInsightCard,
  EmployeeAiReadiness,
  GlintLabsNavigation,
  GlintResearchCard,
  GlintResourceLinkRow,
  GlintToolCard,
  GlintTrendingCard,
  LeadStatement,
  ListeningMaturity,
  ListeningSpeedGap,
  OutcomeFocusCard,
  OutcomeMetricCard,
  PullQuote,
  RightFitGuardrails,
  SkillPriorityStack,
  annualReportNavigationDefinition,
  channelPortfolioDefinition,
  dataInsightCardDefinition,
  employeeAiReadinessDefinition,
  glintResearchCardDefinition,
  glintResourceLinkRowDefinition,
  glintToolCardDefinition,
  glintTrendingCardDefinition,
  glintLabsNavigationDefinition,
  leadStatementDefinition,
  listeningMaturityDefinition,
  listeningSpeedGapDefinition,
  outcomeFocusCardDefinition,
  outcomeMetricCardDefinition,
  pullQuoteDefinition,
  rightFitGuardrailsDefinition,
  skillPriorityStackDefinition,
  visualCollections,
  type VisualDefinition,
} from './lib'

type ComponentPanelProps = {
  canvasClassName?: string
  children: ReactNode
  definition: VisualDefinition
  dimensions: string
  id: string
  inlineResponsive?: boolean
  summary: string
}

type PreviewViewport = 'reference' | 'tablet' | 'mobile'

type FixtureResizeMessage = {
  type: 'glint-fixture-resize'
  fixture: string
  height: number
}

const previewViewports = [
  { id: 'reference', label: 'Desktop', width: null },
  { id: 'tablet', label: 'Tablet', width: 640 },
  { id: 'mobile', label: 'Mobile', width: 320 },
] as const satisfies readonly {
  id: PreviewViewport
  label: string
  width: number | null
}[]

function getInitialPreviewViewport(): PreviewViewport {
  const preview = new URLSearchParams(window.location.search).get('preview')

  return preview === 'tablet' || preview === 'mobile' ? preview : 'reference'
}

function isFixtureResizeMessage(value: unknown): value is FixtureResizeMessage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const message = value as Record<string, unknown>

  return (
    message.type === 'glint-fixture-resize' &&
    typeof message.fixture === 'string' &&
    typeof message.height === 'number'
  )
}

function ComponentPanel({
  canvasClassName,
  children,
  definition,
  dimensions,
  id,
  inlineResponsive = false,
  summary,
}: ComponentPanelProps) {
  const [viewport, setViewport] = useState<PreviewViewport>(
    getInitialPreviewViewport,
  )
  const [previewHeight, setPreviewHeight] = useState(192)
  const selectedViewport = previewViewports.find(
    (option) => option.id === viewport,
  )

  useEffect(() => {
    function handleFixtureResize(event: MessageEvent<unknown>) {
      if (
        event.origin !== window.location.origin ||
        !isFixtureResizeMessage(event.data) ||
        event.data.fixture !== id
      ) {
        return
      }

      setPreviewHeight(event.data.height)
    }

    window.addEventListener('message', handleFixtureResize)

    return () => window.removeEventListener('message', handleFixtureResize)
  }, [id])

  return (
    <section className="component-panel" id={id}>
      <header className="component-panel__header">
        <div>
          <p className="component-panel__id">{definition.id}</p>
          <h2>{definition.name}</h2>
          <p>{summary}</p>
        </div>
        <span className="component-status">{definition.status}</span>
      </header>

      <div className="component-preview-toolbar">
        <span>Preview width</span>
        <div className="component-preview-options">
          {previewViewports.map((option) => (
            <button
              aria-pressed={viewport === option.id}
              key={option.id}
              onClick={() => setViewport(option.id)}
              type="button"
            >
              {option.label}
              {option.width ? <small>{option.width}px</small> : null}
            </button>
          ))}
        </div>
      </div>

      <div
        className={
          canvasClassName
            ? `component-canvas ${canvasClassName}`
            : 'component-canvas'
        }
      >
        {selectedViewport?.width ? (
          inlineResponsive ? (
            <div
              className="component-inline-preview"
              style={{ width: selectedViewport.width }}
            >
              {children}
            </div>
          ) : (
            <iframe
              className="component-responsive-preview"
              key={`${id}-${selectedViewport.width}`}
              scrolling="no"
              src={`${window.location.pathname}?fixture=${id}`}
              style={{
                width: selectedViewport.width,
                height: previewHeight,
              }}
              title={`${definition.name} at ${selectedViewport.width} pixels wide`}
            />
          )
        ) : (
          children
        )}
      </div>

      <dl className="component-meta">
        <div>
          <dt>Reference size</dt>
          <dd>{dimensions}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{definition.version}</dd>
        </div>
        <div>
          <dt>Figma</dt>
          <dd>
            {definition.figma.status === 'linked' ? (
              <a
                href={definition.figma.url}
                rel="noreferrer"
                target="_blank"
              >
                Node {definition.figma.nodeId}
              </a>
            ) : (
              'Link needed'
            )}
          </dd>
        </div>
        <div>
          <dt>Studio adapter</dt>
          <dd>{definition.publishingStudio.adapterId}</dd>
        </div>
      </dl>
    </section>
  )
}

function App() {
  const searchParams = new URLSearchParams(window.location.search)
  const fixture = searchParams.get('fixture')
  const collectionId =
    searchParams.get('collection') === 'glint-labs-core'
      ? 'glint-labs-core'
      : 'annual-report-2026'
  const currentCollection = visualCollections.find(
    (collection) => collection.id === collectionId,
  )

  useEffect(() => {
    if (!fixture || window.parent === window) {
      return
    }

    const fixtureElement =
      document.querySelector<HTMLElement>('.visual-fixture')

    if (!fixtureElement) {
      return
    }

    const notifyParent = () => {
      window.parent.postMessage(
        {
          type: 'glint-fixture-resize',
          fixture,
          height: Math.ceil(fixtureElement.getBoundingClientRect().height),
        } satisfies FixtureResizeMessage,
        window.location.origin,
      )
    }

    const resizeObserver = new ResizeObserver(notifyParent)
    resizeObserver.observe(fixtureElement)
    notifyParent()
    void document.fonts.ready.then(notifyParent)

    return () => resizeObserver.disconnect()
  }, [fixture])

  if (fixture === 'pull-quote') {
    return (
      <main className="visual-fixture">
        <PullQuote
          quote="How do we get it to that point where it's not just a standalone... it's a data point just like they would look at their safety metrics or their productivity metrics or whatever their operational metrics are, and their employee experience is right there with it."
          attribution="Mona Kane"
          role="Head of People at Contoso"
        />
      </main>
    )
  }

  if (fixture === 'glint-labs-navigation') {
    return (
      <main className="visual-fixture visual-fixture--core-nav">
        <GlintLabsNavigation
          brand={{ label: 'Glint Labs', href: '#glint-labs' }}
          items={[
            { label: 'Reports', href: '#reports' },
            { label: 'Tools', href: '#tools' },
            { label: 'About', href: '#about' },
          ]}
        />
      </main>
    )
  }

  if (fixture === 'annual-report-navigation') {
    return (
      <main className="visual-fixture visual-fixture--annual-report-nav">
        <GlintLabsNavigation
          brand={{ label: 'Glint Labs', href: '#glint-labs' }}
          items={[
            { label: 'Reports', href: '#reports' },
            { label: 'Tools', href: '#tools' },
            { label: 'About', href: '#about' },
          ]}
          variant="annual-report-2026"
        />
      </main>
    )
  }

  if (fixture === 'listening-speed-gap') {
    return (
      <main className="visual-fixture">
        <ListeningSpeedGap />
      </main>
    )
  }

  if (fixture === 'listening-maturity') {
    return (
      <main className="visual-fixture visual-fixture--listening-maturity">
        <ListeningMaturity />
      </main>
    )
  }

  if (fixture === 'employee-ai-readiness') {
    return (
      <main className="visual-fixture visual-fixture--employee-ai-readiness">
        <EmployeeAiReadiness />
      </main>
    )
  }

  if (fixture === 'channel-portfolio') {
    return (
      <main className="visual-fixture visual-fixture--channel-portfolio">
        <ChannelPortfolio />
      </main>
    )
  }

  if (fixture === 'lead-statement') {
    return (
      <main className="visual-fixture visual-fixture--lead-statement">
        <LeadStatement>
          As organizations redesign how work gets done, listening has a
          meaningful role in shaping what that next experience becomes for
          employees.
        </LeadStatement>
      </main>
    )
  }

  if (fixture === 'outcome-metric-card') {
    return (
      <main className="visual-fixture visual-fixture--outcome-metric">
        <OutcomeMetricCard
          title="Connected to action"
          description="Feedback should lead to improvement, decisions, or visible change."
          numerator={49}
          denominator={103}
        />
      </main>
    )
  }

  if (fixture === 'outcome-focus-card') {
    return (
      <main className="visual-fixture visual-fixture--outcome-focus">
        <OutcomeFocusCard
          illustration="growth"
          label="Improving engagement, retention, wellbeing, or other talent outcomes"
        />
      </main>
    )
  }

  if (fixture === 'data-insight-card') {
    return (
      <main className="visual-fixture visual-fixture--data-insight">
        <DataInsightCard
          title="Listening maturity"
          statement="During an AI rollout, collaboration declines, workload concerns rise, and support questions increase."
          interpretation="Together with employee feedback and rollout context, these signals suggest unclear workflows—not necessarily resistance to AI. That interpretation directs a specific response: clarify expectations, redesign workflows, and evaluate whether collaboration improves."
        />
      </main>
    )
  }

  if (fixture === 'right-fit-guardrails') {
    return (
      <main className="visual-fixture visual-fixture--guardrails">
        <RightFitGuardrails
          title="Five guardrails for right-fit listening"
          description="Use these standards to judge whether the system remains calibrated to the decision, employees, and response capacity."
          trustworthy={{
            label: 'Trustworthy',
            question:
              'Do employees understand what is collected, why, and how they are protected?',
          }}
          intelligent={{
            label: 'Intelligent',
            question:
              'Does the evidence provide valid, contextual, decision-relevant understanding?',
          }}
          embedded={{
            label: 'Embedded',
            question:
              'Is listening connected to the moments and workflows where decisions happen?',
          }}
          responsive={{
            label: 'Responsive',
            question:
              'Does the signal reach someone able and accountable to respond?',
          }}
          outcomeDriven={{
            label: 'Outcome-driven',
            question:
              'Can the organization determine whether the response made a difference?',
          }}
          centerLabel="RIGHT-FIT LISTENING"
          centerStatement="Enough credible understanding to support a consequential choice."
          centerConstraint="Without exceeding trust, legitimate purpose, or response capacity."
          footer="Reassess as topics, conditions, capacity, and employee expectations change"
        />
      </main>
    )
  }

  if (fixture === 'skill-priority-stack') {
    return (
      <main className="visual-fixture visual-fixture--skill-stack">
        <SkillPriorityStack
          eyebrow="Priority capabilities"
          title="Employee listening skill stack for the AI era"
          description="The priorities are closely ranked. Strong practice requires all three layers working together."
          layers={[
            {
              badge: '01 FOUNDATION',
              percentage: 41,
              skill: 'AI and automation literacy',
              summary: 'Understand where AI fits—and how it can fail',
              details: [
                'Recognize capabilities and limitations',
                'Identify bias, privacy, representation, and data-quality risks',
                'Separate useful applications from automation for its own sake',
                'Test what evidence supports an output',
              ],
            },
            {
              badge: '02 DECISION BRIDGE',
              percentage: 39,
              skill: 'Consultative and advisory skills',
              summary: 'Connect evidence to decisions and value',
              details: [
                'Define the organizational question',
                'Translate findings into choices and tradeoffs',
                'Identify accountable decision-makers',
                'Challenge uses that are possible but not appropriate',
              ],
            },
            {
              badge: '03 ADVANCED PRACTICE',
              percentage: 38,
              skill: 'Advanced AI skills',
              summary: 'Design and evaluate sophisticated applications',
              details: [
                'Orchestrate workflows, agents, and data sources',
                'Build evaluation criteria and test cases',
                'Monitor performance across populations and use cases',
                'Define guardrails, escalation points, and stop conditions',
              ],
            },
          ]}
        />
      </main>
    )
  }

  return (
    <div
      className={`catalog-shell catalog-shell--${
        collectionId === 'glint-labs-core' ? 'light' : 'dark'
      }`}
    >
      <a className="skip-link" href="#component-content">
        Skip to components
      </a>

      <header className="catalog-topbar">
        <div>
          <strong>Glint Labs</strong>
          <span>Component library</span>
        </div>
        <code translate="no">@glint-labs/data-visuals</code>
      </header>

      <div className="catalog-layout">
        <aside className="component-index">
          <p>Collections</p>
          <nav aria-label="Component collections">
            {visualCollections.map((collection) => (
              <a
                aria-current={
                  collection.id === collectionId ? 'page' : undefined
                }
                href={`?collection=${collection.id}`}
                key={collection.id}
              >
                <span aria-hidden="true">•</span>
                {collection.name}
              </a>
            ))}
          </nav>

          {collectionId === 'annual-report-2026' ? (
            <>
              <p className="component-index__section">Components</p>
              <nav aria-label="Component index">
                <a href="#annual-report-navigation">
                  <span>01</span>
                  Annual Report navigation
                </a>
                <a href="#pull-quote">
                  <span>02</span>
                  Pull quote
                </a>
                <a href="#lead-statement">
                  <span>03</span>
                  Lead statement
                </a>
                <a href="#outcome-metric-card">
                  <span>04</span>
                  Outcome metric card
                </a>
                <a href="#outcome-focus-card">
                  <span>05</span>
                  Outcome focus card
                </a>
                <a href="#data-insight-card">
                  <span>06</span>
                  Data insight card
                </a>
                <a href="#right-fit-guardrails">
                  <span>07</span>
                  Right-fit guardrails
                </a>
                <a href="#skill-priority-stack">
                  <span>08</span>
                  Skill priority stack
                </a>
                <a href="#listening-speed-gap">
                  <span>09</span>
                  Listening speed gap
                </a>
                <a href="#channel-portfolio">
                  <span>10</span>
                  Channel portfolio
                </a>
                <a href="#listening-maturity">
                  <span>11</span>
                  Listening maturity
                </a>
                <a href="#employee-ai-readiness">
                  <span>12</span>
                  Employee AI readiness
                </a>
              </nav>
            </>
          ) : (
            <>
              <p className="component-index__section">Components</p>
              <nav aria-label="Component index">
                <a href="#glint-labs-navigation">
                  <span>01</span>
                  Glint Labs navigation
                </a>
                <a href="#glint-research-card">
                  <span>02</span>
                  Research card
                </a>
                <a href="#glint-trending-card">
                  <span>03</span>
                  Trending card
                </a>
                <a href="#glint-tool-card">
                  <span>04</span>
                  Tool card
                </a>
                <a href="#glint-resource-link-row">
                  <span>05</span>
                  Resource link row
                </a>
              </nav>
            </>
          )}
        </aside>

        <main className="component-content" id="component-content">
          <header className="content-header">
            <p className="content-header__eyebrow">Collection</p>
            <h1>{currentCollection?.name}</h1>
            <p>{currentCollection?.description}</p>
            <p>
              Use each component’s viewport controls to test its desktop,
              tablet, and mobile layouts.
            </p>
          </header>

          {collectionId === 'glint-labs-core' ? (
            <>
              <ComponentPanel
                definition={glintLabsNavigationDefinition}
                dimensions="1140 × 52"
                id="glint-labs-navigation"
                inlineResponsive
                summary="Primary Glint Labs site navigation."
              >
                <GlintLabsNavigation
                  brand={{ label: 'Glint Labs', href: '#glint-labs' }}
                  items={[
                    { label: 'Reports', href: '#reports' },
                    { label: 'Tools', href: '#tools' },
                    { label: 'About', href: '#about' },
                  ]}
                />
              </ComponentPanel>

              <ComponentPanel
                definition={glintResearchCardDefinition}
                dimensions="364 × 518"
                id="glint-research-card"
                inlineResponsive
                summary="Featured research with evidence tags and a primary action."
              >
                <GlintResearchCard
                  description="See how role-based practice, manager support, and clear guardrails turn AI interest into everyday value."
                  href="#research"
                  tags={[
                    {
                      iconSrc: '/figma/homepage/featured-topic.svg',
                      label: 'AI transformation',
                    },
                    {
                      iconSrc: '/figma/homepage/featured-people.svg',
                      label: '9,600 employees',
                    },
                    {
                      iconSrc: '/figma/homepage/featured-globe.svg',
                      label: '14 countries',
                    },
                  ]}
                  title="From Experimentation to Everyday Impact"
                  visualSrc="/figma/homepage/featured-data.svg"
                />
              </ComponentPanel>

              <ComponentPanel
                definition={glintTrendingCardDefinition}
                dimensions="267 × 174"
                id="glint-trending-card"
                inlineResponsive
                summary="Compact ranked link with sharing or readership context."
              >
                <GlintTrendingCard
                  detail="Shared 275 times"
                  detailIcon={<span aria-hidden="true">↗</span>}
                  href="#trending"
                  rank={1}
                  title="Building confidence during AI transformation"
                />
              </ComponentPanel>

              <ComponentPanel
                definition={glintToolCardDefinition}
                dimensions="364 × 576"
                id="glint-tool-card"
                inlineResponsive
                summary="Prominent skill, prompt, or analysis resource."
              >
                <GlintToolCard
                  actionLabel="View skill"
                  badge="Skill"
                  badgeIcon={<span aria-hidden="true">◇</span>}
                  description="Turn employee survey data into checked findings and a clear reporting story."
                  href="#skill"
                  imageSrc="/figma/homepage/tool-survey.png"
                  theme="green"
                  title="Survey Analysis"
                />
              </ComponentPanel>

              <ComponentPanel
                definition={glintResourceLinkRowDefinition}
                dimensions="1140 × 64"
                id="glint-resource-link-row"
                inlineResponsive
                summary="Resource category link with supporting context."
              >
                <GlintResourceLinkRow
                  description="Guided methods for common People Science and employee-experience tasks."
                  href="#skills"
                  icon={<span>◇</span>}
                  title="Skills"
                />
              </ComponentPanel>
            </>
          ) : (
            <>
              <ComponentPanel
                canvasClassName="component-canvas--annual-report-nav"
                definition={annualReportNavigationDefinition}
                dimensions="1140 × 52"
                id="annual-report-navigation"
                inlineResponsive
                summary="Approved flat glass navigation with directional upper-left reflection."
              >
                <GlintLabsNavigation
                  brand={{ label: 'Glint Labs', href: '#glint-labs' }}
                  items={[
                    { label: 'Reports', href: '#reports' },
                    { label: 'Tools', href: '#tools' },
                    { label: 'About', href: '#about' },
                  ]}
                  variant="annual-report-2026"
                />
              </ComponentPanel>

              <ComponentPanel
                definition={pullQuoteDefinition}
                dimensions="655 × 192"
                id="pull-quote"
                summary="Approved quotation with attribution."
              >
                <PullQuote
                  quote="How do we get it to that point where it's not just a standalone... it's a data point just like they would look at their safety metrics or their productivity metrics or whatever their operational metrics are, and their employee experience is right there with it."
                  attribution="Mona Kane"
                  role="Head of People at Contoso"
                />
              </ComponentPanel>

              <ComponentPanel
                definition={leadStatementDefinition}
                dimensions="655 × 102"
                id="lead-statement"
                summary="Section-level framing statement."
              >
                <LeadStatement>
                  As organizations redesign how work gets done, listening has a
                  meaningful role in shaping what that next experience becomes
                  for employees.
                </LeadStatement>
              </ComponentPanel>

              <ComponentPanel
                definition={outcomeMetricCardDefinition}
                dimensions="364 × 232"
                id="outcome-metric-card"
                summary="Outcome principle with verified counts."
              >
                <OutcomeMetricCard
                  title="Connected to action"
                  description="Feedback should lead to improvement, decisions, or visible change."
                  numerator={49}
                  denominator={103}
                />
              </ComponentPanel>

              <ComponentPanel
                definition={outcomeFocusCardDefinition}
                dimensions="236 × 252"
                id="outcome-focus-card"
                summary="Concise intended talent outcome."
              >
                <OutcomeFocusCard
                  illustration="growth"
                  label="Improving engagement, retention, wellbeing, or other talent outcomes"
                />
              </ComponentPanel>

              <ComponentPanel
                definition={dataInsightCardDefinition}
                dimensions="752 × 390"
                id="data-insight-card"
                summary="Observed signals with evidence-based interpretation."
              >
                <DataInsightCard
                  title="Listening maturity"
                  statement="During an AI rollout, collaboration declines, workload concerns rise, and support questions increase."
                  interpretation="Together with employee feedback and rollout context, these signals suggest unclear workflows—not necessarily resistance to AI. That interpretation directs a specific response: clarify expectations, redesign workflows, and evaluate whether collaboration improves."
                />
              </ComponentPanel>

              <ComponentPanel
                definition={rightFitGuardrailsDefinition}
                dimensions="752 × 775"
                id="right-fit-guardrails"
                summary="Five operating standards around one calibrated listening principle."
              >
                <RightFitGuardrails
                  title="Five guardrails for right-fit listening"
                  description="Use these standards to judge whether the system remains calibrated to the decision, employees, and response capacity."
                  trustworthy={{
                    label: 'Trustworthy',
                    question:
                      'Do employees understand what is collected, why, and how they are protected?',
                  }}
                  intelligent={{
                    label: 'Intelligent',
                    question:
                      'Does the evidence provide valid, contextual, decision-relevant understanding?',
                  }}
                  embedded={{
                    label: 'Embedded',
                    question:
                      'Is listening connected to the moments and workflows where decisions happen?',
                  }}
                  responsive={{
                    label: 'Responsive',
                    question:
                      'Does the signal reach someone able and accountable to respond?',
                  }}
                  outcomeDriven={{
                    label: 'Outcome-driven',
                    question:
                      'Can the organization determine whether the response made a difference?',
                  }}
                  centerLabel="RIGHT-FIT LISTENING"
                  centerStatement="Enough credible understanding to support a consequential choice."
                  centerConstraint="Without exceeding trust, legitimate purpose, or response capacity."
                  footer="Reassess as topics, conditions, capacity, and employee expectations change"
                />
              </ComponentPanel>

              <ComponentPanel
                definition={skillPriorityStackDefinition}
                dimensions="752 × 757"
                id="skill-priority-stack"
                summary="Three closely ranked capability priorities with practical behaviors."
              >
                <SkillPriorityStack
                  eyebrow="Priority capabilities"
                  title="Employee listening skill stack for the AI era"
                  description="The priorities are closely ranked. Strong practice requires all three layers working together."
                  layers={[
                    {
                      badge: '01 FOUNDATION',
                      percentage: 41,
                      skill: 'AI and automation literacy',
                      summary: 'Understand where AI fits—and how it can fail',
                      details: [
                        'Recognize capabilities and limitations',
                        'Identify bias, privacy, representation, and data-quality risks',
                        'Separate useful applications from automation for its own sake',
                        'Test what evidence supports an output',
                      ],
                    },
                    {
                      badge: '02 DECISION BRIDGE',
                      percentage: 39,
                      skill: 'Consultative and advisory skills',
                      summary: 'Connect evidence to decisions and value',
                      details: [
                        'Define the organizational question',
                        'Translate findings into choices and tradeoffs',
                        'Identify accountable decision-makers',
                        'Challenge uses that are possible but not appropriate',
                      ],
                    },
                    {
                      badge: '03 ADVANCED PRACTICE',
                      percentage: 38,
                      skill: 'Advanced AI skills',
                      summary:
                        'Design and evaluate sophisticated applications',
                      details: [
                        'Orchestrate workflows, agents, and data sources',
                        'Build evaluation criteria and test cases',
                        'Monitor performance across populations and use cases',
                        'Define guardrails, escalation points, and stop conditions',
                      ],
                    },
                  ]}
                />
              </ComponentPanel>

              <ComponentPanel
                definition={listeningSpeedGapDefinition}
                dimensions="750 × 752"
                id="listening-speed-gap"
                summary="Interactive right-fit reflection spanning insufficient signal through synthesis overload."
              >
                <ListeningSpeedGap />
              </ComponentPanel>

              <ComponentPanel
                definition={channelPortfolioDefinition}
                dimensions="750 × 770"
                id="channel-portfolio"
                summary="Interactive listening-channel adoption comparison with in-row details."
              >
                <ChannelPortfolio />
              </ComponentPanel>

              <ComponentPanel
                definition={listeningMaturityDefinition}
                dimensions="748 × content"
                id="listening-maturity"
                summary="Qualitative listening-system reflection with immediate narrative guidance."
              >
                <ListeningMaturity />
              </ComponentPanel>

              <ComponentPanel
                definition={employeeAiReadinessDefinition}
                dimensions="752 × 446"
                id="employee-ai-readiness"
                summary="Three-card comparison of trust, openness, and self-directed AI use in employee feedback."
              >
                <EmployeeAiReadiness />
              </ComponentPanel>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataInsightCard } from './data-cards'
import { LeadStatement } from './lead-statement'
import { GlintLabsNavigation } from './glint-labs-navigation'
import {
  GlintResearchCard,
  GlintResourceLinkRow,
  GlintToolCard,
  GlintTrendingCard,
} from './homepage-components'
import { OutcomeFocusCard } from './outcome-focus-card'
import { OutcomeMetricCard } from './outcome-metric-card'
import { PullQuote } from './pull-quote'
import { RightFitGuardrails } from './right-fit-guardrails'
import { SkillPriorityStack } from './skill-priority-stack'

describe('GlintLabsNavigation', () => {
  it('renders the canonical brand and primary destinations', () => {
    render(
      <GlintLabsNavigation
        brand={{ label: 'Glint Labs', href: '/labs' }}
        items={[
          { label: 'Reports', href: '/reports' },
          { label: 'Tools', href: '/tools' },
          { label: 'About', href: '/about' },
        ]}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Glint Labs' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Glint Labs' })).toHaveAttribute(
      'href',
      '/labs',
    )
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute(
      'href',
      '/reports',
    )
  })

  describe('Glint Labs homepage components', () => {
    it('renders native links for research, trending, tools, and resource rows', () => {
      render(
        <>
          <GlintResearchCard
            description="Evidence-based study."
            href="/research"
            tags={[{ iconSrc: "/tag.svg", label: "AI transformation" }]}
            title="Research"
            visualSrc="/research.svg"
          />
          <GlintTrendingCard
            detail="Shared 10 times"
            href="/trending"
            rank={1}
            title="Trending"
          />
          <GlintToolCard
            actionLabel="View skill"
            badge="Skill"
            description="Reusable method."
            href="/skill"
            imageSrc="/skill.png"
            theme="green"
            title="Skill"
          />
          <GlintResourceLinkRow
            description="Browse resources."
            href="/resources"
            icon={<span>R</span>}
            title="Resources"
          />
        </>,
      )

      expect(screen.getByRole('link', { name: /research/i })).toHaveAttribute(
        'href',
        '/research',
      )
      expect(screen.getByRole('link', { name: /trending/i })).toHaveAttribute(
        'href',
        '/trending',
      )
      expect(screen.getByRole('link', { name: /view skill/i })).toHaveAttribute(
        'href',
        '/skill',
      )
      expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute(
        'href',
        '/resources',
      )
    })
  })

  it('exposes the Annual Report glass treatment as an explicit variant', () => {
    render(
      <GlintLabsNavigation
        brand={{ label: 'Glint Labs', href: '/labs' }}
        items={[]}
        variant="annual-report-2026"
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Glint Labs' })).toHaveClass(
      'glint-core-nav--annual-report-2026',
    )
  })
})

describe('PullQuote', () => {
  it('renders the quote and optional attribution semantically', () => {
    render(
      <PullQuote
        quote="Deep people science expertise changes how we approach evaluations."
        attribution="Liz Pierce"
        role="People Science"
        annotation="Needs updating"
      />,
    )

    expect(screen.getByRole('blockquote')).toHaveTextContent(
      /deep people science expertise/i,
    )
    expect(screen.getByText('Liz Pierce')).toBeInTheDocument()
    expect(screen.getByText('People Science')).toBeInTheDocument()
    expect(screen.getByText('Needs updating')).toHaveClass(
      'glint-pull-quote__annotation',
    )
  })
})

describe('LeadStatement', () => {
  it('exposes the complete statement as complementary report content', () => {
    render(
      <LeadStatement>
        As organizations redesign how work gets done, listening shapes the next
        employee experience.
      </LeadStatement>,
    )

    expect(screen.getByRole('complementary')).toHaveTextContent(
      /listening shapes the next employee experience/i,
    )
  })
})

describe('OutcomeMetricCard', () => {
  it('announces the metric as a relationship and computed percentage', () => {
    render(
      <OutcomeMetricCard
        title="Connected to action"
        description="Feedback should lead to improvement."
        numerator={49}
        denominator={103}
      />,
    )

    expect(
      screen.getByRole('article', { name: 'Connected to action' }),
    ).toHaveAccessibleDescription('Feedback should lead to improvement.')
    expect(screen.getByLabelText('49 of 103, 48%')).toBeInTheDocument()
  })

  it('rejects a numerator greater than its denominator', () => {
    expect(() =>
      render(
        <OutcomeMetricCard
          title="Invalid"
          description="Invalid metric"
          numerator={4}
          denominator={3}
        />,
      ),
    ).toThrow(/cannot be greater/i)
  })
})

describe('OutcomeFocusCard', () => {
  it('uses the visible outcome label as the card name', () => {
    render(
      <OutcomeFocusCard label="Improving engagement, retention, wellbeing, or other talent outcomes" />,
    )

    expect(
      screen.getByRole('article', {
        name: /improving engagement, retention, wellbeing/i,
      }),
    ).toBeInTheDocument()
  })
})

describe('DataInsightCard', () => {
  it('associates an observed signal with its interpretation', () => {
    render(
      <DataInsightCard
        title="Listening maturity"
        statement="Collaboration declines while support questions increase."
        interpretation="These signals suggest unclear workflows."
      />,
    )

    expect(
      screen.getByRole('article', { name: 'Listening maturity' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('These signals suggest unclear workflows.'),
    ).toBeInTheDocument()
  })
})

describe('RightFitGuardrails', () => {
  it('exposes the central standard and all five guardrail questions', () => {
    render(
      <RightFitGuardrails
        title="Five guardrails"
        description="Use these standards."
        trustworthy={{
          label: 'Trustworthy',
          question: 'Do employees understand what is collected?',
        }}
        intelligent={{
          label: 'Intelligent',
          question: 'Does the evidence provide valid understanding?',
        }}
        embedded={{
          label: 'Embedded',
          question: 'Is listening connected to decisions?',
        }}
        responsive={{
          label: 'Responsive',
          question: 'Does the signal reach someone able to respond?',
        }}
        outcomeDriven={{
          label: 'Outcome-driven',
          question: 'Did the response make a difference?',
        }}
        centerLabel="RIGHT-FIT LISTENING"
        centerStatement="Enough credible understanding."
        centerConstraint="Without exceeding trust."
        footer="Reassess as conditions change."
      />,
    )

    expect(
      screen.getByRole('article', { name: 'Five guardrails' }),
    ).toHaveAccessibleDescription('Use these standards.')
    expect(screen.getByText('Trustworthy')).toBeInTheDocument()
    expect(screen.getByText('Intelligent')).toBeInTheDocument()
    expect(screen.getByText('Embedded')).toBeInTheDocument()
    expect(screen.getByText('Responsive')).toBeInTheDocument()
    expect(screen.getByText('Outcome-driven')).toBeInTheDocument()
  })
})

describe('SkillPriorityStack', () => {
  const layers = [
    {
      badge: '01 FOUNDATION',
      percentage: 41,
      skill: 'AI and automation literacy',
      summary: 'Understand where AI fits.',
      details: ['Recognize capabilities and limitations'],
    },
    {
      badge: '02 DECISION BRIDGE',
      percentage: 39,
      skill: 'Consultative and advisory skills',
      summary: 'Connect evidence to decisions.',
      details: ['Define the organizational question'],
    },
    {
      badge: '03 ADVANCED PRACTICE',
      percentage: 38,
      skill: 'Advanced AI skills',
      summary: 'Design sophisticated applications.',
      details: ['Build evaluation criteria'],
    },
  ]

  it('renders the three priority layers as structured content', () => {
    render(
      <SkillPriorityStack
        eyebrow="Priority capabilities"
        title="Employee listening skill stack"
        description="Strong practice requires all three layers."
        layers={layers}
      />,
    )

    expect(
      screen.getByRole('article', {
        name: 'Employee listening skill stack',
      }),
    ).toHaveAccessibleDescription(
      'Strong practice requires all three layers.',
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(
      screen.getByRole('heading', {
        name: '39% Consultative and advisory skills',
      }),
    ).toBeInTheDocument()
  })

  it('requires exactly three layers', () => {
    expect(() =>
      render(
        <SkillPriorityStack
          eyebrow="Priority capabilities"
          title="Invalid"
          description="Invalid"
          layers={layers.slice(0, 2)}
        />,
      ),
    ).toThrow(/exactly three/i)
  })
})

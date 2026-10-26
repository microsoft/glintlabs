import { useId, useState } from 'react'
import type { CSSProperties } from 'react'

export type ChannelPortfolioItem = {
  id: string
  title: string
  value: number
  color: string
  selectedBackground?: string
  selectedBorder?: string
  description: string
  examples: readonly string[]
}

export type ChannelPortfolioProps = {
  items?: readonly ChannelPortfolioItem[]
  selectedId?: string
  defaultSelectedId?: string
  onSelectedIdChange?: (selectedId: string) => void
  eyebrow?: string
  title?: string
  description?: string
}

const defaultItems = [
  {
    id: 'core-surveys',
    title: 'Core surveys',
    value: 91,
    color: '#c4e7ff',
    selectedBackground: '#20262a',
    selectedBorder: '#647e91',
    description: 'Representative employee voice at scale',
    examples: [
      'Annual engagement survey',
      'Pulse survey',
      'Lifecycle survey',
      'Post-event survey',
    ],
  },
  {
    id: 'facilitated-dialogue',
    title: 'Facilitated dialogue',
    value: 78,
    color: '#7fbce7',
    selectedBackground: '#0c1821',
    selectedBorder: '#47718e',
    description: 'Qualitative depth',
    examples: [
      'Focus groups',
      'Listening sessions',
      'Employee roundtables',
      'Leader Q&A follow-ups',
    ],
  },
  {
    id: 'open-and-ongoing',
    title: 'Open and ongoing',
    value: 74,
    color: '#38cce8',
    selectedBackground: '#06181b',
    selectedBorder: '#1d7c8e',
    description: 'Outside scheduled cycles',
    examples: [
      'Always-on feedback',
      'Digital suggestion box',
      'Open-text intake',
      'Ask-me-anything themes',
    ],
  },
  {
    id: 'ambient-or-passive',
    title: 'Ambient or passive',
    value: 71,
    color: '#9299f7',
    selectedBackground: '#06181b',
    selectedBorder: '#40436c',
    description: 'Behavioral patterns',
    examples: [
      'Collaboration signals',
      'Support themes',
      'Work-pattern signals',
      'Service-desk trends',
    ],
  },
  {
    id: 'embedded-and-frontline',
    title: 'Embedded and frontline',
    value: 48,
    color: '#626ad5',
    selectedBackground: '#111325',
    selectedBorder: '#373d8b',
    description: 'Close to work',
    examples: [
      'Shift huddles',
      'QR-code check-ins',
      'Safety stand-ups',
      'Team retrospectives',
    ],
  },
] as const satisfies readonly ChannelPortfolioItem[]

function formatExamples(examples: readonly string[]) {
  if (examples.length < 2) {
    return examples[0] ?? ''
  }

  if (examples.length === 2) {
    return `${examples[0]} and ${examples[1]}`
  }

  return `${examples.slice(0, -1).join(', ')}, and ${examples.at(-1)}`
}

function ChannelChevron() {
  return (
    <svg
      aria-hidden="true"
      className="glint-channel-portfolio__chevron"
      focusable="false"
      viewBox="0 0 16 16"
    >
      <path
        d="M5.646 3.146a.5.5 0 0 0 0 .708L9.793 8l-4.147 4.146a.5.5 0 0 0 .708.708l4.5-4.5a.5.5 0 0 0 0-.708l-4.5-4.5a.5.5 0 0 0-.708 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

function validatePortfolioItems(
  items: readonly ChannelPortfolioItem[],
  selectedId: string | undefined,
  defaultSelectedId: string | undefined,
) {
  if (items.length === 0) {
    throw new Error('ChannelPortfolio requires at least one item.')
  }

  const ids = items.map((item) => item.id)
  if (new Set(ids).size !== ids.length) {
    throw new Error('ChannelPortfolio item ids must be unique.')
  }

  const invalidItem = items.find(
    (item) => !Number.isFinite(item.value) || item.value < 0 || item.value > 100,
  )
  if (invalidItem) {
    throw new Error(
      `ChannelPortfolio value for "${invalidItem.id}" must be between 0 and 100.`,
    )
  }

  const initialSelectedId = defaultSelectedId ?? items[0].id
  if (!ids.includes(initialSelectedId)) {
    throw new Error('ChannelPortfolio defaultSelectedId must match an item id.')
  }
  if (selectedId !== undefined && !ids.includes(selectedId)) {
    throw new Error('ChannelPortfolio selectedId must match an item id.')
  }

  return initialSelectedId
}

export function ChannelPortfolio({
  items = defaultItems,
  selectedId,
  defaultSelectedId,
  onSelectedIdChange,
  eyebrow = 'Channel portfolio',
  title = 'Adoption is broad—but uneven',
  description = 'Share of listening leaders currently using each approach. Click each row to view details.',
}: ChannelPortfolioProps) {
  const initialSelectedId = validatePortfolioItems(
    items,
    selectedId,
    defaultSelectedId,
  )
  const [internalSelectedId, setInternalSelectedId] =
    useState(initialSelectedId)
  const detailGroupId = useId()
  const activeId = selectedId ?? internalSelectedId
  const maxValue = Math.max(...items.map((item) => item.value), 1)

  function selectItem(nextSelectedId: string) {
    if (selectedId === undefined) {
      setInternalSelectedId(nextSelectedId)
    }
    onSelectedIdChange?.(nextSelectedId)
  }

  return (
    <section className="glint-channel-portfolio">
      <header className="glint-channel-portfolio__header">
        <p className="glint-channel-portfolio__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      <div className="glint-channel-portfolio__rows">
        {items.map((item, index) => {
          const active = activeId === item.id
          const detailId = `${detailGroupId}-${index}`

          return (
            <div
              className="glint-channel-portfolio__row"
              data-active={active}
              key={item.id}
              style={
                {
                  '--channel-color': item.color,
                  '--channel-width': `${(item.value / maxValue) * 100}%`,
                  '--channel-selected-background':
                    item.selectedBackground ?? '#111220',
                  '--channel-selected-border':
                    item.selectedBorder ?? '#2a2c50',
                } as CSSProperties
              }
            >
              <button
                aria-label={`${item.title}, ${item.value}% adoption`}
                aria-controls={active ? detailId : undefined}
                aria-expanded={active}
                onClick={() => selectItem(item.id)}
                type="button"
              >
                <strong>
                  <span>{item.title}</span>
                  <ChannelChevron />
                </strong>
                <span className="glint-channel-portfolio__measure">
                  <span
                    aria-hidden="true"
                    className="glint-channel-portfolio__bar"
                  >
                    <span />
                  </span>
                  <span className="glint-channel-portfolio__value">
                    {item.value}%
                  </span>
                </span>
              </button>

              {active ? (
                <div
                  aria-label={`${item.title} details`}
                  className="glint-channel-portfolio__details"
                  id={detailId}
                  role="group"
                >
                  <span className="glint-channel-portfolio__description">
                    {item.description}
                  </span>
                  <p className="glint-channel-portfolio__examples">
                    Examples include {formatExamples(item.examples)}.
                  </p>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <table
        aria-label="Channel portfolio data"
        className="glint-visually-hidden"
      >
        <thead>
          <tr>
            <th>Channel</th>
            <th>Adoption</th>
            <th>Description</th>
            <th>Examples</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <th>{item.title}</th>
              <td>{item.value}%</td>
              <td>{item.description}</td>
              <td>{item.examples.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

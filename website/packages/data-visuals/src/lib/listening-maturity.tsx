import { useId, useState, type CSSProperties } from 'react'

export type ListeningMaturityPattern = 'constrained' | 'uneven' | 'embedded'

export type ListeningMaturityOption = {
  pattern: ListeningMaturityPattern
  label: string
}

export type ListeningMaturityCapability = {
  id: string
  title: string
  question: string
  color: string
  options: readonly ListeningMaturityOption[]
  next: string
}

export type ListeningMaturitySelections = Partial<
  Record<string, ListeningMaturityPattern>
>

export type ListeningMaturityProps = {
  capabilities?: readonly ListeningMaturityCapability[]
  selections?: ListeningMaturitySelections
  defaultSelections?: ListeningMaturitySelections
  onSelectionsChange?: (selections: ListeningMaturitySelections) => void
  eyebrow?: string
  title?: string
  description?: string
  resultPanelTop?: string
}

const defaultListeningMaturityCapabilities = [
  {
    id: 'participation',
    title: 'Inclusive participation and access',
    question: 'Who can the system reliably hear?',
    color: '#c4e7ff',
    options: [
      {
        pattern: 'constrained',
        label: 'We rely on one or two familiar channels.',
      },
      {
        pattern: 'uneven',
        label: 'We use several channels, but some groups remain harder to hear.',
      },
      {
        pattern: 'embedded',
        label:
          'We design different ways for different employees to participate.',
      },
    ],
    next:
      'Ask which employee group is still easiest to miss, then identify one participation route that better fits their work.',
  },
  {
    id: 'accountability',
    title: 'Action and accountability',
    question: 'What happens after the organization hears?',
    color: '#7fbce7',
    options: [
      {
        pattern: 'constrained',
        label: 'Insights often stop at the readout.',
      },
      {
        pattern: 'uneven',
        label: 'Follow-through depends on the leader or team.',
      },
      {
        pattern: 'embedded',
        label: 'Ownership, decisions, and updates are built into the cycle.',
      },
    ],
    next:
      'Trace one insight from readout to decision and identify where ownership became unclear.',
  },
  {
    id: 'impact',
    title: 'Strategic impact',
    question: 'Where does employee evidence shape decisions?',
    color: '#38cce8',
    options: [
      {
        pattern: 'constrained',
        label: 'Listening mainly informs HR programs.',
      },
      {
        pattern: 'uneven',
        label: 'Employee evidence sometimes shapes business decisions.',
      },
      {
        pattern: 'embedded',
        label:
          'Employee evidence regularly changes priorities or investments.',
      },
    ],
    next:
      'Choose one upcoming decision that should include employee evidence before direction is set.',
  },
  {
    id: 'intelligence',
    title: 'Adaptive intelligence',
    question: 'How does listening respond to change?',
    color: '#9299f7',
    options: [
      {
        pattern: 'constrained',
        label: 'Listening follows a fixed calendar.',
      },
      {
        pattern: 'uneven',
        label: 'We add follow-up when a significant issue appears.',
      },
      {
        pattern: 'embedded',
        label: 'Emerging signals reshape what and how we ask.',
      },
    ],
    next:
      'Name one emerging signal that should trigger a response before the next survey.',
  },
] as const satisfies readonly ListeningMaturityCapability[]

function readableList(items: readonly string[]) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

function validateSelections(
  capabilities: readonly ListeningMaturityCapability[],
  selections: ListeningMaturitySelections | undefined,
  label: string,
) {
  const capabilityIds = new Set(capabilities.map((capability) => capability.id))

  Object.entries(selections ?? {}).forEach(([id, pattern]) => {
    if (!capabilityIds.has(id)) {
      throw new Error(
        `ListeningMaturity ${label} contains the unknown capability "${id}".`,
      )
    }
    if (
      pattern !== 'constrained' &&
      pattern !== 'uneven' &&
      pattern !== 'embedded'
    ) {
      throw new Error(
        `ListeningMaturity ${label} contains an invalid pattern for "${id}".`,
      )
    }
  })
}

function validateCapabilities(
  capabilities: readonly ListeningMaturityCapability[],
  selections: ListeningMaturitySelections | undefined,
  defaultSelections: ListeningMaturitySelections | undefined,
) {
  if (capabilities.length !== 4) {
    throw new Error('ListeningMaturity requires exactly four capabilities.')
  }

  const ids = capabilities.map((capability) => capability.id)
  if (new Set(ids).size !== ids.length) {
    throw new Error('ListeningMaturity capability ids must be unique.')
  }

  capabilities.forEach((capability) => {
    const patterns = capability.options.map((option) => option.pattern)
    if (
      capability.options.length !== 3 ||
      new Set(patterns).size !== 3 ||
      !patterns.includes('constrained') ||
      !patterns.includes('uneven') ||
      !patterns.includes('embedded')
    ) {
      throw new Error(
        `ListeningMaturity capability "${capability.id}" requires one constrained, uneven, and embedded option.`,
      )
    }
  })

  validateSelections(capabilities, selections, 'selections')
  validateSelections(capabilities, defaultSelections, 'defaultSelections')
}

function HintIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path
        d="M13.28 1.26a13 13 0 0 1 3.09 1.3 1 1 0 0 1-1.08 1.69 11 11 0 0 0-2.47-1.04 1 1 0 1 1 .46-1.95ZM18.12 5.4a1 1 0 0 1 1.38.33 12 12 0 0 1 1.39 3.77 11.4 11.4 0 0 0-2 .19 10 10 0 0 0-1.1-2.91 1 1 0 0 1 .33-1.38ZM9.69 18.89a11 11 0 0 1-3-1.14 1 1 0 1 0-1.07 1.69 13 13 0 0 0 3.88 1.45c.01-.68.07-1.35.19-2ZM10.02 1.99a1 1 0 0 1-.76 1.2 10 10 0 0 0-2.48 1.01 1 1 0 1 1-1.05-1.7 12 12 0 0 1 3.1-1.26 1 1 0 0 1 1.19.75ZM3.94 5.32a1 1 0 0 1 .31 1.38 10 10 0 0 0-1.04 2.47 1 1 0 1 1-1.95-.46 12 12 0 0 1 1.3-3.08 1 1 0 0 1 1.38-.31ZM1.99 11.97a1 1 0 0 1 1.2.76 10 10 0 0 0 1.01 2.48 1 1 0 1 1-1.7 1.05 12 12 0 0 1-1.26-3.1 1 1 0 0 1 .75-1.19Zm24.22 7.24a1 1 0 0 0-1.42-1.42L20 22.58l-2.29-2.29a1 1 0 1 0-1.42 1.42l3 3a1 1 0 0 0 1.42 0l5.5-5.5ZM21 31a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-2a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
        fill="currentColor"
      />
    </svg>
  )
}

function AsteriskIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M10.5 2.5a.5.5 0 0 0-1 0v6.29L5.05 4.34a.5.5 0 0 0-.71.71L8.79 9.5H2.5a.5.5 0 0 0 0 1h6.29l-4.45 4.45a.5.5 0 0 0 .71.71l4.45-4.45v6.29a.5.5 0 0 0 1 0v-6.29l4.45 4.45a.5.5 0 0 0 .71-.71l-4.45-4.45h6.29a.5.5 0 0 0 0-1h-6.29l4.45-4.45a.5.5 0 0 0-.71-.71L10.5 8.79V2.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M12.65 3.65a.5.5 0 0 0 0 .7L16.29 8H9.5A7.5 7.5 0 0 0 2 15.5a.5.5 0 0 0 1 0A6.5 6.5 0 0 1 9.5 9h6.79l-3.64 3.65a.5.5 0 0 0 .7.7l4.5-4.5a.5.5 0 0 0 0-.7l-4.5-4.5a.5.5 0 0 0-.7 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function ListeningMaturity({
  capabilities = defaultListeningMaturityCapabilities,
  selections,
  defaultSelections = {},
  onSelectionsChange,
  eyebrow = 'Listening maturity',
  title = 'What does your listening system look like?',
  description = 'Choose one statement in each area. Your reflection updates as you go.',
  resultPanelTop = '16px',
}: ListeningMaturityProps) {
  validateCapabilities(capabilities, selections, defaultSelections)

  const [internalSelections, setInternalSelections] =
    useState<ListeningMaturitySelections>(defaultSelections)
  const radioGroupId = useId()
  const activeSelections = selections ?? internalSelections
  const selectedEntries = capabilities.flatMap((capability) => {
    const pattern = activeSelections[capability.id]
    return pattern ? [{ capability, pattern }] : []
  })
  const embedded = selectedEntries
    .filter(({ pattern }) => pattern === 'embedded')
    .map(({ capability }) => capability.title.toLowerCase())
  const uneven = selectedEntries
    .filter(({ pattern }) => pattern === 'uneven')
    .map(({ capability }) => capability.title.toLowerCase())
  const constrained = selectedEntries
    .filter(({ pattern }) => pattern === 'constrained')
    .map(({ capability }) => capability.title.toLowerCase())
  const hasSelection = selectedEntries.length > 0

  let resultTitle = 'Listening maturity is developing unevenly.'
  let resultSummary =
    'Some practices are taking hold; others still vary by team or moment.'

  if (embedded.length === capabilities.length) {
    resultTitle = 'Listening is embedded in how the organization works.'
    resultSummary =
      'The system can hear broadly, act visibly, influence decisions, and adapt.'
  } else if (constrained.length >= 2) {
    resultTitle = 'The system has intent, but its foundations are fragile.'
    resultSummary =
      'Listening activity exists, but the path from participation to decisions and learning still depends on individual effort.'
  } else if (embedded.length >= 2 && constrained.length === 0) {
    resultTitle = 'A connected listening system is taking shape.'
    resultSummary =
      'Several capabilities are becoming standard practice. The opportunity is consistency.'
  }

  const standsOut =
    embedded.length > 0
      ? `The clearest strength is ${readableList(embedded)}.`
      : uneven.length > 0
        ? `Promising practices are emerging in ${readableList(uneven)}, but they are not yet consistent.`
        : 'The current choices do not yet show an embedded capability. Start by naming what already works in isolated teams.'
  const nextCapability =
    selectedEntries.find(({ pattern }) => pattern === 'constrained')?.capability ??
    selectedEntries.find(({ pattern }) => pattern === 'uneven')?.capability ??
    capabilities[0]

  function select(capabilityId: string, pattern: ListeningMaturityPattern) {
    const nextSelections = { ...activeSelections, [capabilityId]: pattern }
    if (selections === undefined) {
      setInternalSelections(nextSelections)
    }
    onSelectionsChange?.(nextSelections)
  }

  return (
    <section
      className="glint-listening-maturity"
      style={
        {
          '--glint-listening-maturity-result-top': resultPanelTop,
        } as CSSProperties
      }
    >
      <header className="glint-listening-maturity__header">
        <p className="glint-listening-maturity__eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      <div className="glint-listening-maturity__content">
        <div className="glint-listening-maturity__capabilities">
          {capabilities.map((capability) => (
            <fieldset
              className="glint-listening-maturity__capability"
              key={capability.id}
              style={{ '--maturity-accent': capability.color } as CSSProperties}
            >
              <legend>{capability.title}</legend>
              <p>{capability.question}</p>
              <div className="glint-listening-maturity__options">
                {capability.options.map((option) => (
                  <label
                    className="glint-listening-maturity__option"
                    key={option.pattern}
                  >
                    <input
                      checked={
                        activeSelections[capability.id] === option.pattern
                      }
                      name={`${radioGroupId}-${capability.id}`}
                      onChange={() => select(capability.id, option.pattern)}
                      type="radio"
                      value={option.pattern}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <aside
          aria-live="polite"
          className="glint-listening-maturity__result"
        >
          {!hasSelection ? (
            <div className="glint-listening-maturity__result-empty">
              <HintIcon />
              <strong>Start by choosing a statement</strong>
            </div>
          ) : (
            <>
              <span className="glint-listening-maturity__badge">
                Your listening system
              </span>
              <div className="glint-listening-maturity__result-introduction">
                <h3>{resultTitle}</h3>
                <p>{resultSummary}</p>
              </div>
              <div className="glint-listening-maturity__result-section">
                <h4>
                  <AsteriskIcon />
                  <span>What stands out</span>
                </h4>
                <p>{standsOut}</p>
              </div>
              <div className="glint-listening-maturity__result-section">
                <h4>
                  <ArrowIcon />
                  <span>Consider next</span>
                </h4>
                <p>{nextCapability.next}</p>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}

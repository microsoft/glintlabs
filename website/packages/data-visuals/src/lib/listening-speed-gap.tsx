import { useId, useState } from 'react'

const listeningFitStates = [
  {
    id: 'minimum',
    markerCount: 1,
    zone: 'Insufficient signal',
    title: 'Important changes may be going unheard',
    description:
      'With few listening moments, shifts can go undetected until decisions are underway or conditions have already changed.',
    action:
      'Start with the highest-priority business questions and add a timely listening channel.',
    positive: false,
  },
  {
    id: 'low',
    markerCount: 3,
    zone: 'Insufficient signal',
    title: 'Your listening approach may leave important signal gaps',
    description:
      'Current business questions can remain unanswered while understanding becomes outdated between listening moments.',
    action:
      'Add or diversify listening where decisions lack timely, relevant evidence.',
    positive: false,
  },
  {
    id: 'balanced',
    markerCount: 5,
    zone: 'Right-fit listening',
    title: 'Signal and synthesis are in balance',
    description:
      'Listening is frequent enough to keep understanding current without outpacing the organization’s ability to interpret and act.',
    action:
      'What change in priorities or pace would require reassessing this balance?',
    positive: true,
  },
  {
    id: 'high',
    markerCount: 10,
    zone: 'Synthesis overload',
    title: 'Feedback may be arriving faster than it can be used',
    description:
      'More collection can create synthesis backlog, delay action, and ask employees for input without a visible response.',
    action:
      'Prioritize key questions, sequence collection, or increase synthesis capacity.',
    positive: false,
  },
  {
    id: 'overload',
    markerCount: 16,
    zone: 'Synthesis overload',
    title: 'Listening volume is outpacing synthesis capacity',
    description:
      'A growing backlog can make feedback stale, obscure priorities, and weaken trust when employees do not see a visible response.',
    action:
      'Pause lower-priority collection, clear the synthesis backlog, and close the loop before adding new listening.',
    positive: false,
  },
] as const

export type ListeningFit = (typeof listeningFitStates)[number]['id']

export type ListeningSpeedGapProps = {
  defaultFit?: ListeningFit
  description?: string
  eyebrow?: string
  fit?: ListeningFit
  onFitChange?: (fit: ListeningFit) => void
  title?: string
}

function WorkPaceWave() {
  const peaks = [16, 1, 10, 24, 8, 16, 1, 12]

  return (
    <svg aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 668 42">
      {peaks.map((peak, index) => {
        const start = index * 83.5
        const midpoint = start + 41.75
        const end = start + 83.5

        return (
          <path
            d={`M${start} 40C${start + 22.3376} 40 ${start + 27.3901} ${peak} ${midpoint} ${peak}C${start + 56.1099} ${peak} ${start + 61.1624} 40 ${end} 40`}
            key={`${peak}-${index}`}
          />
        )
      })}
    </svg>
  )
}

function FormIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M6.5 10a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1M7 13.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0M3 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm2.5-1a.5.5 0 0 0 0 1h9a.5.5 0 0 0 0-1zM8 9.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m0 4a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0m1-4a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 0-1h-5a.5.5 0 0 0-.5.5m.5 3.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z"
        fill="currentColor"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M7.37 3.553c1.14-2.074 4.12-2.074 5.259 0l5.496 10.005c1.098 1.999-.349 4.444-2.63 4.444H4.504c-2.281 0-3.727-2.445-2.629-4.444zm4.383.482c-.76-1.383-2.746-1.383-3.506 0L2.751 14.039c-.732 1.333.232 2.963 1.753 2.963h10.991c1.52 0 2.485-1.63 1.753-2.963zM10 12.748a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5m0-6.25a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5"
        fill="currentColor"
      />
    </svg>
  )
}

function ThumbLikeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M10.053 2.29c.34-.978 1.632-1.428 2.431-.591.163.17.325.355.435.519.32.48.454 1.113.504 1.73.05.628.016 1.302-.048 1.912a18 18 0 0 1-.252 1.635h.884c1.872 0 3.287 1.695 2.952 3.537l-.684 3.761c-.472 2.596-3.066 4.23-5.612 3.536l-5.6-1.526a2.5 2.5 0 0 1-1.793-1.922l-.353-1.765c-.278-1.389.784-2.559 1.913-3.005.323-.127.614-.289.841-.49 1.706-1.513 2.324-2.723 3.384-4.849.354-.71.718-1.676.998-2.483m1.965 5.584.01-.04c.007-.028.016-.07.028-.124.025-.108.059-.265.097-.46.076-.388.167-.92.228-1.495.06-.577.088-1.185.045-1.728-.045-.555-.16-.985-.34-1.255a3 3 0 0 0-.326-.383c-.199-.208-.628-.16-.762.228-.283.814-.664 1.83-1.048 2.6-1.067 2.141-1.756 3.502-3.616 5.152-.34.302-.744.517-1.136.672-.881.348-1.447 1.148-1.301 1.879l.353 1.765c.111.557.528 1.003 1.076 1.153l5.6 1.527c1.98.54 3.997-.732 4.364-2.751l.685-3.761c.223-1.228-.72-2.358-1.968-2.358h-1.504a.5.5 0 0 1-.485-.622"
        fill="currentColor"
      />
    </svg>
  )
}

function ArrowForwardIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path
        d="M12.646 3.646a.5.5 0 0 0 0 .708L16.293 8H9.5A7.5 7.5 0 0 0 2 15.5a.5.5 0 0 0 1 0A6.5 6.5 0 0 1 9.5 9h6.793l-3.647 3.646a.5.5 0 0 0 .708.708l4.5-4.5a.5.5 0 0 0 0-.708l-4.5-4.5a.5.5 0 0 0-.708 0"
        fill="currentColor"
      />
    </svg>
  )
}

export function ListeningSpeedGap({
  defaultFit = 'balanced',
  description = 'The goal is not maximum collection. It is enough timely signal to understand what is changing without overwhelming the ability to synthesize and act.',
  eyebrow = 'Right-fit listening signal',
  fit,
  onFitChange,
  title = 'Match listening to the questions, decisions, and pace of work',
}: ListeningSpeedGapProps) {
  const [internalFit, setInternalFit] = useState<ListeningFit>(defaultFit)
  const titleId = useId()
  const selectedFit = fit ?? internalFit
  const selectedIndex = listeningFitStates.findIndex(
    (state) => state.id === selectedFit,
  )
  const safeIndex = selectedIndex === -1 ? 2 : selectedIndex
  const selectedState = listeningFitStates[safeIndex]

  function selectFit(index: number) {
    const nextFit = listeningFitStates[index]?.id

    if (nextFit === undefined) {
      return
    }

    if (fit === undefined) {
      setInternalFit(nextFit)
    }

    onFitChange?.(nextFit)
  }

  return (
    <section aria-labelledby={titleId} className="glint-listening-speed">
      <p className="glint-listening-speed__eyebrow">{eyebrow}</p>
      <div className="glint-listening-speed__heading">
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="glint-listening-speed__header-divider" />

      <div className="glint-listening-speed__visual">
        <p className="glint-listening-speed__visual-title">
          Pace of work relative to listening density
        </p>
        <div className="glint-listening-speed__signal">
          <div className="glint-listening-speed__wave">
            <WorkPaceWave />
          </div>
          <div
            aria-label={`${selectedState.markerCount} listening moments at the ${selectedState.zone.toLowerCase()} position`}
            className={`glint-listening-speed__density ${
              selectedState.markerCount === 1
                ? 'glint-listening-speed__density--single'
                : ''
            }`}
            role="img"
          >
            {Array.from({ length: selectedState.markerCount }, (_, index) => (
              <span
                aria-hidden="true"
                className="glint-listening-speed__marker"
                key={index}
              >
                <FormIcon />
              </span>
            ))}
          </div>
        </div>

        <label
          className="glint-listening-speed__prompt"
          htmlFor={`${titleId}-fit`}
        >
          Drag to explore your listening fit
        </label>
        <div className="glint-listening-speed__range-wrap">
          <div
            aria-hidden="true"
            className="glint-listening-speed__range-track"
          />
          <span
            aria-hidden="true"
            className="glint-listening-speed__range-ticks"
          >
            <i />
            <i />
            <i />
          </span>
          <input
            aria-valuetext={`${selectedState.zone}. ${selectedState.title}.`}
            id={`${titleId}-fit`}
            max={listeningFitStates.length - 1}
            min={0}
            onChange={(event) => selectFit(Number(event.target.value))}
            step={1}
            type="range"
            value={safeIndex}
          />
        </div>
        <div aria-hidden="true" className="glint-listening-speed__scale">
          <span>Insufficient signal</span>
          <i />
          <span>Right-fit listening</span>
          <i />
          <span>Synthesis overload</span>
        </div>
      </div>

      <div
        aria-live="polite"
        className={`glint-listening-speed__result ${
          selectedState.positive
            ? 'glint-listening-speed__result--positive'
            : ''
        }`}
      >
        <div className="glint-listening-speed__result-column">
          <span className="glint-listening-speed__result-icon">
            {selectedState.positive ? <ThumbLikeIcon /> : <WarningIcon />}
          </span>
          <p className="glint-listening-speed__result-title">
            {selectedState.title}
          </p>
          <p className="glint-listening-speed__result-copy">
            {selectedState.description}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="glint-listening-speed__result-divider"
        />
        <div className="glint-listening-speed__result-column">
          <span className="glint-listening-speed__result-icon">
            <ArrowForwardIcon />
          </span>
          <p className="glint-listening-speed__result-action-title">
            Consider next
          </p>
          <p className="glint-listening-speed__result-copy">
            {selectedState.action}
          </p>
        </div>
      </div>

      <table className="glint-visually-hidden">
        <caption>Listening fit states and recommended actions</caption>
        <thead>
          <tr>
            <th>State</th>
            <th>Listening moments</th>
            <th>Interpretation</th>
            <th>Consider next</th>
          </tr>
        </thead>
        <tbody>
          {listeningFitStates.map((state) => (
            <tr key={state.id}>
              <th>{state.zone}</th>
              <td>{state.markerCount}</td>
              <td>{state.description}</td>
              <td>{state.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

import { useId } from 'react'

export type GuardrailContent = {
  label: string
  question: string
}

export type RightFitGuardrailsProps = {
  title: string
  description: string
  trustworthy: GuardrailContent
  intelligent: GuardrailContent
  embedded: GuardrailContent
  responsive: GuardrailContent
  outcomeDriven: GuardrailContent
  centerLabel: string
  centerStatement: string
  centerConstraint: string
  footer: string
}

type GuardrailCardProps = GuardrailContent & {
  className: string
}

function GuardrailCard({
  className,
  label,
  question,
}: GuardrailCardProps) {
  return (
    <section className={`glint-guardrail-card ${className}`}>
      <h3>{label}</h3>
      <p>{question}</p>
    </section>
  )
}

function DiagramConnectors() {
  return (
    <svg
      className="glint-guardrails__connectors"
      aria-hidden="true"
      viewBox="0 0 678 496"
    >
      <path
        d="M250 69.5h35c11.046 0 20 8.954 20 20v61"
        stroke="#c4e7ff"
      />
      <path
        d="M435.5 69.5h-35c-11.046 0-20 8.954-20 20v61"
        stroke="#7fbce7"
      />
      <path d="M343 346v20" stroke="#9299f7" />
      <path d="M172 248h20" stroke="#626ad5" />
      <path d="M486 248h20" stroke="#38cce8" />
    </svg>
  )
}

function LightbulbIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M11.25 6.75a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0v-1.5Zm5.03 1.466a.75.75 0 0 0-1.06 0l-1.061 1.06a.75.75 0 1 0 1.06 1.061l1.061-1.06a.75.75 0 0 0 0-1.061Zm-7.5 0a.75.75 0 0 0-1.06 1.06l1.06 1.061a.75.75 0 0 0 1.061-1.06l-1.06-1.061ZM12 2a7.25 7.25 0 0 1 4.587 12.992.75.75 0 0 0-.175.265l-1.163 4.999A2.25 2.25 0 0 1 13.057 22h-2.114a2.25 2.25 0 0 1-2.192-1.745l-1.13-4.895a.75.75 0 0 0-.206-.367A7.25 7.25 0 0 1 12 2Zm2.115 16.499H9.884l.329 1.419a.75.75 0 0 0 .73.581h2.114a.75.75 0 0 0 .73-.581l.328-1.42ZM12 3.5a5.75 5.75 0 0 0-3.537 10.419c.31.303.527.686.62 1.104l.455 1.976h1.712V10.75a.75.75 0 0 1 1.5 0v6.249h1.711l.458-1.977c.094-.415.307-.797.62-1.102A5.75 5.75 0 0 0 12 3.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function RightFitGuardrails({
  title,
  description,
  trustworthy,
  intelligent,
  embedded,
  responsive,
  outcomeDriven,
  centerLabel,
  centerStatement,
  centerConstraint,
  footer,
}: RightFitGuardrailsProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <article
      className="glint-guardrails"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <header className="glint-guardrails__header">
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
      </header>

      <div className="glint-guardrails__diagram">
        <DiagramConnectors />
        <GuardrailCard
          {...trustworthy}
          className="glint-guardrail-card--trustworthy"
        />
        <GuardrailCard
          {...intelligent}
          className="glint-guardrail-card--intelligent"
        />
        <GuardrailCard
          {...embedded}
          className="glint-guardrail-card--embedded"
        />
        <GuardrailCard
          {...responsive}
          className="glint-guardrail-card--responsive"
        />
        <GuardrailCard
          {...outcomeDriven}
          className="glint-guardrail-card--outcome"
        />

        <section className="glint-guardrails__center">
          <h3>{centerLabel}</h3>
          <p className="glint-guardrails__statement">{centerStatement}</p>
          <p>{centerConstraint}</p>
        </section>
      </div>

      <div className="glint-guardrails__divider" />
      <footer className="glint-guardrails__footer">
        <span>
          <LightbulbIcon />
        </span>
        <p>{footer}</p>
      </footer>
    </article>
  )
}

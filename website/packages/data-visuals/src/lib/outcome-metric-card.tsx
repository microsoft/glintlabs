import { useId } from 'react'

export type OutcomeMetricCardProps = {
  title: string
  description: string
  numerator: number
  denominator: number
}

function validateMetric(numerator: number, denominator: number) {
  if (!Number.isInteger(numerator) || numerator < 0) {
    throw new Error('OutcomeMetricCard numerator must be a nonnegative integer.')
  }

  if (!Number.isInteger(denominator) || denominator <= 0) {
    throw new Error('OutcomeMetricCard denominator must be a positive integer.')
  }

  if (numerator > denominator) {
    throw new Error(
      'OutcomeMetricCard numerator cannot be greater than its denominator.',
    )
  }
}

function RouteIcon() {
  return (
    <svg
      className="glint-outcome-metric__icon"
      aria-hidden="true"
      viewBox="0 0 19 20.5"
    >
      <path d="M3 0c1.306 0 2.414.835 2.826 2h8.924A4.25 4.25 0 0 1 19 6.25a4.25 4.25 0 0 1-4.25 4.25h-9.5a2.75 2.75 0 1 0 0 5.5h11.19l-1.72-1.72a.75.75 0 0 1 1.06-1.06l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 0 1-1.06-1.06l1.72-1.72H5.25A4.25 4.25 0 0 1 1 13.25 4.25 4.25 0 0 1 5.25 9h9.5a2.75 2.75 0 1 0 0-5.5H5.958A3 3 0 1 1 3 0Zm0 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    </svg>
  )
}

export function OutcomeMetricCard({
  title,
  description,
  numerator,
  denominator,
}: OutcomeMetricCardProps) {
  validateMetric(numerator, denominator)

  const titleId = useId()
  const descriptionId = useId()
  const percentage = Math.round((numerator / denominator) * 100)

  return (
    <article
      className="glint-outcome-metric"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <RouteIcon />
      <h3 id={titleId}>{title}</h3>
      <p className="glint-outcome-metric__description" id={descriptionId}>
        {description}
      </p>
      <p
        className="glint-outcome-metric__value"
        aria-label={`${numerator} of ${denominator}, ${percentage}%`}
      >
        <strong>
          {numerator} / {denominator}
        </strong>
        <span>({percentage}%)</span>
      </p>
    </article>
  )
}

import type { CSSProperties } from 'react'

export type EmployeeAiReadinessMetric = {
  id: string
  label: string
  value: string
  description: string
  percentage: number
  detail: string
  color: string
  background: string
  border: string
  track: string
}

export type EmployeeAiReadinessProps = {
  metrics?: readonly EmployeeAiReadinessMetric[]
  title?: string
  description?: string
  insight?: string
}

const defaultMetrics = [
  {
    id: 'trust',
    label: 'Trust',
    value: 'Two in three',
    description: 'trust AI tools with their feedback',
    percentage: 67,
    detail: 'Confidential · Fair · Accurate',
    color: '#c4e7ff',
    background: '#172025',
    border: '#42515c',
    track: '#394954',
  },
  {
    id: 'openness',
    label: 'Openness',
    value: '70%',
    description: 'are open to expanding AI in employee listening',
    percentage: 70,
    detail: 'Permission to test — safely',
    color: '#7fbce7',
    background: '#14222c',
    border: '#405f74',
    track: '#2d4e65',
  },
  {
    id: 'shadow-ai',
    label: 'Shadow AI',
    value: '59%',
    description: 'already use outside AI tools to support feedback',
    percentage: 59,
    detail: 'Practice is ahead of policy',
    color: '#38cce8',
    background: '#072126',
    border: '#186978',
    track: '#16434c',
  },
] as const satisfies readonly EmployeeAiReadinessMetric[]

function validateMetrics(metrics: readonly EmployeeAiReadinessMetric[]) {
  if (metrics.length !== 3) {
    throw new Error('EmployeeAiReadiness requires exactly three metrics.')
  }

  const ids = metrics.map((metric) => metric.id)
  if (new Set(ids).size !== ids.length) {
    throw new Error('EmployeeAiReadiness metric ids must be unique.')
  }

  const invalidMetric = metrics.find(
    (metric) =>
      !Number.isFinite(metric.percentage) ||
      metric.percentage < 0 ||
      metric.percentage > 100,
  )
  if (invalidMetric) {
    throw new Error(
      `EmployeeAiReadiness percentage for "${invalidMetric.id}" must be between 0 and 100.`,
    )
  }
}

function LightbulbFilamentIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M11.25 6.75a.75.75 0 0 1 1.5 0v1.5a.75.75 0 0 1-1.5 0v-1.5Zm5.03 1.47a.75.75 0 0 0-1.06 0l-1.06 1.06a.75.75 0 1 0 1.06 1.06l1.06-1.06a.75.75 0 0 0 0-1.06Zm-7.5 0a.75.75 0 0 0-1.06 1.06l1.06 1.06a.75.75 0 0 0 1.06-1.06L8.78 8.22ZM12 2a7.25 7.25 0 0 1 4.59 12.99.75.75 0 0 0-.18.27l-1.16 5a2.25 2.25 0 0 1-2.19 1.74h-2.12a2.25 2.25 0 0 1-2.19-1.74l-1.13-4.9a.75.75 0 0 0-.2-.37A7.25 7.25 0 0 1 12 2Zm2.12 16.5H9.88l.33 1.42a.75.75 0 0 0 .73.58h2.12a.75.75 0 0 0 .73-.58l.33-1.42ZM12 3.5a5.75 5.75 0 0 0-3.54 10.42c.3.3.52.68.62 1.1l.46 1.98h1.71v-6.25a.75.75 0 0 1 1.5 0V17h1.71l.46-1.98c.1-.42.31-.8.62-1.1A5.75 5.75 0 0 0 12 3.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function EmployeeAiReadiness({
  metrics = defaultMetrics,
  title = 'Employee behavior is already moving',
  description = 'Trust and openness coexist with widespread self-directed AI use in feedback.',
  insight = 'Moving slowly can push experimentation outside organizational safeguards.',
}: EmployeeAiReadinessProps) {
  validateMetrics(metrics)

  return (
    <section className="glint-employee-ai-readiness">
      <header className="glint-employee-ai-readiness__header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>

      <div className="glint-employee-ai-readiness__cards">
        {metrics.map((metric) => (
          <article
            className="glint-employee-ai-readiness__card"
            key={metric.id}
            style={
              {
                '--readiness-accent': metric.color,
                '--readiness-background': metric.background,
                '--readiness-border': metric.border,
                '--readiness-track': metric.track,
              } as CSSProperties
            }
          >
            <div className="glint-employee-ai-readiness__card-copy">
              <span className="glint-employee-ai-readiness__badge">
                {metric.label}
              </span>
              <div className="glint-employee-ai-readiness__metric">
                <strong>{metric.value}</strong>
                <p>{metric.description}</p>
              </div>
            </div>
            <div className="glint-employee-ai-readiness__measure">
              <div
                aria-label={`${metric.label}: ${metric.percentage}%`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={metric.percentage}
                className="glint-employee-ai-readiness__track"
                role="meter"
              >
                <span style={{ width: `${metric.percentage}%` }} />
              </div>
              <p>{metric.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="glint-employee-ai-readiness__insight">
        <LightbulbFilamentIcon />
        <p>{insight}</p>
      </div>

      <table
        aria-label="Employee AI readiness data"
        className="glint-visually-hidden"
      >
        <thead>
          <tr>
            <th>Measure</th>
            <th>Value</th>
            <th>Description</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.id}>
              <th>{metric.label}</th>
              <td>{metric.value}</td>
              <td>{metric.description}</td>
              <td>{metric.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

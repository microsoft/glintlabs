import { Fragment, useId } from 'react'

export type SkillPriorityLayer = {
  badge: string
  percentage: number
  skill: string
  summary: string
  details: readonly string[]
}

export type SkillPriorityStackProps = {
  eyebrow: string
  title: string
  description: string
  layers: readonly SkillPriorityLayer[]
}

function validateLayers(layers: readonly SkillPriorityLayer[]) {
  if (layers.length !== 3) {
    throw new Error('SkillPriorityStack requires exactly three layers.')
  }

  layers.forEach((layer) => {
    if (
      !Number.isInteger(layer.percentage) ||
      layer.percentage < 0 ||
      layer.percentage > 100
    ) {
      throw new Error(
        'SkillPriorityStack percentages must be integers from 0 to 100.',
      )
    }

    if (layer.details.length === 0) {
      throw new Error(
        'SkillPriorityStack layers require at least one supporting detail.',
      )
    }
  })
}

export function SkillPriorityStack({
  eyebrow,
  title,
  description,
  layers,
}: SkillPriorityStackProps) {
  validateLayers(layers)

  const titleId = useId()
  const descriptionId = useId()

  return (
    <article
      className="glint-skill-stack"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="glint-skill-stack__intro">
        <p className="glint-skill-stack__eyebrow">{eyebrow}</p>

        <header className="glint-skill-stack__header">
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </header>
      </div>

      <div className="glint-skill-stack__layers">
        {layers.map((layer, index) => (
          <Fragment key={layer.badge}>
            <section className="glint-skill-stack__layer">
              <div className="glint-skill-stack__metric">
                <p className="glint-skill-stack__badge">{layer.badge}</p>
                <h3>
                  {layer.percentage}% {layer.skill}
                </h3>
              </div>

              <div className="glint-skill-stack__details">
                <p>{layer.summary}</p>
                <ul>
                  {layer.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </div>
            </section>

            {index < layers.length - 1 ? (
              <div className="glint-skill-stack__divider" />
            ) : null}
          </Fragment>
        ))}
      </div>
    </article>
  )
}

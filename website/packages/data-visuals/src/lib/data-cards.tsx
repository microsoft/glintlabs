import { useId, type ReactNode } from 'react'

type DataCardFrameProps = {
  children: ReactNode
  className: string
  labelledBy: string
}

function DataCardFrame({
  children,
  className,
  labelledBy,
}: DataCardFrameProps) {
  return (
    <article
      className={`glint-data-card ${className}`}
      aria-labelledby={labelledBy}
    >
      {children}
    </article>
  )
}

type DataCardHeadingProps = {
  title: string
  statement: string
  titleId: string
}

function DataCardHeading({
  title,
  statement,
  titleId,
}: DataCardHeadingProps) {
  return (
    <header className="glint-data-card__heading">
      <h3 id={titleId}>{title}</h3>
      <p>{statement}</p>
    </header>
  )
}

export type DataInsightCardProps = {
  title: string
  statement: string
  interpretation?: string
}

export function DataInsightCard({
  title,
  statement,
  interpretation,
}: DataInsightCardProps) {
  const titleId = useId()

  return (
    <DataCardFrame
      className="glint-data-card--insight"
      labelledBy={titleId}
    >
      <DataCardHeading
        title={title}
        statement={statement}
        titleId={titleId}
      />
      {interpretation ? (
        <p className="glint-data-card__interpretation">{interpretation}</p>
      ) : null}
    </DataCardFrame>
  )
}

import type { ReactNode } from 'react'

export type GlintResearchCardTag = {
  iconSrc: string
  label: string
}

export type GlintResearchCardProps = {
  actionLabel?: string
  description: string
  href: string
  tags: readonly GlintResearchCardTag[]
  title: string
  visualAlt?: string
  visualSrc: string
}

export function GlintResearchCard({
  actionLabel = 'Explore the study',
  description,
  href,
  tags,
  title,
  visualAlt = '',
  visualSrc,
}: GlintResearchCardProps) {
  return (
    <a className="glint-research-card" href={href}>
      <span className="glint-research-card__body">
        <span className="glint-research-card__visual">
          <img alt={visualAlt} height="96" src={visualSrc} width="96" />
        </span>
        <span className="glint-research-card__copy">
          <strong>{title}</strong>
          <span>{description}</span>
        </span>
        <span className="glint-research-card__tags">
          {tags.map((tag) => (
            <span className="glint-research-card__tag" key={tag.label}>
              <img alt="" aria-hidden="true" src={tag.iconSrc} />
              {tag.label}
            </span>
          ))}
        </span>
      </span>
      <span className="glint-core-button">{actionLabel}</span>
    </a>
  )
}

export type GlintTrendingCardProps = {
  detail: string
  detailIcon?: ReactNode
  href: string
  rank: number
  title: string
}

export function GlintTrendingCard({
  detail,
  detailIcon,
  href,
  rank,
  title,
}: GlintTrendingCardProps) {
  return (
    <a className="glint-trending-card" href={href}>
      <span className="glint-trending-card__header">
        <strong>{rank}</strong>
        <span aria-hidden="true">›</span>
      </span>
      <span className="glint-trending-card__title">{title}</span>
      <span className="glint-trending-card__detail">
        {detailIcon}
        {detail}
      </span>
    </a>
  )
}

export type GlintToolCardProps = {
  actionLabel: string
  badge: string
  badgeIcon?: ReactNode
  description: string
  href: string
  imageAlt?: string
  imageSrc: string
  theme: 'green' | 'cyan' | 'violet'
  title: string
}

export function GlintToolCard({
  actionLabel,
  badge,
  badgeIcon,
  description,
  href,
  imageAlt = '',
  imageSrc,
  theme,
  title,
}: GlintToolCardProps) {
  return (
    <article className="glint-tool-card">
      <div className="glint-tool-card__image">
        <img alt={imageAlt} src={imageSrc} />
      </div>
      <div
        className={`glint-tool-card__content glint-tool-card__content--${theme}`}
      >
        <div className="glint-tool-card__copy">
          <span className="glint-core-badge">
            {badgeIcon}
            {badge}
          </span>
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        <a className="glint-core-button" href={href}>
          {actionLabel}
        </a>
      </div>
    </article>
  )
}

export type GlintResourceLinkRowProps = {
  actionLabel?: string
  description: string
  href: string
  icon: ReactNode
  title: string
}

export function GlintResourceLinkRow({
  actionLabel = 'View all',
  description,
  href,
  icon,
  title,
}: GlintResourceLinkRowProps) {
  return (
    <article className="glint-resource-row">
      <span className="glint-resource-row__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <a className="glint-core-button" href={href}>
        {actionLabel}
      </a>
    </article>
  )
}

import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type VisualFrameProps = ComponentPropsWithoutRef<'section'> & {
  children: ReactNode
}

export function VisualFrame({
  children,
  className = '',
  ...props
}: VisualFrameProps) {
  return (
    <section className={`glint-visual-frame ${className}`.trim()} {...props}>
      {children}
    </section>
  )
}

type VisualHeaderProps = {
  eyebrow?: string
  title: string
  subtitle?: string
}

export function VisualHeader({
  eyebrow,
  title,
  subtitle,
}: VisualHeaderProps) {
  return (
    <header className="glint-visual-header">
      {eyebrow ? <p className="glint-visual-eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {subtitle ? <p className="glint-visual-subtitle">{subtitle}</p> : null}
    </header>
  )
}

type VisualAnnotationProps = {
  children: ReactNode
}

export function VisualAnnotation({ children }: VisualAnnotationProps) {
  return <p className="glint-visual-annotation">{children}</p>
}

type VisualSourceProps = {
  children: ReactNode
}

export function VisualSource({ children }: VisualSourceProps) {
  return <p className="glint-visual-source">{children}</p>
}

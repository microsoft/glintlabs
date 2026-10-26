import { useId } from 'react'

export type PullQuoteProps = {
  quote: string
  attribution?: string
  role?: string
  annotation?: string
}

export function PullQuote({
  quote,
  attribution,
  role,
  annotation,
}: PullQuoteProps) {
  const quoteId = useId()

  return (
    <figure className="glint-pull-quote" aria-labelledby={quoteId}>
      <span className="glint-pull-quote__rule" aria-hidden="true" />
      <span className="glint-pull-quote__mark" aria-hidden="true">
        “
      </span>
      <blockquote id={quoteId}>
        <p>{quote}</p>
      </blockquote>
      {attribution ? (
        <figcaption>
          <strong>{attribution}</strong>
          {role ? (
            <>
              <span aria-hidden="true">/</span>
              <span>{role}</span>
            </>
          ) : null}
          {annotation ? (
            <>
              <span aria-hidden="true">/</span>
              <span className="glint-pull-quote__annotation">{annotation}</span>
            </>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  )
}

export type LeadStatementProps = {
  children: string
}

export function LeadStatement({ children }: LeadStatementProps) {
  return (
    <aside className="glint-lead-statement">
      <p>{children}</p>
    </aside>
  )
}

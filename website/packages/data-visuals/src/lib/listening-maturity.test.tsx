import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListeningMaturity } from './listening-maturity'

describe('ListeningMaturity', () => {
  it('updates the qualitative reflection as statements are selected', () => {
    render(<ListeningMaturity />)

    expect(
      screen.getByText('Start by choosing a statement'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('radio', {
        name: 'We rely on one or two familiar channels.',
      }),
    )

    expect(
      screen.getByText('Listening maturity is developing unevenly.'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('radio', {
        name: 'Insights often stop at the readout.',
      }),
    )
    fireEvent.click(
      screen.getByRole('radio', {
        name: 'Listening mainly informs HR programs.',
      }),
    )
    fireEvent.click(
      screen.getByRole('radio', {
        name: 'Listening follows a fixed calendar.',
      }),
    )

    expect(
      screen.getByText(
        'The system has intent, but its foundations are fragile.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Listening activity exists, but the path from participation to decisions and learning still depends on individual effort.',
      ),
    ).toBeInTheDocument()
  })

  it('supports controlled selections and reports complete state changes', async () => {
    const user = userEvent.setup()
    const onSelectionsChange = vi.fn()

    render(
      <ListeningMaturity
        onSelectionsChange={onSelectionsChange}
        selections={{ participation: 'embedded' }}
      />,
    )

    expect(
      screen.getByRole('radio', {
        name: 'We design different ways for different employees to participate.',
      }),
    ).toBeChecked()

    await user.click(
      screen.getByRole('radio', {
        name: 'Follow-through depends on the leader or team.',
      }),
    )

    expect(onSelectionsChange).toHaveBeenCalledWith({
      participation: 'embedded',
      accountability: 'uneven',
    })
  })

  it('requires the approved four-capability structure', () => {
    expect(() =>
      render(<ListeningMaturity capabilities={[]} />),
    ).toThrow(/exactly four capabilities/i)
  })
})

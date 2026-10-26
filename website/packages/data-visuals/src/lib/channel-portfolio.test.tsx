import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChannelPortfolio } from './channel-portfolio'

describe('ChannelPortfolio', () => {
  it('reveals details within the selected channel row', async () => {
    const user = userEvent.setup()

    render(<ChannelPortfolio />)

    const coreSurveys = screen.getByRole('button', {
      name: /core surveys, 91% adoption/i,
    })
    const facilitatedDialogue = screen.getByRole('button', {
      name: /facilitated dialogue, 78% adoption/i,
    })

    expect(
      document.querySelectorAll('.glint-channel-portfolio__chevron'),
    ).toHaveLength(5)
    expect(coreSurveys).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('group', { name: 'Core surveys details' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('group', { name: 'Facilitated dialogue details' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/showing examples/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/view examples/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/core surveys remain the backbone/i),
    ).not.toBeInTheDocument()

    const coreRow = coreSurveys.closest('.glint-channel-portfolio__row')
    expect(
      coreRow?.getAttribute('style'),
    ).toContain('--channel-selected-background: #20262a')
    expect(coreRow?.getAttribute('style')).toContain(
      '--channel-selected-border: #647e91',
    )

    await user.hover(facilitatedDialogue)
    facilitatedDialogue.focus()

    expect(coreSurveys).toHaveAttribute('aria-expanded', 'true')
    expect(facilitatedDialogue).toHaveAttribute('aria-expanded', 'false')

    await user.click(facilitatedDialogue)

    expect(facilitatedDialogue).toHaveAttribute('aria-expanded', 'true')
    expect(coreSurveys).toHaveAttribute('aria-expanded', 'false')
    const facilitatedDetails = screen.getByRole('group', {
      name: 'Facilitated dialogue details',
    })
    expect(facilitatedDetails).toBeInTheDocument()
    expect(facilitatedDetails).toHaveTextContent('Qualitative depth')
    expect(facilitatedDetails).toHaveTextContent('Employee roundtables')
    expect(facilitatedDetails).toHaveTextContent('Leader Q&A follow-ups')
  })

  it('supports controlled selection and exposes a semantic table', async () => {
    const user = userEvent.setup()
    const onSelectedIdChange = vi.fn()

    render(
      <ChannelPortfolio
        onSelectedIdChange={onSelectedIdChange}
        selectedId="ambient-or-passive"
      />,
    )

    expect(
      screen.getByRole('button', {
        name: /ambient or passive, 71% adoption/i,
      }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('table', { name: 'Channel portfolio data' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: /open and ongoing, 74% adoption/i,
      }),
    )
    expect(onSelectedIdChange).toHaveBeenCalledWith('open-and-ongoing')
  })

  it('rejects invalid adoption values', () => {
    expect(() =>
      render(
        <ChannelPortfolio
          items={[
            {
              id: 'invalid',
              title: 'Invalid',
              value: 101,
              color: '#fff',
              description: 'Invalid value',
              examples: [],
            },
          ]}
        />,
      ),
    ).toThrow(/between 0 and 100/i)
  })
})

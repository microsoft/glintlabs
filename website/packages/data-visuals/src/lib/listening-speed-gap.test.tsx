import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ListeningSpeedGap } from './listening-speed-gap'

describe('ListeningSpeedGap', () => {
  it('maps the range to the five listening-fit states', async () => {
    const user = userEvent.setup()
    const onFitChange = vi.fn()

    render(<ListeningSpeedGap onFitChange={onFitChange} />)

    const slider = screen.getByRole('slider', {
      name: 'Drag to explore your listening fit',
    })

    expect(slider).toHaveValue('2')
    expect(
      screen.getByText('Signal and synthesis are in balance'),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(
        '5 listening moments at the right-fit listening position',
      ),
    ).toBeInTheDocument()

    await user.tab()
    expect(slider).toHaveFocus()
    fireEvent.change(slider, { target: { value: '4' } })

    expect(slider).toHaveValue('4')
    expect(
      screen.getByText('Listening volume is outpacing synthesis capacity'),
    ).toBeInTheDocument()
    expect(onFitChange).toHaveBeenLastCalledWith('overload')
    expect(
      screen.getByLabelText(
        '16 listening moments at the synthesis overload position',
      ),
    ).toBeInTheDocument()
  })

  it('supports controlled fit selection and semantic fallback content', () => {
    render(<ListeningSpeedGap fit="low" />)

    expect(screen.getByRole('slider')).toHaveValue('1')
    expect(
      screen.getByText(
        'Your listening approach may leave important signal gaps',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('table', {
        name: 'Listening fit states and recommended actions',
      }),
    ).toBeInTheDocument()
  })

  it('ignores an invalid controlled fit and renders the balanced state', () => {
    render(
      <ListeningSpeedGap
        fit={'not-a-fit' as Parameters<typeof ListeningSpeedGap>[0]['fit']}
      />,
    )

    expect(
      screen.getByText('Signal and synthesis are in balance'),
    ).toBeInTheDocument()
  })
})

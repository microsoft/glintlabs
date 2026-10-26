import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmployeeAiReadiness } from './employee-ai-readiness'

describe('EmployeeAiReadiness', () => {
  it('renders the approved v5 employee AI indicators', () => {
    render(<EmployeeAiReadiness />)

    expect(
      screen.getByRole('heading', {
        name: 'Employee behavior is already moving',
      }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Two in three')).toHaveLength(2)
    expect(
      screen.getByRole('meter', { name: 'Openness: 70%' }),
    ).toHaveAttribute('aria-valuenow', '70')
    expect(
      screen.getByRole('meter', { name: 'Shadow AI: 59%' }),
    ).toHaveAttribute('aria-valuenow', '59')
    expect(screen.getAllByRole('meter')).toHaveLength(3)
    expect(
      screen.getByRole('table', { name: 'Employee AI readiness data' }),
    ).toBeInTheDocument()
  })

  it('accepts custom metric content', () => {
    render(
      <EmployeeAiReadiness
        metrics={[
          {
            id: 'one',
            label: 'One',
            value: '10%',
            description: 'First measure',
            percentage: 10,
            detail: 'First detail',
            color: '#fff',
            background: '#111',
            border: '#222',
            track: '#333',
          },
          {
            id: 'two',
            label: 'Two',
            value: '20%',
            description: 'Second measure',
            percentage: 20,
            detail: 'Second detail',
            color: '#fff',
            background: '#111',
            border: '#222',
            track: '#333',
          },
          {
            id: 'three',
            label: 'Three',
            value: '30%',
            description: 'Third measure',
            percentage: 30,
            detail: 'Third detail',
            color: '#fff',
            background: '#111',
            border: '#222',
            track: '#333',
          },
        ]}
      />,
    )

    expect(screen.getAllByText('First measure')).toHaveLength(2)
    expect(screen.getByRole('meter', { name: 'Three: 30%' })).toHaveAttribute(
      'aria-valuenow',
      '30',
    )
  })

  it('rejects invalid metric structures', () => {
    expect(() => render(<EmployeeAiReadiness metrics={[]} />)).toThrow(
      /exactly three metrics/i,
    )
  })
})

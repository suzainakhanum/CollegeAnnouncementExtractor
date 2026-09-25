// Unit tests for the DateCard component — task 11.3
//
// Verifies Requirement 6.3 (a date entry renders its date value, event label,
// and status/context) and that a missing status is handled gracefully.
import { describe, expect, it } from '@jest/globals'
import '@testing-library/jest-dom/jest-globals'
import { render, screen } from '@testing-library/react'
import DateCard from '../components/DateCard'
import type { DateEntry } from '../types'

describe('DateCard', () => {
  it('renders date, event, and status when all are present (Req 6.3)', () => {
    const entry: DateEntry = {
      date: '2025-01-15',
      event: 'Final exam',
      status: 'Confirmed',
    }

    const { container } = render(<DateCard entry={entry} />)

    expect(screen.getByText('2025-01-15')).toBeInTheDocument()
    expect(screen.getByText('Final exam')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()

    // Status element is present in the DOM.
    expect(container.querySelector('.date-card__status')).toBeInTheDocument()
  })

  it('renders gracefully when status is undefined (date + event only, no stray status)', () => {
    const entry: DateEntry = {
      date: '2025-02-01',
      event: 'Registration opens',
    }

    const { container } = render(<DateCard entry={entry} />)

    expect(screen.getByText('2025-02-01')).toBeInTheDocument()
    expect(screen.getByText('Registration opens')).toBeInTheDocument()

    // No status element should be rendered when status is absent.
    expect(container.querySelector('.date-card__status')).not.toBeInTheDocument()
  })
})

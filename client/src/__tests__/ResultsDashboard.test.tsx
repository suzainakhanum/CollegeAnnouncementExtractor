// Unit tests for the ResultsDashboard component — task 11.2
//
// Verifies the four display states (empty, error, result) and the ordering /
// conditional rendering rules for the eight sections.
//
// Requirements: 6.1, 6.5, 6.6, 6.8, 7.3, 7.4, 7.5
import { describe, it, expect } from '@jest/globals'
import '@testing-library/jest-dom/jest-globals'
import { render, screen } from '@testing-library/react'
import ResultsDashboard from '../components/ResultsDashboard'
import type { AppError, StructuredResult } from '../types'

/** A fully-populated, valid StructuredResult fixture (all 9 fields present). */
function makeResult(
  overrides: Partial<StructuredResult> = {}
): StructuredResult {
  return {
    summary: 'Final exams have been rescheduled for several cohorts.',
    whatChanged: ['Exam week moved from May 5 to May 12'],
    whoIsAffected: ['First-year students', 'Transfer students'],
    importantDates: [
      { date: '2025-05-12', event: 'Final exams begin', status: 'Confirmed' },
      { date: '2025-05-01', event: 'Registration deadline', status: 'Confirmed' },
    ],
    requiredActions: ['Bring your student ID', 'Confirm your exam slot online'],
    exceptions: ['Students with approved medical exemptions are excused'],
    documentsOrMaterials: ['Student ID card'],
    priority: 'Important',
    missingInformation: ['Exam room locations are not specified'],
    ...overrides,
  }
}

/** The eight section titles in the exact order Req 6.1 mandates. */
const SECTION_ORDER = [
  'Executive Summary',
  'What Changed',
  'Who Is Affected',
  'Important Dates',
  'Required Actions',
  'Exceptions / Exemptions',
  'Documents / Materials',
  'Missing Information',
]

describe('ResultsDashboard', () => {
  it('renders the empty-state placeholder when result is null (Req 8.7)', () => {
    render(
      <ResultsDashboard result={null} error={null} isLoading={false} />
    )

    expect(
      screen.getByText(/paste a college announcement above/i)
    ).toBeInTheDocument()
  })

  it('renders all eight sections in the required order (Req 6.1)', () => {
    render(
      <ResultsDashboard result={makeResult()} error={null} isLoading={false} />
    )

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)

    expect(headings).toEqual(SECTION_ORDER)
  })

  it('hides the Missing Information section when missingInformation is empty (Req 6.6)', () => {
    render(
      <ResultsDashboard
        result={makeResult({ missingInformation: [] })}
        error={null}
        isLoading={false}
      />
    )

    expect(
      screen.queryByRole('heading', { level: 2, name: 'Missing Information' })
    ).not.toBeInTheDocument()

    // Only seven sections should render when missing info is hidden.
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(7)
  })

  it('renders the Missing Information section when missingInformation is non-empty (Req 6.5)', () => {
    const missing = ['Exam room locations are not specified']
    render(
      <ResultsDashboard
        result={makeResult({ missingInformation: missing })}
        error={null}
        isLoading={false}
      />
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'Missing Information' })
    ).toBeInTheDocument()
    expect(screen.getByText(missing[0])).toBeInTheDocument()
  })

  it('shows the "No actions required" placeholder when requiredActions is empty (Req 6.8)', () => {
    render(
      <ResultsDashboard
        result={makeResult({ requiredActions: [] })}
        error={null}
        isLoading={false}
      />
    )

    expect(screen.getByText('No actions required')).toBeInTheDocument()
  })

  it('shows the "No important dates identified" placeholder when importantDates is empty (Req 6.3)', () => {
    render(
      <ResultsDashboard
        result={makeResult({ importantDates: [] })}
        error={null}
        isLoading={false}
      />
    )

    expect(
      screen.getByText('No important dates identified')
    ).toBeInTheDocument()
  })

  it('renders only the safe error message and no stack trace when error is present (Req 7.3, 7.4, 7.5)', () => {
    const error: AppError = {
      code: 500,
      message: 'Analysis could not be completed. Please try again.',
    }
    render(
      <ResultsDashboard result={null} error={error} isLoading={false} />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(error.message)

    // No internal details / stack traces should leak into the DOM.
    expect(alert.textContent).not.toMatch(/at\s+.+:\d+:\d+/)
    expect(alert.textContent).not.toMatch(/stack/i)
    expect(screen.queryByText(/500/)).not.toBeInTheDocument()

    // Result sections should not render alongside an error.
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })
})

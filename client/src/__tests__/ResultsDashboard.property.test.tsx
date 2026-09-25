// Property-based tests for the ResultsDashboard component — task 11.4
//
// Feature: campus-action-extractor, Property 7 / 8 / 9
//
// These properties exercise ResultsDashboard across many arbitrary valid
// StructuredResult objects (fast-check, minimum 100 iterations each) to verify
// the section ordering, checklist rendering, and date-card rendering rules hold
// universally rather than only for the hand-picked fixtures in the unit tests.
//
// Validates: Requirements 6.1, 6.2, 6.3, 6.6, 6.8
import { describe, it, expect } from '@jest/globals'
import '@testing-library/jest-dom/jest-globals'
import { render, screen, cleanup } from '@testing-library/react'
import fc from 'fast-check'
import ResultsDashboard from '../components/ResultsDashboard'
import type { DateEntry, StructuredResult } from '../types'

// A non-empty string arbitrary. fast-check 3.x: use fc.string() with a
// minLength constraint (NOT fc.printableAscii()). We map/filter to guarantee
// the trimmed value is non-empty so rendered text is always meaningful.
const nonEmptyString = fc
  .string({ minLength: 1, maxLength: 40 })
  .map((s) => s.replace(/\s/g, 'x')) // avoid whitespace-only / collapsing text
  .filter((s) => s.trim().length > 0)

// A DateEntry arbitrary: date and event are non-empty strings, status optional.
const dateEntryArb: fc.Arbitrary<DateEntry> = fc.record(
  {
    date: nonEmptyString,
    event: nonEmptyString,
    status: fc.option(nonEmptyString, { nil: undefined }),
  },
  { requiredKeys: ['date', 'event'] }
)

const stringArrayArb = fc.array(nonEmptyString, { maxLength: 6 })

// A valid StructuredResult arbitrary — all 9 fields present, priority is one of
// the three allowed classifications.
const structuredResultArb: fc.Arbitrary<StructuredResult> = fc.record({
  summary: nonEmptyString,
  whatChanged: stringArrayArb,
  whoIsAffected: stringArrayArb,
  importantDates: fc.array(dateEntryArb, { maxLength: 6 }),
  requiredActions: stringArrayArb,
  exceptions: stringArrayArb,
  documentsOrMaterials: stringArrayArb,
  priority: fc.constantFrom<StructuredResult['priority']>(
    'Urgent',
    'Important',
    'Informational'
  ),
  missingInformation: stringArrayArb,
})

// The seven always-present section titles, in Req 6.1 order. "Missing
// Information" is appended conditionally (only when the field is non-empty).
const BASE_SECTION_ORDER = [
  'Executive Summary',
  'What Changed',
  'Who Is Affected',
  'Important Dates',
  'Required Actions',
  'Exceptions / Exemptions',
  'Documents / Materials',
]

const RUNS = 100

describe('ResultsDashboard (property-based)', () => {
  // Property 7: Results dashboard renders all eight sections for any valid
  // result — headings appear in the required order; Missing Information is
  // hidden when empty and present when non-empty (Req 6.1, 6.6).
  it('renders sections in the required order for any valid result (Property 7)', () => {
    fc.assert(
      fc.property(structuredResultArb, (result) => {
        render(
          <ResultsDashboard result={result} error={null} isLoading={false} />
        )

        const headings = screen
          .getAllByRole('heading', { level: 2 })
          .map((h) => h.textContent)

        const expected =
          result.missingInformation.length > 0
            ? [...BASE_SECTION_ORDER, 'Missing Information']
            : [...BASE_SECTION_ORDER]

        expect(headings).toEqual(expected)

        // Explicit Req 6.6 check: hidden when empty, present when non-empty.
        const missingHeading = screen.queryByRole('heading', {
          level: 2,
          name: 'Missing Information',
        })
        if (result.missingInformation.length > 0) {
          expect(missingHeading).toBeInTheDocument()
        } else {
          expect(missingHeading).not.toBeInTheDocument()
        }

        cleanup()
      }),
      { numRuns: RUNS }
    )
  })

  // Property 8: Required actions rendered as checklist items — every item is
  // rendered with the ☐ (U+2610) prefix; empty array shows the placeholder
  // (Req 6.2, 6.8).
  it('renders every required action as a ☐-prefixed checklist item (Property 8)', () => {
    fc.assert(
      fc.property(structuredResultArb, (result) => {
        const { container } = render(
          <ResultsDashboard result={result} error={null} isLoading={false} />
        )

        if (result.requiredActions.length === 0) {
          expect(screen.getByText('No actions required')).toBeInTheDocument()
        } else {
          const items = container.querySelectorAll('.action-checklist__item')
          expect(items).toHaveLength(result.requiredActions.length)

          const boxes = container.querySelectorAll('.action-checklist__box')
          expect(boxes).toHaveLength(result.requiredActions.length)
          boxes.forEach((box) => {
            expect(box.textContent).toBe('\u2610')
          })
        }

        cleanup()
      }),
      { numRuns: RUNS }
    )
  })

  // Property 9: Date cards render all date entries — one .date-card per entry;
  // empty array shows the "No important dates identified" placeholder (Req 6.3).
  it('renders one DateCard per importantDates entry (Property 9)', () => {
    fc.assert(
      fc.property(structuredResultArb, (result) => {
        const { container } = render(
          <ResultsDashboard result={result} error={null} isLoading={false} />
        )

        if (result.importantDates.length === 0) {
          expect(
            screen.getByText('No important dates identified')
          ).toBeInTheDocument()
        } else {
          const cards = container.querySelectorAll('.date-card')
          expect(cards).toHaveLength(result.importantDates.length)
        }

        cleanup()
      }),
      { numRuns: RUNS }
    )
  })
})

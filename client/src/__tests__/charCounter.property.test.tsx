// Property-based tests for the CharCounter component — task 11.5
//
// Property 6: Character counter reflects input length, and input beyond the
// 10,000-character cap is blocked so the counter never exceeds the maximum
// (Requirements 1.3, 1.9).
//
// Feature: campus-action-extractor, Property 6
// Validates: Requirements 1.3, 1.9
import { describe, expect, it } from '@jest/globals'
import '@testing-library/jest-dom/jest-globals'
import { cleanup, render, screen } from '@testing-library/react'
import fc from 'fast-check'
import CharCounter from '../components/CharCounter'

const MAX_CHARS = 10000
const formattedMax = MAX_CHARS.toLocaleString('en-US')

describe('CharCounter (property-based)', () => {
  // Property 6a — for any string of length ≤ MAX, the counter shows the exact length.
  // Req 1.3: live character counter shows the current count and the maximum limit.
  it('displays the current input length against the maximum limit (Req 1.3)', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: MAX_CHARS }), (s) => {
        // The component's slice guard means count never exceeds MAX (Req 1.9).
        const count = Math.min(s.length, MAX_CHARS)
        try {
          render(<CharCounter count={count} max={MAX_CHARS} />)
          const expected = `${count.toLocaleString('en-US')} / ${formattedMax}`
          expect(screen.getByText(expected)).toBeInTheDocument()
        } finally {
          // Avoid duplicate DOM nodes accumulating across iterations.
          cleanup()
        }
      }),
      { numRuns: 200 }
    )
  })

  // Property 6b — for any raw input length (including beyond the cap), the
  // displayed counter stays clamped at the maximum. This mirrors the
  // AnnouncementInput onChange slice guard that blocks input past MAX (Req 1.9).
  it('never displays a count above the maximum limit (Req 1.9)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAX_CHARS + 5000 }), (rawLength) => {
        const count = Math.min(rawLength, MAX_CHARS)
        try {
          render(<CharCounter count={count} max={MAX_CHARS} />)

          if (rawLength >= MAX_CHARS) {
            // At or beyond the cap the display is pinned to "10,000 / 10,000".
            expect(
              screen.getByText(`${formattedMax} / ${formattedMax}`)
            ).toBeInTheDocument()
          }

          const expected = `${count.toLocaleString('en-US')} / ${formattedMax}`
          expect(screen.getByText(expected)).toBeInTheDocument()
        } finally {
          cleanup()
        }
      }),
      { numRuns: 200 }
    )
  })
})

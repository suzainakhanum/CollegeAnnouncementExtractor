// Feature: campus-action-extractor, Property 1
// Validates: Requirements 2.3, 2.4, 4.7

import * as fc from 'fast-check';
import { validateInput } from '../utils/validateInput';
import { InputValidationError } from '../types';

const MIN_LENGTH = 20;
const MAX_LENGTH = 10_000;

/**
 * Property 1: Input validation rejects all non-conforming announcements.
 *
 * For any string that is empty, whitespace-only, shorter than 20 characters,
 * or longer than 10,000 characters, validateInput() must throw InputValidationError.
 *
 * Conversely, any string of length 20–10,000 whose trimmed length is ≥ 1
 * must NOT throw.
 */
describe('Property 1 — validateInput rejects all non-conforming announcements', () => {

  // ─── Invalid inputs ──────────────────────────────────────────────────────

  it('throws InputValidationError for non-string values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.float(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.object(),
          fc.array(fc.string()),
        ),
        (value) => {
          expect(() => validateInput(value)).toThrow(InputValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throws InputValidationError for the empty string', () => {
    expect(() => validateInput('')).toThrow(InputValidationError);
  });

  it('throws InputValidationError for whitespace-only strings', () => {
    // Generate strings composed entirely of whitespace characters.
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), {
          minLength: 1,
          maxLength: MAX_LENGTH,
        }),
        (whitespace) => {
          expect(() => validateInput(whitespace)).toThrow(InputValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throws InputValidationError for strings shorter than 20 characters (non-empty, non-whitespace)', () => {
    // fc.ascii() generates single printable ASCII characters (codes 0x20–0x7e).
    // We filter to ensure at least one non-whitespace char so the "too short"
    // branch is exercised rather than the "whitespace-only" branch.
    fc.assert(
      fc.property(
        fc
          .stringOf(fc.ascii(), { minLength: 1, maxLength: MIN_LENGTH - 1 })
          .filter((s) => s.trim().length > 0),
        (shortString) => {
          expect(() => validateInput(shortString)).toThrow(InputValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('throws InputValidationError for strings longer than 10,000 characters', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.ascii(), {
          minLength: MAX_LENGTH + 1,
          maxLength: MAX_LENGTH + 2_000,
        }),
        (longString) => {
          expect(() => validateInput(longString)).toThrow(InputValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ─── Valid inputs ─────────────────────────────────────────────────────────

  it('does NOT throw for any string of length 20–10,000 with at least one non-whitespace character', () => {
    // Strategy:
    //   1. Pick a target length in [20, 10000].
    //   2. Build a string of that exact length using ascii chars.
    //   3. Guarantee at least one non-whitespace character so trim() > 0.
    fc.assert(
      fc.property(
        fc
          .integer({ min: MIN_LENGTH, max: MAX_LENGTH })
          .chain((targetLen) =>
            fc.tuple(
              // One non-whitespace ascii char as the anchor.
              fc.ascii().filter((c) => c.trim().length > 0),
              // Remaining ascii chars to pad to targetLen - 1.
              fc.stringOf(fc.ascii(), {
                minLength: targetLen - 1,
                maxLength: targetLen - 1,
              }),
            )
          )
          .map(([anchor, padding]) => anchor + padding)
          .filter(
            (s) =>
              s.length >= MIN_LENGTH &&
              s.length <= MAX_LENGTH &&
              s.trim().length > 0,
          ),
        (validString) => {
          expect(() => validateInput(validString)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});

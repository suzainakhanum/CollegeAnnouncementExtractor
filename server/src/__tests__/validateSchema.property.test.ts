// Feature: campus-action-extractor, Property 2 / 3 / 4
// Validates: Requirements 5.1, 5.2, 5.6, 3.6

import * as fc from 'fast-check';
import { validateSchema } from '../utils/validateSchema';
import { SchemaValidationError, StructuredResult } from '../types/index';

// ── Arbitraries ────────────────────────────────────────────────────────────────

const VALID_PRIORITIES = ['Urgent', 'Important', 'Informational'] as const;

/** Arbitrary for a valid DateEntry object. */
const dateEntryArb = fc.oneof(
  // Without optional "status" field.
  fc.record({
    date: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    event: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  }),
  // With a non-empty string "status" field.
  fc.record({
    date: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    event: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    status: fc.string({ minLength: 1, maxLength: 50 }),
  }),
);

/** Arbitrary for a valid StructuredResult. */
const validResultArb: fc.Arbitrary<StructuredResult> = fc.record({
  summary: fc.string({ minLength: 1, maxLength: 500 }),
  whatChanged: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
  whoIsAffected: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
  importantDates: fc.array(dateEntryArb, { maxLength: 5 }),
  requiredActions: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
  exceptions: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
  documentsOrMaterials: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
  priority: fc.constantFrom(...VALID_PRIORITIES),
  missingInformation: fc.array(fc.string({ minLength: 1 }), { maxLength: 10 }),
});

/**
 * Arbitrary for a non-array value (used to replace array fields with wrong types).
 * Excludes null/undefined since those produce a different "missing field" error.
 */
const nonArrayArb = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.record({ notAnArray: fc.constant(true) }),
);

// The 9 required top-level fields of StructuredResult.
const REQUIRED_FIELDS = [
  'summary',
  'whatChanged',
  'whoIsAffected',
  'importantDates',
  'requiredActions',
  'exceptions',
  'documentsOrMaterials',
  'priority',
  'missingInformation',
] as const;

// The array-typed fields.
const ARRAY_FIELDS = [
  'whatChanged',
  'whoIsAffected',
  'importantDates',
  'requiredActions',
  'exceptions',
  'documentsOrMaterials',
  'missingInformation',
] as const;

// ── Property 2: Schema validation rejects any AI response missing a required field ──

describe('Property 2: Schema validation rejects objects with missing required fields', () => {
  test('throws SchemaValidationError when one required field is removed', () => {
    // Generate a valid result then remove a subset of fields.
    fc.assert(
      fc.property(
        validResultArb,
        // Pick at least one field to remove (1–9 fields).
        fc.subarray(REQUIRED_FIELDS as unknown as string[], { minLength: 1 }),
        (validResult, fieldsToRemove) => {
          const incomplete: Record<string, unknown> = { ...validResult };
          for (const field of fieldsToRemove) {
            delete incomplete[field];
          }

          expect(() => validateSchema(incomplete)).toThrow(SchemaValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('passes validation for a fully populated valid result', () => {
    fc.assert(
      fc.property(validResultArb, (validResult) => {
        expect(() => validateSchema(validResult)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 3: Schema validation rejects type mismatches in array fields ─────

describe('Property 3: Schema validation rejects type mismatches in array fields', () => {
  test('throws SchemaValidationError when an array field contains a non-array value', () => {
    fc.assert(
      fc.property(
        validResultArb,
        // Pick one array field to corrupt.
        fc.constantFrom(...ARRAY_FIELDS),
        nonArrayArb,
        (validResult, arrayField, nonArrayValue) => {
          const corrupted: Record<string, unknown> = {
            ...validResult,
            [arrayField]: nonArrayValue,
          };

          expect(() => validateSchema(corrupted)).toThrow(SchemaValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('throws SchemaValidationError when summary is not a string', () => {
    fc.assert(
      fc.property(
        validResultArb,
        // Replace summary with a non-string value.
        fc.oneof(fc.integer(), fc.boolean(), fc.array(fc.string())),
        (validResult, badSummary) => {
          const corrupted: Record<string, unknown> = {
            ...validResult,
            summary: badSummary,
          };

          expect(() => validateSchema(corrupted)).toThrow(SchemaValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 4: Priority classification covers all valid announcements ─────────

describe('Property 4: Priority classification covers all valid announcements', () => {
  test('validateSchema returns a result whose priority is one of the three allowed values', () => {
    fc.assert(
      fc.property(validResultArb, (validResult) => {
        const result = validateSchema(validResult);
        expect(VALID_PRIORITIES).toContain(result.priority);
      }),
      { numRuns: 100 },
    );
  });

  test('throws SchemaValidationError when priority is an invalid value', () => {
    // Generate strings that are NOT one of the three valid priorities.
    const invalidPriorityArb = fc
      .string()
      .filter((s) => !(VALID_PRIORITIES as readonly string[]).includes(s));

    fc.assert(
      fc.property(validResultArb, invalidPriorityArb, (validResult, badPriority) => {
        const corrupted: Record<string, unknown> = {
          ...validResult,
          priority: badPriority,
        };

        expect(() => validateSchema(corrupted)).toThrow(SchemaValidationError);
      }),
      { numRuns: 100 },
    );
  });

  test('throws SchemaValidationError when priority is a non-string type', () => {
    fc.assert(
      fc.property(
        validResultArb,
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.array(fc.string())),
        (validResult, badPriority) => {
          const corrupted: Record<string, unknown> = {
            ...validResult,
            priority: badPriority,
          };

          expect(() => validateSchema(corrupted)).toThrow(SchemaValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Additional edge-case tests ─────────────────────────────────────────────────

describe('Edge cases for validateSchema', () => {
  test('throws SchemaValidationError when raw input is not an object', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        (primitive) => {
          expect(() => validateSchema(primitive)).toThrow(SchemaValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });

  test('throws SchemaValidationError when importantDates contains malformed entries', () => {
    fc.assert(
      fc.property(
        validResultArb,
        // An entry missing "date" or "event" string field.
        fc.oneof(
          fc.record({ event: fc.string({ minLength: 1 }) }), // missing "date"
          fc.record({ date: fc.string({ minLength: 1 }) }),  // missing "event"
          fc.record({
            date: fc.constant(''),  // empty date
            event: fc.string({ minLength: 1 }),
          }),
          fc.record({
            date: fc.string({ minLength: 1 }),
            event: fc.constant(''), // empty event
          }),
        ),
        (validResult, badEntry) => {
          const corrupted: Record<string, unknown> = {
            ...validResult,
            importantDates: [badEntry],
          };

          expect(() => validateSchema(corrupted)).toThrow(SchemaValidationError);
        },
      ),
      { numRuns: 100 },
    );
  });
});

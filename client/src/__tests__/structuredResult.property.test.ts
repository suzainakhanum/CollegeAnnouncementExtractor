// Feature: campus-action-extractor, Property 10
// Validates: Requirements 5.1, 3.2

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import { StructuredResult, DateEntry } from '../types';

// ── Local copy of validateSchema ────────────────────────────────────────────
// The canonical implementation lives in the server at
// `/server/src/utils/validateSchema.ts`. Importing across package roots from
// the client test project is awkward, so we duplicate a minimal equivalent here
// (per the task note: "imported from server utils or duplicated for client
// test"). It performs the same structural checks:
//   - all 9 required fields present
//   - array fields are actual arrays
//   - priority is one of the 3 allowed values
//   - importantDates entries have non-empty string `date` and `event`

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

const ARRAY_FIELDS = [
  'whatChanged',
  'whoIsAffected',
  'importantDates',
  'requiredActions',
  'exceptions',
  'documentsOrMaterials',
  'missingInformation',
] as const;

const VALID_PRIORITIES = ['Urgent', 'Important', 'Informational'] as const;

class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

function validateSchema(raw: unknown): StructuredResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SchemaValidationError('AI response is not a valid JSON object.');
  }

  const obj = raw as Record<string, unknown>;

  const missingFields = REQUIRED_FIELDS.filter(
    (field) => !(field in obj) || obj[field] === undefined,
  );
  if (missingFields.length > 0) {
    throw new SchemaValidationError(
      `AI response is missing required fields: ${missingFields.join(', ')}.`,
    );
  }

  if (typeof obj['summary'] !== 'string') {
    throw new SchemaValidationError('Field "summary" must be a string.');
  }

  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(obj[field])) {
      throw new SchemaValidationError(
        `Field "${field}" must be an array but received ${typeof obj[field]}.`,
      );
    }
  }

  if (!(VALID_PRIORITIES as readonly unknown[]).includes(obj['priority'])) {
    throw new SchemaValidationError(
      `Field "priority" must be one of "Urgent", "Important", or "Informational".`,
    );
  }

  const importantDates = obj['importantDates'] as unknown[];
  importantDates.forEach((entry, index) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new SchemaValidationError(
        `importantDates[${index}] must be an object with "date" and "event" fields.`,
      );
    }
    const dateEntry = entry as Record<string, unknown>;
    if (typeof dateEntry['date'] !== 'string' || dateEntry['date'].trim() === '') {
      throw new SchemaValidationError(
        `importantDates[${index}].date must be a non-empty string.`,
      );
    }
    if (typeof dateEntry['event'] !== 'string' || dateEntry['event'].trim() === '') {
      throw new SchemaValidationError(
        `importantDates[${index}].event must be a non-empty string.`,
      );
    }
    if ('status' in dateEntry && typeof dateEntry['status'] !== 'string') {
      throw new SchemaValidationError(
        `importantDates[${index}].status must be a string when present.`,
      );
    }
  });

  return obj as unknown as StructuredResult;
}

// ── Arbitraries ──────────────────────────────────────────────────────────────

/** Generates a non-empty (non-whitespace) string. */
const nonEmptyString = (maxLength: number): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength }).filter((s) => s.trim().length > 0);

/** Arbitrary for a valid DateEntry — `date` and `event` are non-empty strings,
 *  `status` is an optional string. */
const dateEntryArb: fc.Arbitrary<DateEntry> = fc.oneof(
  fc.record({
    date: nonEmptyString(50),
    event: nonEmptyString(100),
  }),
  fc.record({
    date: nonEmptyString(50),
    event: nonEmptyString(100),
    status: fc.string({ maxLength: 50 }),
  }),
);

/** Arbitrary for a valid StructuredResult covering all 9 fields. */
const structuredResultArb: fc.Arbitrary<StructuredResult> = fc.record({
  summary: fc.string({ maxLength: 500 }),
  whatChanged: fc.array(fc.string({ maxLength: 100 }), { maxLength: 10 }),
  whoIsAffected: fc.array(fc.string({ maxLength: 100 }), { maxLength: 10 }),
  importantDates: fc.array(dateEntryArb, { maxLength: 10 }),
  requiredActions: fc.array(fc.string({ maxLength: 100 }), { maxLength: 10 }),
  exceptions: fc.array(fc.string({ maxLength: 100 }), { maxLength: 10 }),
  documentsOrMaterials: fc.array(fc.string({ maxLength: 100 }), { maxLength: 10 }),
  priority: fc.constantFrom<StructuredResult['priority']>(
    'Urgent',
    'Important',
    'Informational',
  ),
  missingInformation: fc.array(fc.string({ maxLength: 100 }), { maxLength: 10 }),
});

// ── Property 10 ────────────────────────────────────────────────────────────────

describe('Property 10: Serialization round-trip preserves StructuredResult', () => {
  it('round-tripped result still passes validateSchema and deep-equals the original', () => {
    fc.assert(
      fc.property(structuredResultArb, (result) => {
        const roundTripped = JSON.parse(JSON.stringify(result)) as unknown;

        // Round-trip must still satisfy the output schema.
        const validated = validateSchema(roundTripped);

        // Round-trip must be structurally identical to the original.
        expect(roundTripped).toEqual(result);
        expect(validated).toEqual(result);
      }),
      { numRuns: 100 },
    );
  });
});

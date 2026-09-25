import { SchemaValidationError, StructuredResult, DateEntry } from '../types/index';

// The nine required top-level fields in a StructuredResult.
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

// Fields that must be arrays (all except summary and priority).
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

/**
 * Validates that `raw` conforms to the StructuredResult output schema.
 *
 * Returns a typed `StructuredResult` on success.
 * Throws `SchemaValidationError` if any of the following violations are found:
 *   - `raw` is not a plain object
 *   - Any of the 9 required fields is missing
 *   - An array field contains a non-array value
 *   - `priority` is not one of "Urgent" | "Important" | "Informational"
 *   - Any entry in `importantDates` is missing `date` or `event` string fields
 *
 * Requirements: 5.1, 5.6, 3.6
 */
export function validateSchema(raw: unknown): StructuredResult {
  // Must be a non-null object.
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SchemaValidationError(
      'AI response is not a valid JSON object.',
    );
  }

  const obj = raw as Record<string, unknown>;

  // ── 1. Check all required fields are present ────────────────────────────────
  const missingFields = REQUIRED_FIELDS.filter(
    (field) => !(field in obj) || obj[field] === undefined,
  );

  if (missingFields.length > 0) {
    throw new SchemaValidationError(
      `AI response is missing required fields: ${missingFields.join(', ')}.`,
    );
  }

  // ── 2. summary must be a string ─────────────────────────────────────────────
  if (typeof obj['summary'] !== 'string') {
    throw new SchemaValidationError(
      'Field "summary" must be a string.',
    );
  }

  // ── 3. Array fields must be actual arrays ───────────────────────────────────
  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(obj[field])) {
      throw new SchemaValidationError(
        `Field "${field}" must be an array but received ${typeof obj[field]}.`,
      );
    }
  }

  // ── 4. priority must be one of the three allowed values ─────────────────────
  if (!(VALID_PRIORITIES as readonly unknown[]).includes(obj['priority'])) {
    throw new SchemaValidationError(
      `Field "priority" must be one of "Urgent", "Important", or "Informational" but received "${obj['priority']}".`,
    );
  }

  // ── 5. Each importantDates entry must have string "date" and "event" fields ─
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

    // status is optional; if present it must be a string.
    if ('status' in dateEntry && typeof dateEntry['status'] !== 'string') {
      throw new SchemaValidationError(
        `importantDates[${index}].status must be a string when present.`,
      );
    }
  });

  // All checks passed — cast to StructuredResult.
  return obj as unknown as StructuredResult;
}

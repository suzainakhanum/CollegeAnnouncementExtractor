// ── Data shapes (mirrored from client/src/types/index.ts) ────────────────────

export interface DateEntry {
  date: string;
  event: string;
  status?: string;
}

export interface StructuredResult {
  summary: string;
  whatChanged: string[];
  whoIsAffected: string[];
  importantDates: DateEntry[];
  requiredActions: string[];
  exceptions: string[];
  documentsOrMaterials: string[];
  priority: 'Urgent' | 'Important' | 'Informational';
  missingInformation: string[];
}

// ── API contract shapes ───────────────────────────────────────────────────────

export interface AnalyzeRequestBody {
  announcement: string;
}

export interface AnalyzeSuccessResponse {
  result: StructuredResult;
}

export interface AnalyzeErrorResponse {
  error: string;
}

// ── Custom error hierarchy ────────────────────────────────────────────────────

/**
 * Thrown when the incoming announcement text fails the character-range guard
 * (missing, empty, whitespace-only, < 20 chars, or > 10,000 chars).
 * Maps to HTTP 400 in the route handler.
 *
 * Requirements: 2.3, 2.4
 */
export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputValidationError';
    // Restore prototype chain broken by transpilation to ES5.
    Object.setPrototypeOf(this, InputValidationError.prototype);
  }
}

/**
 * Thrown when the AI model response does not conform to the required output
 * schema (missing fields, wrong types, or non-JSON payload).
 * Maps to HTTP 500 in the route handler.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }
}

/**
 * Base class for all errors that originate from the AI provider layer.
 * Never thrown directly — always one of its concrete subtypes.
 *
 * Requirements: 5.2, 5.3, 5.4, 5.5
 */
export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtractionError';
    Object.setPrototypeOf(this, ExtractionError.prototype);
  }
}

/**
 * Thrown when the AI provider is unreachable or returns a network-level error.
 * Maps to HTTP 502 in the route handler.
 *
 * Requirement: 5.5
 */
export class NetworkError extends ExtractionError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Thrown when the AI provider request exceeds the 30-second timeout.
 * Maps to HTTP 503 in the route handler.
 *
 * Requirement: 2.5
 */
export class TimeoutError extends ExtractionError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Thrown when the AI provider returns a rate-limit response (HTTP 429).
 * Maps to HTTP 429 in the route handler.
 *
 * Requirement: 5.4
 */
export class RateLimitError extends ExtractionError {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

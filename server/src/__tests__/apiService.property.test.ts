// Feature: campus-action-extractor, Property 5
// Property-based tests for error response safety on the /api/analyze route.
// Validates: Requirements 2.6, 5.2, 5.3, 7.8

// Mock the extraction service so error scenarios can be simulated without any
// real network calls. Each test controls what `analyze()` resolves or rejects.
jest.mock('../services/extractionService');

// Silence server-side error logging so test output stays clean. `logError`
// is called for every 5xx response — we assert on the HTTP body, not stdout.
jest.mock('../utils/logger');

import fc from 'fast-check';
import request from 'supertest';
import app from '../app';
import { analyze } from '../services/extractionService';
import {
  SchemaValidationError,
  NetworkError,
  TimeoutError,
  RateLimitError,
} from '../types/index';

const mockedAnalyze = analyze as jest.MockedFunction<typeof analyze>;

// A representative secret value that must NEVER appear in any response body.
const SECRET_API_KEY = 'sk-super-secret-api-key-1234567890';

// Raw AI output that a leak would expose. Errors carry this text so we can
// assert it is stripped from every client-facing response.
const RAW_AI_OUTPUT =
  '{"leaked":"raw ai response with internal reasoning and ' + SECRET_API_KEY + '"}';

/**
 * Asserts that an error response body is safe:
 *  - contains ONLY an `error` field of type string
 *  - never leaks the API key, a stack trace, or raw AI output
 */
function assertSafeErrorBody(body: unknown): void {
  expect(body).not.toBeNull();
  expect(typeof body).toBe('object');

  const record = body as Record<string, unknown>;

  // Only the `error` key is permitted.
  expect(Object.keys(record)).toEqual(['error']);
  expect(typeof record.error).toBe('string');

  // No internal detail keys anywhere in the payload.
  const serialized = JSON.stringify(record);
  expect(serialized).not.toContain(SECRET_API_KEY);
  expect(serialized).not.toContain('AI_API_KEY');
  expect(serialized).not.toContain('stack');
  expect(serialized).not.toContain('at Object.');
  expect(serialized).not.toContain(RAW_AI_OUTPUT);
  expect(serialized.toLowerCase()).not.toContain('leaked');
}

describe('Property 5: error responses contain no internal details', () => {
  beforeEach(() => {
    mockedAnalyze.mockReset();
  });

  it('returns a safe HTTP 400 body for any invalid input (missing/empty/too short/too long/non-string)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // Empty or whitespace-only strings.
          fc.constantFrom('', '   ', '\n\t  '),
          // Too-short strings: 0–19 characters.
          fc.string({ maxLength: 19 }),
          // Too-long strings: strictly greater than 10,000 characters.
          fc
            .string({ minLength: 10_001, maxLength: 10_050 }),
          // Non-string values.
          fc.oneof(
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
            fc.array(fc.ascii()),
            fc.record({ nested: fc.string() }),
          ),
        ),
        async (announcement) => {
          const res = await request(app)
            .post('/api/analyze')
            .send({ announcement });

          // The service must never be reached for invalid input.
          expect(mockedAnalyze).not.toHaveBeenCalled();
          expect(res.status).toBe(400);
          assertSafeErrorBody(res.body);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns a safe error body for any extraction-layer failure (500/502/503/429)', async () => {
    // Each scenario pairs an error the service throws with the HTTP status the
    // route must map it to. The error messages embed secrets / raw AI output
    // to prove those internals never reach the client.
    const scenarios = [
      {
        status: 500,
        makeError: () =>
          new SchemaValidationError(
            'Missing fields; raw AI output was ' + RAW_AI_OUTPUT,
          ),
      },
      {
        status: 502,
        makeError: () =>
          new NetworkError('Network failure calling ' + SECRET_API_KEY),
      },
      {
        status: 503,
        makeError: () =>
          new TimeoutError('Timed out; key=' + SECRET_API_KEY),
      },
      {
        status: 429,
        makeError: () =>
          new RateLimitError('Rate limited; key=' + SECRET_API_KEY),
      },
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...scenarios),
        // A valid announcement (20–10,000 chars) so input validation passes
        // and the route delegates to the mocked extraction service.
        fc.string({ minLength: 20, maxLength: 500 }).map((s) => s + '.padding announcement text'),
        async (scenario, announcement) => {
          mockedAnalyze.mockReset();
          mockedAnalyze.mockRejectedValueOnce(scenario.makeError());

          const res = await request(app)
            .post('/api/analyze')
            .send({ announcement });

          expect(res.status).toBe(scenario.status);
          assertSafeErrorBody(res.body);
        },
      ),
      { numRuns: 100 },
    );
  });
});

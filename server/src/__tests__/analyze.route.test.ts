// Feature: campus-action-extractor
// Unit tests for the POST /api/analyze route.
// Validates: Requirements 2.3, 2.4, 2.5, 2.6, 5.2, 5.3, 5.4, 5.5, 7.8

// Mock the extraction service so that no real AI calls happen. Each test
// controls what `analyze()` resolves to or rejects with.
jest.mock('../services/extractionService');

import request from 'supertest';
import app from '../app';
import { analyze } from '../services/extractionService';
import {
  StructuredResult,
  SchemaValidationError,
  NetworkError,
  TimeoutError,
  RateLimitError,
} from '../types/index';

// Typed handle to the mocked service function.
const mockedAnalyze = analyze as jest.MockedFunction<typeof analyze>;

// A fully valid StructuredResult used as the happy-path service result.
const VALID_RESULT: StructuredResult = {
  summary: 'Test summary',
  whatChanged: ['Change 1'],
  whoIsAffected: ['All students'],
  importantDates: [{ date: '2025-01-01', event: 'Deadline', status: 'Due' }],
  requiredActions: ['Submit form'],
  exceptions: ['Exempt group'],
  documentsOrMaterials: ['Student ID'],
  priority: 'Important',
  missingInformation: [],
};

// A valid announcement string (>= 20 and <= 10,000 chars) for success/error
// cases where input validation must pass so the service is reached.
const VALID_ANNOUNCEMENT =
  'Classes are cancelled on Monday due to scheduled maintenance work.';

/**
 * Asserts that an error-response body is "safe": it exposes only an `error`
 * string field and leaks no internal details (stack traces, API keys, etc.).
 */
function assertSafeErrorBody(body: unknown): void {
  expect(body && typeof body === 'object').toBe(true);
  const record = body as Record<string, unknown>;

  // Exactly one key: `error`, and it must be a string.
  expect(Object.keys(record)).toEqual(['error']);
  expect(typeof record.error).toBe('string');

  // Serialized body must not contain internal detail markers.
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/stack/i);
  expect(serialized).not.toMatch(/AI_API_KEY/i);
  expect(serialized).not.toMatch(/at Object\./); // stack-frame signature
}

describe('POST /api/analyze', () => {
  beforeEach(() => {
    mockedAnalyze.mockReset();
  });

  // ── Input validation → HTTP 400 (Requirements 2.3, 2.4, 2.6, 7.8) ──────────

  it('returns 400 with a safe error body when announcement is empty', async () => {
    // Requirements: 2.3, 2.6, 7.8
    const res = await request(app).post('/api/analyze').send({ announcement: '' });

    expect(res.status).toBe(400);
    assertSafeErrorBody(res.body);
    // The service must never be called when input validation fails.
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it('returns 400 when announcement is missing entirely', async () => {
    // Requirements: 2.3
    const res = await request(app).post('/api/analyze').send({});

    expect(res.status).toBe(400);
    assertSafeErrorBody(res.body);
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it('returns 400 when announcement is shorter than 20 characters', async () => {
    // Requirements: 2.4
    const res = await request(app)
      .post('/api/analyze')
      .send({ announcement: 'too short' });

    expect(res.status).toBe(400);
    assertSafeErrorBody(res.body);
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  it('returns 400 when announcement is longer than 10,000 characters', async () => {
    // Requirements: 2.4
    const res = await request(app)
      .post('/api/analyze')
      .send({ announcement: 'a'.repeat(10_001) });

    expect(res.status).toBe(400);
    assertSafeErrorBody(res.body);
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });

  // ── Service error mapping (Requirements 5.2, 5.3, 5.4, 5.5, 2.5, 2.6, 7.8) ──

  it('returns 500 with no internal details when the service throws SchemaValidationError', async () => {
    // Requirements: 5.2, 5.3, 2.6, 7.8
    mockedAnalyze.mockRejectedValueOnce(
      new SchemaValidationError('Missing field: summary'),
    );

    const res = await request(app)
      .post('/api/analyze')
      .send({ announcement: VALID_ANNOUNCEMENT });

    expect(res.status).toBe(500);
    assertSafeErrorBody(res.body);
    // The internal detail from the thrown error must not leak.
    expect(JSON.stringify(res.body)).not.toContain('summary');
  });

  it('returns 502 when the service throws NetworkError', async () => {
    // Requirements: 5.5
    mockedAnalyze.mockRejectedValueOnce(new NetworkError('Provider unreachable'));

    const res = await request(app)
      .post('/api/analyze')
      .send({ announcement: VALID_ANNOUNCEMENT });

    expect(res.status).toBe(502);
    assertSafeErrorBody(res.body);
  });

  it('returns 429 when the service throws RateLimitError', async () => {
    // Requirements: 5.4
    mockedAnalyze.mockRejectedValueOnce(new RateLimitError('Rate limited'));

    const res = await request(app)
      .post('/api/analyze')
      .send({ announcement: VALID_ANNOUNCEMENT });

    expect(res.status).toBe(429);
    assertSafeErrorBody(res.body);
  });

  it('returns 503 when the service throws TimeoutError', async () => {
    // Requirements: 2.5
    mockedAnalyze.mockRejectedValueOnce(new TimeoutError('Timed out'));

    const res = await request(app)
      .post('/api/analyze')
      .send({ announcement: VALID_ANNOUNCEMENT });

    expect(res.status).toBe(503);
    assertSafeErrorBody(res.body);
  });

  // ── Happy path → HTTP 200 (Requirement 2.2) ────────────────────────────────

  it('returns 200 with the result when the service resolves successfully', async () => {
    // Requirements: 2.2
    mockedAnalyze.mockResolvedValueOnce(VALID_RESULT);

    const res = await request(app)
      .post('/api/analyze')
      .send({ announcement: VALID_ANNOUNCEMENT });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: VALID_RESULT });
    expect(mockedAnalyze).toHaveBeenCalledTimes(1);
    expect(mockedAnalyze).toHaveBeenCalledWith(VALID_ANNOUNCEMENT);
  });
});

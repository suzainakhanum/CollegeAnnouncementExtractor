// Feature: campus-action-extractor
// Unit tests for the extraction service (real AI adapter path).
// Validates: Requirements 3.11, 5.1, 5.2, 5.3, 5.4, 5.5

// Mock the AI adapter module so no real network calls are made. Every test
// controls what `complete()` returns or throws.
jest.mock('../adapters/aiAdapter');

import { analyze } from '../services/extractionService';
import { complete } from '../adapters/aiAdapter';
import {
  StructuredResult,
  SchemaValidationError,
  NetworkError,
  RateLimitError,
} from '../types/index';

// Typed handle to the mocked `complete` function.
const mockedComplete = complete as jest.MockedFunction<typeof complete>;

// A fully valid StructuredResult, used as the happy-path AI response.
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

describe('extractionService.analyze (real AI adapter)', () => {
  // These tests exercise the REAL adapter path, which is only selected when
  // AI_API_KEY is configured. Set it here and restore the environment after.
  const originalKey = process.env.AI_API_KEY;

  beforeEach(() => {
    mockedComplete.mockReset();
    process.env.AI_API_KEY = 'test-key-so-real-adapter-is-selected';
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.AI_API_KEY;
    } else {
      process.env.AI_API_KEY = originalKey;
    }
  });

  it('returns a validated StructuredResult when the AI returns valid JSON', async () => {
    // Requirements: 5.1
    mockedComplete.mockResolvedValueOnce(JSON.stringify(VALID_RESULT));

    const result = await analyze('A valid college announcement text.');

    expect(result).toEqual(VALID_RESULT);
    expect(mockedComplete).toHaveBeenCalledTimes(1);
  });

  it('throws SchemaValidationError when the AI returns malformed JSON', async () => {
    // Requirements: 5.3
    mockedComplete.mockResolvedValueOnce('not json at all');

    await expect(
      analyze('A valid college announcement text.'),
    ).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('throws SchemaValidationError when the AI response is missing required fields', async () => {
    // Requirements: 5.1, 5.2
    const incomplete = {
      summary: 'Only a summary is present',
      // All other required fields intentionally omitted.
    };
    mockedComplete.mockResolvedValueOnce(JSON.stringify(incomplete));

    await expect(
      analyze('A valid college announcement text.'),
    ).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('propagates a NetworkError thrown by the AI adapter', async () => {
    // Requirements: 3.11, 5.5
    mockedComplete.mockRejectedValueOnce(
      new NetworkError('Could not reach the AI provider.'),
    );

    await expect(
      analyze('A valid college announcement text.'),
    ).rejects.toBeInstanceOf(NetworkError);
  });

  it('propagates a RateLimitError thrown by the AI adapter', async () => {
    // Requirements: 3.11, 5.4
    mockedComplete.mockRejectedValueOnce(
      new RateLimitError('Rate limit exceeded.'),
    );

    await expect(
      analyze('A valid college announcement text.'),
    ).rejects.toBeInstanceOf(RateLimitError);
  });
});

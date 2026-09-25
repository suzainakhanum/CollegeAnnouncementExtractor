// Feature: campus-action-extractor
// Tests for AI-provider selection and the local demo fallback.
// Validates: Requirements 9.1, 9.2, 3.1, 5.1

// Mock the REAL adapter so we can detect whether it was used, and prove the
// mock adapter is used instead when no key is configured. The mock adapter is
// intentionally NOT mocked so the real deterministic fallback runs end to end.
jest.mock('../adapters/aiAdapter');

import { analyze, selectProvider } from '../services/extractionService';
import { complete as realComplete } from '../adapters/aiAdapter';
import { validateSchema } from '../utils/validateSchema';

const mockedRealComplete = realComplete as jest.MockedFunction<typeof realComplete>;

const SAMPLE =
  'All first-year students must register for orientation by September 1. ' +
  'Bring your student ID to the welcome session.';

describe('extractionService provider selection', () => {
  const originalKey = process.env.AI_API_KEY;

  beforeEach(() => {
    mockedRealComplete.mockReset();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.AI_API_KEY;
    } else {
      process.env.AI_API_KEY = originalKey;
    }
  });

  it('selects the mock provider when AI_API_KEY is missing', () => {
    delete process.env.AI_API_KEY;
    expect(selectProvider().usingMock).toBe(true);
  });

  it('selects the mock provider when AI_API_KEY is blank', () => {
    process.env.AI_API_KEY = '   ';
    expect(selectProvider().usingMock).toBe(true);
  });

  it('selects the real provider when AI_API_KEY is configured', () => {
    process.env.AI_API_KEY = 'a-real-key';
    expect(selectProvider().usingMock).toBe(false);
  });

  it('uses the local demo extractor (not the real adapter) when no key is set', async () => {
    delete process.env.AI_API_KEY;

    const result = await analyze(SAMPLE);

    // The real adapter must never be called in fallback mode.
    expect(mockedRealComplete).not.toHaveBeenCalled();
    // Output conforms to the same schema as a real response.
    expect(() => validateSchema(result)).not.toThrow();
    // Deterministic, content-aware extraction from the sample.
    expect(result.requiredActions.join(' ').toLowerCase()).toContain('must');
    expect(result.importantDates.map((d) => d.date)).toContain('September 1');
  });

  it('routes to the real adapter when a key IS configured', async () => {
    process.env.AI_API_KEY = 'a-real-key';
    mockedRealComplete.mockResolvedValueOnce(
      JSON.stringify({
        summary: 's',
        whatChanged: [],
        whoIsAffected: [],
        importantDates: [],
        requiredActions: [],
        exceptions: [],
        documentsOrMaterials: [],
        priority: 'Informational',
        missingInformation: [],
      }),
    );

    await analyze(SAMPLE);

    expect(mockedRealComplete).toHaveBeenCalledTimes(1);
  });
});

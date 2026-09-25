import { buildPrompt } from '../utils/buildPrompt';
import { validateSchema } from '../utils/validateSchema';
import * as aiAdapter from '../adapters/aiAdapter';
import * as mockAdapter from '../adapters/mockAdapter';
import {
  StructuredResult,
  SchemaValidationError,
  NetworkError,
  TimeoutError,
  RateLimitError,
} from '../types/index';
import { logError } from '../utils/logger';

/**
 * A minimal AI-provider adapter contract. Both the real `aiAdapter` and the
 * local `mockAdapter` satisfy this shape, so the extraction pipeline is
 * identical regardless of which one is active.
 */
export interface AiProvider {
  complete(prompt: string): Promise<string>;
}

/**
 * Selects the extraction provider based on runtime configuration.
 *
 * When `AI_API_KEY` is present and non-empty, the real AI adapter is used.
 * When it is missing/blank (e.g. local demo without credentials), a local,
 * deterministic mock adapter is used instead so the application keeps working
 * and returns the same StructuredResult JSON format. The real adapter is never
 * removed and is chosen automatically as soon as a key is configured.
 *
 * Requirements: 9.1, 9.2, 3.1, 5.1
 */
export function selectProvider(): { provider: AiProvider; usingMock: boolean } {
  const apiKey = process.env.AI_API_KEY;
  const hasKey = typeof apiKey === 'string' && apiKey.trim().length > 0;
  return hasKey
    ? { provider: aiAdapter, usingMock: false }
    : { provider: mockAdapter, usingMock: true };
}

/**
 * Analyzes a college announcement and returns a validated structured result.
 *
 * Flow (unchanged contract):
 *  1. Build the AI prompt from the raw announcement text.
 *  2. Send the prompt to the active provider (real AI adapter, or the local
 *     deterministic mock adapter when no AI_API_KEY is configured).
 *  3. Parse the raw response string as JSON; throw `SchemaValidationError`
 *     if JSON parsing fails.
 *  4. Validate the parsed object against the output schema.
 *
 * All AI provider errors (NetworkError, TimeoutError, RateLimitError) are
 * re-thrown as-is so the route handler can map them to HTTP status codes.
 *
 * Requirements: 3.1, 3.2, 3.11, 5.1, 5.3, 9.1
 */
export async function analyze(announcement: string): Promise<StructuredResult> {
  // 1. Build the structured extraction prompt.
  const prompt = buildPrompt(announcement);

  // 2. Select and call the active provider.
  const { provider, usingMock } = selectProvider();

  let rawResponse: string;
  try {
    rawResponse = await provider.complete(prompt);
  } catch (err) {
    if (
      err instanceof NetworkError ||
      err instanceof TimeoutError ||
      err instanceof RateLimitError
    ) {
      throw err;
    }
    throw new NetworkError(
      'An unexpected error occurred while communicating with the AI provider.'
    );
  }

  // 3. Parse the JSON response.
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    logError(
      `extractionService.analyze - JSON parse failure (usingMock=${usingMock})`,
      rawResponse
    );
    throw new SchemaValidationError(
      'The AI response could not be parsed as valid JSON.'
    );
  }

  // 4. Validate the parsed object against the output schema.
  return validateSchema(parsed);
}

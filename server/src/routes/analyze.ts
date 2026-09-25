import { Router, Request, Response } from 'express';
import { validateInput } from '../utils/validateInput';
import { analyze } from '../services/extractionService';
import { logError } from '../utils/logger';
import {
  AnalyzeRequestBody,
  AnalyzeSuccessResponse,
  AnalyzeErrorResponse,
  InputValidationError,
  SchemaValidationError,
  NetworkError,
  TimeoutError,
  RateLimitError,
} from '../types/index';

/**
 * Router for the `POST /api/analyze` endpoint.
 *
 * Flow:
 *  1. Validate the incoming `announcement` field with `validateInput()`.
 *     An `InputValidationError` maps to HTTP 400 with a safe message.
 *  2. Delegate extraction to `extractionService.analyze()`.
 *     On success respond with HTTP 200 and `{ result }`.
 *  3. Map typed AI-layer / schema errors to safe HTTP responses:
 *       - NetworkError        → 502
 *       - TimeoutError        → 503
 *       - RateLimitError      → 429
 *       - SchemaValidationError → 500
 *
 * Every 5xx response is logged server-side via `logError()`. No API key,
 * stack trace, or raw AI response is ever written to the HTTP response body.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.2, 5.3, 5.4, 5.5
 */
const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { announcement } = (req.body ?? {}) as Partial<AnalyzeRequestBody>;

  // ── 1. Input validation (HTTP 400) ─────────────────────────────────────────
  try {
    validateInput(announcement);
  } catch (err) {
    if (err instanceof InputValidationError) {
      const body: AnalyzeErrorResponse = { error: err.message };
      return res.status(400).json(body);
    }
    // Unexpected validation-layer error — treat as an internal failure.
    logError('analyze route — unexpected validation error', err);
    const body: AnalyzeErrorResponse = {
      error: 'Analysis could not be completed. Please try again.',
    };
    return res.status(500).json(body);
  }

  // ── 2. Extraction + 3. Error mapping ────────────────────────────────────────
  try {
    const result = await analyze(announcement as string);
    const body: AnalyzeSuccessResponse = { result };
    return res.status(200).json(body);
  } catch (err) {
    // NetworkError → 502
    if (err instanceof NetworkError) {
      logError('analyze route — NetworkError', err);
      const body: AnalyzeErrorResponse = {
        error: 'Analysis service is currently unavailable. Please try again.',
      };
      return res.status(502).json(body);
    }

    // TimeoutError → 503
    if (err instanceof TimeoutError) {
      logError('analyze route — TimeoutError', err);
      const body: AnalyzeErrorResponse = {
        error: 'Analysis service timed out. Please try again.',
      };
      return res.status(503).json(body);
    }

    // RateLimitError → 429
    if (err instanceof RateLimitError) {
      // 429 is not a 5xx, but logging aids observability of provider limits.
      logError('analyze route — RateLimitError', err);
      const body: AnalyzeErrorResponse = {
        error: 'Request limit reached. Please try again later.',
      };
      return res.status(429).json(body);
    }

    // SchemaValidationError → 500
    if (err instanceof SchemaValidationError) {
      logError('analyze route — SchemaValidationError', err);
      const body: AnalyzeErrorResponse = {
        error: 'Analysis could not be completed. Please try again.',
      };
      return res.status(500).json(body);
    }

    // Any other unexpected error → 500 (no internal details leaked).
    logError('analyze route — unexpected error', err);
    const body: AnalyzeErrorResponse = {
      error: 'Analysis could not be completed. Please try again.',
    };
    return res.status(500).json(body);
  }
});

export default router;

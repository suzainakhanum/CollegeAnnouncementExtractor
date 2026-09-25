// Frontend API service — implemented in task 8.1
//
// Wraps the Fetch API with a 30-second AbortController timeout and maps every
// failure mode to a typed AppError carrying only a safe, user-facing message.
// No stack traces, raw server bodies, or fields outside AnalyzeErrorResponse
// are ever surfaced to the caller (Requirements 7.3–7.8).
import type {
  AnalyzeSuccessResponse,
  AnalyzeErrorResponse,
  AppError,
} from '../types'

export interface AnalyzeRequest {
  announcement: string
}

export type AnalyzeResponse = AnalyzeSuccessResponse

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Submit an announcement to the backend for analysis.
 *
 * @throws {AppError} on timeout, network failure, or any non-2xx HTTP response.
 *   The thrown object always conforms to `{ code: number; message: string }`
 *   and never contains internal error details.
 */
export async function analyzeAnnouncement(
  req: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw await mapErrorResponse(response)
    }

    return (await response.json()) as AnalyzeResponse
  } catch (err) {
    // Timeout: AbortController fires an AbortError.
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw makeError(408, 'Request timed out. Please try again.')
    }
    // Network failure: fetch rejects with a TypeError before any response.
    if (err instanceof TypeError) {
      throw makeError(
        0,
        'Could not connect. Check your connection and retry.'
      )
    }
    // Already-mapped AppError (from mapErrorResponse) — re-throw as-is.
    if (isAppError(err)) {
      throw err
    }
    // Any other unexpected failure gets a generic, safe message.
    throw makeError(0, 'Analysis could not be completed. Please try again.')
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Translate a non-2xx HTTP response into a safe AppError. Only HTTP 400 uses
 * the server-provided message (validation feedback); all other codes use fixed
 * client-side messages so no internal server content is exposed.
 */
async function mapErrorResponse(response: Response): Promise<AppError> {
  switch (response.status) {
    case 400: {
      const message = await readErrorMessage(response)
      return makeError(
        400,
        message ?? 'Your input is invalid. Please check and try again.'
      )
    }
    case 429:
      return makeError(429, 'Request limit reached. Please try again later.')
    case 500:
    case 502:
      return makeError(
        response.status,
        'Analysis could not be completed. Please try again.'
      )
    case 503:
      return makeError(503, 'Service temporarily unavailable. Please try again.')
    default:
      return makeError(
        response.status,
        'Analysis could not be completed. Please try again.'
      )
  }
}

/**
 * Safely read the `error` string from an AnalyzeErrorResponse body. Returns
 * undefined if the body is missing, unparseable, or lacks a string `error`
 * field — never leaks any other field.
 */
async function readErrorMessage(
  response: Response
): Promise<string | undefined> {
  try {
    const body = (await response.json()) as Partial<AnalyzeErrorResponse>
    if (body && typeof body.error === 'string') {
      return body.error
    }
  } catch {
    // Ignore parse failures — fall through to undefined.
  }
  return undefined
}

function makeError(code: number, message: string): AppError {
  return { code, message }
}

function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AppError).code === 'number' &&
    typeof (value as AppError).message === 'string'
  )
}

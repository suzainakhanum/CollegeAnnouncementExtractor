// Unit tests for the frontend apiService — task 8.3
//
// Verifies analyzeAnnouncement() maps every failure mode to a safe AppError
// and returns the parsed AnalyzeResponse on success, without leaking internal
// details (Requirements 7.3–7.7).
import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { analyzeAnnouncement } from '../services/apiService'
import type { AppError, StructuredResult } from '../types'

const VALID_REQUEST = { announcement: 'This is a valid announcement body.' }

/** Build a minimal fetch Response-like stub for a given status + JSON body. */
function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

/** Assert a thrown value is an AppError and return it typed. */
function asAppError(err: unknown): AppError {
  expect(err).toBeDefined()
  expect(typeof (err as AppError).code).toBe('number')
  expect(typeof (err as AppError).message).toBe('string')
  return err as AppError
}

describe('analyzeAnnouncement', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('maps an AbortError (timeout) to a timeout AppError', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new DOMException('Aborted', 'AbortError'))
    ) as unknown as typeof fetch

    expect.assertions(4)
    try {
      await analyzeAnnouncement(VALID_REQUEST)
    } catch (err) {
      const appError = asAppError(err)
      expect(appError.message).toBe('Request timed out. Please try again.')
    }
  })

  it('maps a TypeError (network failure) to a connection AppError', async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new TypeError('Failed to fetch'))
    ) as unknown as typeof fetch

    expect.assertions(4)
    try {
      await analyzeAnnouncement(VALID_REQUEST)
    } catch (err) {
      const appError = asAppError(err)
      expect(appError.message).toBe(
        'Could not connect. Check your connection and retry.'
      )
    }
  })

  it('maps HTTP 400 to an AppError using the body error message', async () => {
    const serverMessage = 'Announcement must be 20–10,000 characters.'
    global.fetch = jest.fn(() =>
      Promise.resolve(makeResponse(400, { error: serverMessage }))
    ) as unknown as typeof fetch

    expect.assertions(5)
    try {
      await analyzeAnnouncement(VALID_REQUEST)
    } catch (err) {
      const appError = asAppError(err)
      expect(appError.code).toBe(400)
      expect(appError.message).toBe(serverMessage)
    }
  })

  it('maps HTTP 429 to a rate-limit AppError', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(makeResponse(429, { error: 'rate limited' }))
    ) as unknown as typeof fetch

    expect.assertions(4)
    try {
      await analyzeAnnouncement(VALID_REQUEST)
    } catch (err) {
      const appError = asAppError(err)
      expect(appError.message).toBe(
        'Request limit reached. Please try again later.'
      )
    }
  })

  it('maps HTTP 500 to a generic analysis-failed AppError', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(makeResponse(500, { error: 'internal detail' }))
    ) as unknown as typeof fetch

    expect.assertions(4)
    try {
      await analyzeAnnouncement(VALID_REQUEST)
    } catch (err) {
      const appError = asAppError(err)
      expect(appError.message).toBe(
        'Analysis could not be completed. Please try again.'
      )
    }
  })

  it('maps HTTP 502 to a generic analysis-failed AppError', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(makeResponse(502, { error: 'bad gateway' }))
    ) as unknown as typeof fetch

    expect.assertions(4)
    try {
      await analyzeAnnouncement(VALID_REQUEST)
    } catch (err) {
      const appError = asAppError(err)
      expect(appError.message).toBe(
        'Analysis could not be completed. Please try again.'
      )
    }
  })

  it('maps HTTP 503 to a service-unavailable AppError', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(makeResponse(503, { error: 'unavailable' }))
    ) as unknown as typeof fetch

    expect.assertions(4)
    try {
      await analyzeAnnouncement(VALID_REQUEST)
    } catch (err) {
      const appError = asAppError(err)
      expect(appError.message).toBe(
        'Service temporarily unavailable. Please try again.'
      )
    }
  })

  it('returns the parsed AnalyzeResponse on HTTP 200 success', async () => {
    const result: StructuredResult = {
      summary: 'Exams rescheduled.',
      whatChanged: ['Exam date moved'],
      whoIsAffected: ['First-year students'],
      importantDates: [{ date: '2025-01-15', event: 'Exam', status: 'Confirmed' }],
      requiredActions: ['Bring student ID'],
      exceptions: ['Medical exemptions apply'],
      documentsOrMaterials: ['Student ID'],
      priority: 'Important',
      missingInformation: [],
    }
    global.fetch = jest.fn(() =>
      Promise.resolve(makeResponse(200, { result }))
    ) as unknown as typeof fetch

    const response = await analyzeAnnouncement(VALID_REQUEST)
    expect(response.result).toEqual(result)
  })
})

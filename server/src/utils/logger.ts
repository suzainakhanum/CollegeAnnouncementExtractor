/**
 * Server-side logger utility.
 *
 * IMPORTANT: This module must NEVER be imported by HTTP response handlers or
 * any code that writes to `res.json()`. Its output goes exclusively to stdout
 * for server-side observability. API keys, stack traces, and raw AI responses
 * logged here must never flow back to the client.
 *
 * Requirements: 5.2, 5.3, 2.6
 */

/**
 * Logs an error to stdout with an ISO 8601 timestamp.
 *
 * Format: [ISO_TIMESTAMP] [ERROR] [context] detail
 *
 * @param context - A short label identifying where the error occurred
 *                  (e.g. "validateSchema", "aiAdapter", "analyze route").
 * @param detail  - Any value that provides additional diagnostic information
 *                  (e.g. missing field names, raw AI response, Error objects).
 *                  Objects are serialized with JSON.stringify; Error instances
 *                  include their message and stack.
 */
export function logError(context: string, detail: unknown): void {
  const timestamp = new Date().toISOString();

  let detailStr: string;

  if (detail instanceof Error) {
    // Preserve both message and stack for internal diagnostics
    detailStr = JSON.stringify({
      message: detail.message,
      stack: detail.stack,
    });
  } else if (typeof detail === "object" && detail !== null) {
    try {
      detailStr = JSON.stringify(detail);
    } catch {
      // Circular references or other serialization failures
      detailStr = String(detail);
    }
  } else {
    detailStr = String(detail);
  }

  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] [ERROR] [${context}] ${detailStr}`);
}

import { demoExtract } from '../utils/demoExtractor';

/**
 * Local, deterministic mock AI adapter.
 *
 * Drop-in replacement for `aiAdapter.complete` used when no AI provider is
 * configured (missing AI_API_KEY). It exposes the exact same signature as the
 * real adapter — `complete(prompt: string): Promise<string>` — and returns a
 * JSON string that the extraction service parses and validates identically to a
 * real AI response. This keeps the API contract and the extraction pipeline
 * completely unchanged.
 *
 * The announcement text is recovered from the "## Announcement" section that
 * `buildPrompt` embeds in the prompt, then handed to the deterministic
 * `demoExtract` rule-based extractor.
 *
 * Requirements: 9.1, 3.1, 5.1
 */

/**
 * Recovers the raw announcement text from a prompt produced by `buildPrompt`.
 * The prompt places the announcement between the "## Announcement" heading and
 * the trailing "## Instructions" heading. If the markers are not found (e.g. a
 * caller passed raw text instead of a built prompt), the whole input is treated
 * as the announcement.
 */
export function extractAnnouncementFromPrompt(prompt: string): string {
  const start = prompt.indexOf('## Announcement');
  if (start === -1) return prompt.trim();

  const afterHeading = prompt.slice(start + '## Announcement'.length);
  const end = afterHeading.indexOf('## Instructions');
  const body = end === -1 ? afterHeading : afterHeading.slice(0, end);
  return body.trim();
}

/**
 * Deterministically "completes" the prompt by running the local demo extractor
 * and returning its StructuredResult serialized as JSON — mirroring the shape a
 * real provider's message content would contain.
 */
export async function complete(prompt: string): Promise<string> {
  const announcement = extractAnnouncementFromPrompt(prompt);
  const result = demoExtract(announcement);
  return JSON.stringify(result);
}

import { StructuredResult, DateEntry } from '../types/index';

/**
 * Deterministic, rule-based demo extractor.
 *
 * Used as a local fallback when no AI provider is configured (missing
 * AI_API_KEY). It analyzes the raw announcement text with simple, fully
 * deterministic heuristics and returns a StructuredResult that conforms to the
 * exact same output schema the real AI adapter must satisfy.
 *
 * Design constraints (mirrors buildPrompt.ts hallucination-prevention rules):
 *  - Only extract information that is explicitly present in the announcement.
 *  - Never invent dates, groups, actions, documents, or exceptions.
 *  - Convert only mandatory language ("must", "required", "shall") into
 *    requiredActions; never promote suggestions ("should", "may").
 *  - Use the same placeholder values the prompt instructs the model to use
 *    when a field has no supported content.
 *  - Given the same input, always produce the same output (deterministic).
 *
 * Requirements: 3.1, 3.3, 3.4, 3.6, 5.1
 */

const NOT_MENTIONED = 'Not mentioned in the announcement.';
const NO_REQUIRED_ACTIONS =
  'No required actions were identified in the announcement.';

/** Splits text into trimmed, non-empty sentences. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** De-duplicates a list while preserving first-seen order. */
function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

// Month-name based date pattern, e.g. "October 14", "November 15, 2025".
const MONTHS =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
const DATE_REGEX = new RegExp(
  `${MONTHS}\\s+\\d{1,2}(?:,\\s*\\d{4})?|\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{1,2}/\\d{1,2}/\\d{2,4}\\b`,
  'g'
);

/** Extracts every date literal mentioned, each paired with its sentence event. */
function extractDates(sentences: string[]): DateEntry[] {
  const entries: DateEntry[] = [];
  for (const sentence of sentences) {
    const matches = sentence.match(DATE_REGEX);
    if (!matches) continue;
    for (const date of matches) {
      const lower = sentence.toLowerCase();
      let status: string | undefined;
      if (lower.includes('deadline') || lower.includes('due') || lower.includes('by ')) {
        status = 'Deadline';
      } else if (lower.includes('register') || lower.includes('registration')) {
        status = 'Registration';
      } else if (lower.includes('rescheduled') || lower.includes('moved')) {
        status = 'Rescheduled';
      }
      const entry: DateEntry = { date, event: sentence };
      if (status) entry.status = status;
      entries.push(entry);
    }
  }
  return entries;
}

/** Sentences containing mandatory language become required actions. */
const MANDATORY_REGEX = /\b(must|required|shall|are required to|need to submit|mandatory)\b/i;
function extractRequiredActions(sentences: string[]): string[] {
  return unique(sentences.filter((s) => MANDATORY_REGEX.test(s)));
}

/** Sentences describing a change. */
const CHANGE_REGEX =
  /\b(rescheduled|moved|changed|updated|new|cancell?ed|postponed|revised|will now|no longer)\b/i;
function extractWhatChanged(sentences: string[]): string[] {
  return unique(sentences.filter((s) => CHANGE_REGEX.test(s)));
}

/** Common affected-group phrases explicitly present in the text. */
const GROUP_REGEX =
  /\b((?:first|second|third|fourth|final)[- ]year(?:\s+\w+)?\s+students|all\s+[A-Za-z ]+?\s+(?:majors|students)|[A-Za-z ]+?\s+majors|graduate students|undergraduate students|international students|freshmen|sophomores|juniors|seniors)\b/gi;
function extractWhoIsAffected(text: string): string[] {
  const matches = text.match(GROUP_REGEX) ?? [];
  return unique(matches.map((m) => m.trim()));
}

/** Documents / materials the announcement tells students to bring or submit. */
const DOC_REGEX =
  /\b((?:student\s+)?ID(?:\s+card)?|[A-Za-z ]*?\b(?:form|consent form|permit|certificate|document|transcript|receipt|letter))\b/gi;
function extractDocuments(sentences: string[]): string[] {
  const relevant = sentences.filter((s) =>
    /\b(bring|submit|present|provide|attach|upload|show)\b/i.test(s)
  );
  const docs: string[] = [];
  for (const sentence of relevant) {
    const matches = sentence.match(DOC_REGEX) ?? [];
    for (const m of matches) docs.push(m.trim());
  }
  return unique(docs);
}

/** Sentences describing an exemption / exception. */
const EXCEPTION_REGEX = /\b(exempt|exemption|excused|except|excluding|does not apply|not required to|waived)\b/i;
function extractExceptions(sentences: string[]): string[] {
  return unique(sentences.filter((s) => EXCEPTION_REGEX.test(s)));
}

const URGENCY_REGEX = /\b(immediately|urgent|as soon as possible|asap|right away|today|tomorrow)\b/i;

/**
 * Classifies priority using the same rules described in the prompt:
 *  - Urgent: explicit urgency language.
 *  - Important: has action items or dates but no urgency language.
 *  - Informational: no deadlines and no action items.
 */
function classifyPriority(
  text: string,
  hasActions: boolean,
  hasDates: boolean
): StructuredResult['priority'] {
  if (URGENCY_REGEX.test(text)) return 'Urgent';
  if (hasActions || hasDates) return 'Important';
  return 'Informational';
}

/**
 * Produces a deterministic StructuredResult for the given announcement text.
 */
export function demoExtract(announcement: string): StructuredResult {
  const text = announcement.trim();
  const sentences = splitSentences(text);

  const importantDates = extractDates(sentences);
  const requiredActions = extractRequiredActions(sentences);
  const whatChanged = extractWhatChanged(sentences);
  const whoIsAffected = extractWhoIsAffected(text);
  const documentsOrMaterials = extractDocuments(sentences);
  const exceptions = extractExceptions(sentences);

  const summary =
    sentences.length > 0
      ? sentences[0]
      : 'The announcement did not contain any readable content.';

  const priority = classifyPriority(
    text,
    requiredActions.length > 0,
    importantDates.length > 0
  );

  return {
    summary,
    whatChanged: whatChanged.length > 0 ? whatChanged : [NOT_MENTIONED],
    whoIsAffected: whoIsAffected.length > 0 ? whoIsAffected : [NOT_MENTIONED],
    importantDates,
    requiredActions:
      requiredActions.length > 0 ? requiredActions : [NO_REQUIRED_ACTIONS],
    exceptions,
    documentsOrMaterials,
    priority,
    missingInformation: [],
  };
}

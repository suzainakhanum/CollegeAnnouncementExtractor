/**
 * Builds the complete prompt string sent to the AI model.
 *
 * The returned prompt includes:
 *  1. A persona instruction scoping the model to structured data extraction.
 *  2. The full output schema definition with all field names and types.
 *  3. Detailed hallucination-prevention instructions.
 *  4. The raw announcement text.
 *  5. An instruction to return only a valid JSON object with no surrounding prose.
 *
 * Requirements: 3.1, 3.3, 3.4, 4.1
 */
export function buildPrompt(announcement: string): string {
  return `You are a structured data extractor for college announcements. Your sole task is to read the announcement provided and extract information into a strict JSON format. You must NEVER invent, assume, or infer any information that is not explicitly stated in the announcement.

## Output Schema

Return a single JSON object that conforms exactly to this TypeScript schema:

\`\`\`typescript
interface DateEntry {
  date: string;    // The date as written in the announcement (e.g. "November 15, 2025")
  event: string;   // A short description of the event associated with this date
  status?: string; // Optional context or label (e.g. "Deadline", "Registration opens")
}

interface StructuredResult {
  summary: string;               // A single-paragraph executive summary of the announcement
  whatChanged: string[];         // List of changes or updates described in the announcement
  whoIsAffected: string[];       // List of student groups, roles, or populations affected
  importantDates: DateEntry[];   // Every date mentioned in the announcement, each with its associated event
  requiredActions: string[];     // Only items the announcement explicitly states students MUST do (mandatory requirements)
  exceptions: string[];          // Exemptions, exclusions, or conditions that apply to specific subgroups
  documentsOrMaterials: string[]; // Every document, ID, form, file, or material students must bring or submit
  priority: "Urgent" | "Important" | "Informational"; // Classification based on urgency and deadlines
  missingInformation: string[];  // Ambiguous, contradictory, or unstated information flagged as unclear
}
\`\`\`

## Field-by-Field Extraction Rules

- **summary**: Write a concise one-paragraph summary covering the key points of the announcement. Base it only on what is stated.
- **whatChanged**: List each change, update, or new policy described. If nothing changed, use \`["Not mentioned in the announcement."]\`.
- **whoIsAffected**: List every student group, role, department, or population explicitly named. If none are named, use \`["Not mentioned in the announcement."]\`.
- **importantDates**: Extract every date mentioned. Each entry must have \`date\` and \`event\`. Include \`status\` only if a label is stated or clearly implied (e.g. "deadline", "registration opens"). If no dates are mentioned, use \`[]\`.
- **requiredActions**: Include ONLY items the announcement marks as mandatory (e.g. uses "must", "required", "shall"). Do NOT include suggestions ("should"), possibilities ("may"), or recommendations. If no mandatory actions are stated, use \`["No required actions were identified in the announcement."]\`.
- **exceptions**: List every exemption, exclusion, or special condition stated. If none, use \`[]\`.
- **documentsOrMaterials**: List every document, ID, form, permit, or material students are explicitly told to bring or submit. If none, use \`[]\`.
- **priority**: Classify as exactly one of:
  - \`"Urgent"\` — the announcement contains a deadline within 48 hours OR uses explicit urgency language ("immediately", "urgent", "as soon as possible").
  - \`"Important"\` — the announcement contains a deadline beyond 48 hours OR contains action items without urgency language.
  - \`"Informational"\` — the announcement contains no deadlines and no action items.
- **missingInformation**: Flag every ambiguous statement, contradictory claim, or piece of information referenced but not explained. Explain why each entry is ambiguous or incomplete. If nothing is ambiguous, use \`[]\`.

## Hallucination Prevention Rules

1. Extract ONLY information that is explicitly stated word-for-word or by clear direct reference in the announcement.
2. Do NOT infer, assume, or extrapolate beyond what is written.
3. Do NOT convert a suggestion ("should", "may", "consider") into a mandatory action.
4. Do NOT invent dates, deadlines, groups, documents, or actions that are not mentioned.
5. When language is ambiguous or contradictory, place it in \`missingInformation\` and do NOT use it to populate any other field.
6. If a field has no applicable information in the announcement, use the placeholder value specified in the rules above — never leave a field empty without reason.

## Announcement

${announcement}

## Instructions

Return ONLY the JSON object described above. Do not include any explanation, commentary, markdown fences, or text outside the JSON object. The response must be valid JSON that can be parsed with \`JSON.parse()\`.`;
}

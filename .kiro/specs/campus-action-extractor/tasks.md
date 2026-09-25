# Implementation Plan: Campus Action — College Announcement Action Extractor

## Overview

The implementation is organized as a monorepo with `/client` (React + TypeScript) and `/server` (Node.js + Express + TypeScript) as separate package roots. Tasks proceed from project scaffolding → shared types → backend core → frontend components → Agent Hook → tests → documentation. Property-based tests use `fast-check`; unit tests use Jest.

---

## Tasks

- [x] 1. Scaffold monorepo project structure
  - [x] 1.1 Initialize `/server` package with TypeScript, Express, and dependencies
    - Create `/server/package.json` with dependencies: `express`, `axios`, `dotenv`; devDependencies: `typescript`, `ts-node`, `jest`, `ts-jest`, `@types/express`, `@types/node`, `fast-check`, `supertest`, `@types/supertest`
    - Create `/server/tsconfig.json` targeting ES2020, `src` as rootDir, `dist` as outDir
    - Create `/server/.env.example` documenting `AI_API_KEY`, `AI_PROVIDER_ENDPOINT`, `AI_MODEL_NAME`, `PORT`, `NODE_ENV` with placeholder values only
    - Create `/server/src/app.ts` with Express app wiring (CORS, JSON body parser, health route, analyze route mount)
    - Create `/server/src/index.ts` as the entry point that reads `PORT` from environment and starts the server
    - Create the `announcements/` directory with a `.gitkeep` placeholder file
    - _Requirements: 2.7, 9.2, 9.3, 13.1_

  - [x] 1.2 Initialize `/client` package with React, TypeScript, and dependencies
    - Create `/client/package.json` with dependencies: `react`, `react-dom`; devDependencies: `typescript`, `@types/react`, `@types/react-dom`, `vite` (or Create React App scripts), `jest`, `ts-jest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `fast-check`
    - Create `/client/tsconfig.json` with React JSX support
    - Create `/client/src/index.tsx` as the React entry point rendering `<App />`
    - Create `/client/src/App.tsx` as the root component shell (empty state, wires Header + AnnouncementInput + ResultsDashboard)
    - _Requirements: 1.1, 8.1_

- [x] 2. Define shared TypeScript types
  - [x] 2.1 Create shared type definitions in `/client/src/types/index.ts`
    - Define `DateEntry` interface (`date: string`, `event: string`, `status?: string`)
    - Define `StructuredResult` interface with all 9 fields matching the output schema
    - Define `AppError` interface (`code: number`, `message: string`)
    - Define `AnalyzeRequestBody` and `AnalyzeSuccessResponse` and `AnalyzeErrorResponse` interfaces
    - _Requirements: 3.2, 5.1_

  - [x] 2.2 Mirror server-side types in `/server/src/types/index.ts`
    - Define the same `DateEntry`, `StructuredResult`, `AnalyzeRequestBody`, `AnalyzeSuccessResponse`, `AnalyzeErrorResponse` interfaces for use across server modules
    - Define custom error classes: `InputValidationError`, `SchemaValidationError`, `ExtractionError` (with subtypes: `NetworkError`, `TimeoutError`, `RateLimitError`)
    - _Requirements: 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Implement backend utility modules
  - [x] 3.1 Implement `validateInput()` in `/server/src/utils/validateInput.ts`
    - Accepts `unknown`, throws `InputValidationError` if: not a string, empty/whitespace-only, length < 20, length > 10,000
    - Returns `void` on valid input
    - Error messages must state the required character range with no internal system details
    - _Requirements: 2.3, 2.4, 4.7_

  - [x] 3.2 Write property-based tests for `validateInput` in `/server/src/__tests__/validateInput.property.test.ts`
    - **Property 1: Input validation rejects all non-conforming announcements**
    - Use `fast-check` arbitraries to generate empty strings, whitespace-only strings, strings < 20 chars, strings > 10,000 chars
    - Assert that `validateInput()` throws `InputValidationError` for all generated inputs
    - Also assert that any string of length 20–10,000 (non-whitespace) does NOT throw
    - Minimum 100 iterations
    - Tag: `// Feature: campus-action-extractor, Property 1`
    - **Validates: Requirements 2.3, 2.4, 4.7**

  - [x] 3.3 Implement `validateSchema()` in `/server/src/utils/validateSchema.ts`
    - Accepts `unknown`, returns `StructuredResult` or throws `SchemaValidationError`
    - Check all 9 required fields are present
    - Check array fields (`whatChanged`, `whoIsAffected`, `importantDates`, `requiredActions`, `exceptions`, `documentsOrMaterials`, `missingInformation`) are actual arrays
    - Check `priority` is exactly one of `"Urgent"`, `"Important"`, `"Informational"`
    - Check `importantDates` entries each have `date` and `event` string fields
    - _Requirements: 5.1, 5.6, 3.6_

  - [x] 3.4 Write property-based tests for `validateSchema` in `/server/src/__tests__/validateSchema.property.test.ts`
    - **Property 2: Schema validation rejects any AI response missing a required field**
    - Use `fast-check` to generate objects with one or more of the 9 required fields removed; assert `SchemaValidationError` is thrown
    - **Property 3: Schema validation rejects type mismatches**
    - Use `fast-check` to generate objects where array fields contain non-array values; assert `SchemaValidationError` is thrown
    - **Property 4: Priority classification covers all valid announcements**
    - For any valid `StructuredResult`, assert `priority` is one of the three allowed values
    - Minimum 100 iterations per property
    - Tag: `// Feature: campus-action-extractor, Property 2 / 3 / 4`
    - **Validates: Requirements 5.1, 5.2, 5.6, 3.6**

  - [x] 3.5 Implement `buildPrompt()` in `/server/src/utils/buildPrompt.ts`
    - Accepts the announcement string, returns a complete prompt string
    - Prompt must include: persona instruction, full output schema definition with field names/types, hallucination-prevention instructions, the raw announcement, and an instruction to return only valid JSON
    - _Requirements: 3.1, 3.3, 3.4, 4.1_

  - [x] 3.6 Implement `logger.ts` in `/server/src/utils/logger.ts`
    - Export `logError(context: string, detail: unknown): void`
    - Writes to stdout with ISO timestamp; never called from HTTP response handlers
    - _Requirements: 5.2, 5.3, 2.6_

- [x] 4. Implement the AI adapter
  - [x] 4.1 Implement `aiAdapter.ts` in `/server/src/adapters/aiAdapter.ts`
    - Export `complete(prompt: string): Promise<string>` — the only function the extraction service calls
    - Read `AI_PROVIDER_ENDPOINT`, `AI_MODEL_NAME`, `AI_API_KEY` from `process.env` only
    - Make an HTTP POST to the AI provider's chat completions endpoint using `axios`
    - Apply a 30-second request timeout via `axios` `timeout` option
    - Catch and rethrow provider-specific errors as typed error classes: `NetworkError`, `TimeoutError`, `RateLimitError`
    - _Requirements: 9.1, 9.2, 9.3, 2.5_

- [x] 5. Implement the extraction service
  - [x] 5.1 Implement `extractionService.ts` in `/server/src/services/extractionService.ts`
    - Export `analyze(announcement: string): Promise<StructuredResult>`
    - Call `buildPrompt(announcement)` to construct the prompt
    - Call `aiAdapter.complete(prompt)` to get the raw AI response string
    - Parse the response string as JSON; throw `SchemaValidationError` if JSON parsing fails
    - Call `validateSchema(parsed)` to validate and return a typed `StructuredResult`
    - On any `aiAdapter` error, re-throw the typed error class to the route handler
    - _Requirements: 3.1, 3.2, 3.11, 5.1, 5.3_

  - [x] 5.2 Write unit tests for `extractionService` in `/server/src/__tests__/extractionService.test.ts`
    - Mock `aiAdapter` to return a valid JSON string → assert returned `StructuredResult` matches
    - Mock `aiAdapter` to return malformed JSON → assert `SchemaValidationError` is thrown
    - Mock `aiAdapter` to return JSON missing required fields → assert `SchemaValidationError` is thrown
    - Mock `aiAdapter` to throw `NetworkError` → assert error propagates correctly
    - Mock `aiAdapter` to throw `RateLimitError` → assert error propagates correctly
    - _Requirements: 3.11, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Implement the API route
  - [x] 6.1 Implement `/api/analyze` route in `/server/src/routes/analyze.ts`
    - Accept `POST /api/analyze` with JSON body containing `announcement`
    - Call `validateInput(announcement)` → on `InputValidationError` return HTTP 400 with safe message
    - Call `extractionService.analyze(announcement)` → on success return HTTP 200 with `{ result }`
    - Map error types to HTTP responses: `NetworkError` → 502, `TimeoutError` → 503, `RateLimitError` → 429, `SchemaValidationError` (missing fields / type mismatch / invalid JSON) → 500
    - Call `logError()` for all 5xx responses; never include API key, stack trace, or raw AI response in any HTTP response body
    - Mount this router on `/api/analyze` in `app.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Write unit tests for the analyze route in `/server/src/__tests__/analyze.route.test.ts`
    - Use `supertest` to send HTTP requests against the Express app
    - Empty `announcement` → assert HTTP 400, body has `error` field, body has no stack trace
    - `announcement` shorter than 20 chars → assert HTTP 400
    - `announcement` longer than 10,000 chars → assert HTTP 400
    - Mocked `extractionService` throws `SchemaValidationError` → assert HTTP 500, body has no internal details
    - Mocked `extractionService` throws `NetworkError` → assert HTTP 502
    - Mocked `extractionService` throws `RateLimitError` → assert HTTP 429
    - Mocked `extractionService` throws `TimeoutError` → assert HTTP 503
    - Valid request with mocked successful service → assert HTTP 200 with `result` key
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 5.2, 5.3, 5.4, 5.5, 7.8_

  - [x] 6.3 Write property-based tests for error response safety in `/server/src/__tests__/apiService.property.test.ts`
    - **Property 5: Error responses contain no internal details**
    - Use `fast-check` to generate error scenarios (invalid input, schema failures, AI errors)
    - For each scenario assert the HTTP response body contains only an `error: string` field and does not contain `AI_API_KEY`, `stack`, or raw AI output
    - Minimum 100 iterations
    - Tag: `// Feature: campus-action-extractor, Property 5`
    - **Validates: Requirements 2.6, 5.2, 5.3, 7.8**

- [x] 7. Checkpoint — Backend complete
  - Ensure all server-side tests pass. Run `jest` from `/server`. Ask the user if any questions arise before proceeding to frontend.

- [x] 8. Implement frontend type definitions and API service
  - [x] 8.1 Implement `apiService.ts` in `/client/src/services/apiService.ts`
    - Export `analyzeAnnouncement(req: AnalyzeRequest): Promise<AnalyzeResponse>`
    - Use the Fetch API with a 30-second `AbortController` timeout
    - On `AbortError` throw `AppError` with message "Request timed out. Please try again."
    - On `TypeError` (network) throw `AppError` with message "Could not connect. Check your connection and retry."
    - Map HTTP 400 → `AppError` using message from response body
    - Map HTTP 429 → `AppError` with "Request limit reached. Please try again later."
    - Map HTTP 500 / 502 → `AppError` with "Analysis could not be completed. Please try again."
    - Map HTTP 503 → `AppError` with "Service temporarily unavailable. Please try again."
    - Never expose `error.stack` or fields not in `AnalyzeErrorResponse`
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 8.2 Implement `sampleAnnouncement.ts` in `/client/src/services/sampleAnnouncement.ts`
    - Export `SAMPLE_ANNOUNCEMENT: string` — hardcoded, 150–800 characters
    - Must contain: at least one schedule change, at least two distinct affected student groups, at least three dates with associated events, at least two required actions, at least one exemption, and at least one required document
    - _Requirements: 11.1_

  - [x] 8.3 Write unit tests for `apiService` in `/client/src/__tests__/apiService.test.ts`
    - Mock `fetch` to simulate 30-second timeout → assert `AppError` with timeout message
    - Mock `fetch` to throw `TypeError` → assert `AppError` with network message
    - Mock HTTP 400 response → assert `AppError` message matches body
    - Mock HTTP 429, 500, 502, 503 responses → assert correct `AppError` message for each
    - Mock HTTP 200 with valid result → assert `AnalyzeResponse` returned
    - _Requirements: 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 9. Implement frontend components
  - [x] 9.1 Implement `Header.tsx` in `/client/src/components/Header.tsx`
    - Render the application name "Campus Action" as an `<h1>`
    - Render a subtitle describing the tool's purpose
    - _Requirements: 1.1_

  - [x] 9.2 Implement `CharCounter.tsx` in `/client/src/components/CharCounter.tsx`
    - Accept `count: number` and `max: number` props
    - Render "N / 10,000" live counter
    - _Requirements: 1.3_

  - [x] 9.3 Implement `AnnouncementInput.tsx` in `/client/src/components/AnnouncementInput.tsx`
    - Render textarea that accepts 20–10,000 characters
    - Enforce max 10,000 character limit via `maxLength` attribute and `onChange` guard; display limit-reached message when at cap (Req 1.9)
    - Render `<CharCounter />` below the textarea, updated on every keystroke (Req 1.3)
    - Render "Extract Actions" primary button; disable while `isLoading` is true (Req 1.4, 7.2)
    - Render "Clear" button; on click: clear textarea, reset counter, clear dashboard (Req 1.5)
    - Render "Try Example" button; on click: populate textarea with `SAMPLE_ANNOUNCEMENT`, do NOT auto-submit (Req 1.6, 11.2, 11.3)
    - On submit with empty input: show validation message, do not call `onSubmit` (Req 1.7)
    - On submit with input < 20 chars: show validation message, do not call `onSubmit` (Req 1.8)
    - Show visible loading indicator inside the submission area while `isLoading` (Req 7.1)
    - All interactive elements must have visible focus indicators and keyboard operability (Req 8.4)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 7.1, 7.2, 8.4_

  - [x] 9.4 Implement `SectionCard.tsx` in `/client/src/components/SectionCard.tsx`
    - Generic wrapper card component accepting `title: string` and `children: React.ReactNode`
    - Renders a visually distinct card container with consistent heading and spacing
    - _Requirements: 8.1, 8.2_

  - [x] 9.5 Implement `PriorityBadge.tsx` in `/client/src/components/PriorityBadge.tsx`
    - Accept `priority: "Urgent" | "Important" | "Informational"`
    - Render icon (⚠️ / 📌 / ℹ️), label text, and background color — all three must differ across priority levels so color is not the sole differentiator
    - Ensure sufficient contrast (WCAG 2.1 AA, 4.5:1 for text)
    - _Requirements: 6.4, 8.3_

  - [x] 9.6 Implement `ActionChecklist.tsx` in `/client/src/components/ActionChecklist.tsx`
    - Accept `actions: string[]`
    - When non-empty: render each item prefixed with `☐` as a non-interactive text element (not `<input type="checkbox">`)
    - When empty: render "No actions required" placeholder
    - _Requirements: 6.2, 6.8_

  - [x] 9.7 Implement `DateCard.tsx` in `/client/src/components/DateCard.tsx`
    - Accept `entry: DateEntry` (date, event, status)
    - Render the date value, event label, and status/context in a card layout
    - _Requirements: 6.3_

  - [x] 9.8 Implement `MissingInfoSection.tsx` in `/client/src/components/MissingInfoSection.tsx`
    - Accept `items: string[]`
    - When non-empty: render items in a dedicated "Missing Information" section inside a `<SectionCard>`
    - When empty: render nothing (return `null`) — no empty section header visible
    - _Requirements: 6.5, 6.6_

  - [x] 9.9 Implement `ResultsDashboard.tsx` in `/client/src/components/ResultsDashboard.tsx`
    - Accept `result: StructuredResult | null`, `error: AppError | null`, `isLoading: boolean`
    - When `result` is null and not loading and no error: render placeholder message/illustration prompting the student to paste an announcement (Req 8.7)
    - When `result` is present: render all 8 section cards in order — Executive Summary, What Changed, Who Is Affected, Important Dates, Required Actions, Exceptions / Exemptions, Documents / Materials, and Missing Information (Req 6.1)
    - Use `<SectionCard>` for each section, `<ActionChecklist>` for required actions, `<DateCard>` for each date entry (empty state: "No important dates identified"), `<PriorityBadge>` for priority, `<MissingInfoSection>` for missing info
    - Apply fade-in or slide-in CSS animation ≤ 400ms per section on appearance (Req 8.6)
    - When `error` is present: render appropriate user-facing error message (no stack trace, no internal details)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.3, 7.4, 7.5, 7.6, 7.8, 8.6, 8.7_

- [x] 10. Wire up App.tsx and apply global styles
  - [x] 10.1 Complete `App.tsx` state management and layout
    - Hold state: `announcement: string`, `result: StructuredResult | null`, `error: AppError | null`, `isLoading: boolean`
    - On submit: set `isLoading = true`, call `analyzeAnnouncement()`, on success set `result`, on error set `error`, always set `isLoading = false`
    - On clear: reset all state fields
    - Render `<Header />`, `<AnnouncementInput />`, `<ResultsDashboard />` in a single-page layout with results below input
    - _Requirements: 6.7, 7.1, 7.2_

  - [x] 10.2 Apply global CSS styles for responsiveness and accessibility
    - Create `/client/src/index.css` with: responsive layout for 375px–1440px screen widths, no horizontal scrolling, consistent typographic scale, uniform spacing system, WCAG 2.1 AA color contrast ratios (4.5:1 normal text, 3:1 large text/UI)
    - Add CSS transitions for section card fade-in/slide-in animations (≤ 400ms)
    - Add visible focus indicator styles for all interactive elements
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 11. Write frontend component tests
  - [x] 11.1 Write unit tests for `AnnouncementInput` in `/client/src/__tests__/AnnouncementInput.test.tsx`
    - Render with empty input → submit → assert validation message shown, `onSubmit` not called
    - Render with < 20 char input → submit → assert validation message, `onSubmit` not called
    - Type > 10,000 chars → assert input capped and limit message shown
    - Render with `isLoading = true` → assert "Extract Actions" button disabled and loading indicator visible
    - Click "Clear" → assert textarea empty, counter reset
    - Click "Try Example" → assert textarea populated with sample text, not submitted
    - Live character counter updates on each keystroke
    - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9, 7.1, 7.2_

  - [x] 11.2 Write unit tests for `ResultsDashboard` in `/client/src/__tests__/ResultsDashboard.test.tsx`
    - Render with `result = null` → assert placeholder message visible
    - Render with valid `StructuredResult` → assert all 8 section cards present in correct order
    - Render with `missingInformation = []` → assert missing info section not rendered
    - Render with `missingInformation` non-empty → assert missing info section rendered
    - Render with `requiredActions = []` → assert "No actions required" placeholder shown
    - Render with `importantDates = []` → assert "No important dates identified" shown
    - Render with `error` → assert error message shown, no stack trace
    - _Requirements: 6.1, 6.5, 6.6, 6.8, 7.3, 7.4, 7.5_

  - [x] 11.3 Write unit tests for `ActionChecklist`, `DateCard`, `PriorityBadge` in `/client/src/__tests__/`
    - `ActionChecklist.test.tsx`: non-empty actions render with `☐` prefix; empty array renders placeholder
    - `DateCard.test.tsx`: `date`, `event`, `status` all rendered; missing `status` handled gracefully
    - `PriorityBadge.test.tsx`: all 3 priority values render correct icon AND label text (not color-only)
    - _Requirements: 6.2, 6.3, 6.4, 6.8_

  - [x] 11.4 Write property-based tests for `ResultsDashboard` in `/client/src/__tests__/ResultsDashboard.property.test.tsx`
    - **Property 7: Results dashboard renders all eight sections for any valid result**
    - Use `fast-check` to generate arbitrary valid `StructuredResult` objects; assert all 8 section cards rendered in order; assert Missing Information hidden when array is empty
    - **Property 8: Required actions rendered as checklist items**
    - For any `StructuredResult` with non-empty `requiredActions`, assert every item rendered with `☐` prefix; for empty array, assert placeholder rendered
    - **Property 9: Date cards render all date entries**
    - For any `StructuredResult` with non-empty `importantDates`, assert every `DateEntry` rendered as a `DateCard`; for empty array, assert placeholder rendered
    - Minimum 100 iterations per property
    - Tag: `// Feature: campus-action-extractor, Property 7 / 8 / 9`
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.6, 6.8**

  - [x] 11.5 Write property-based test for character counter in `/client/src/__tests__/charCounter.property.test.ts`
    - **Property 6: Character counter reflects input length**
    - Use `fast-check` to generate arbitrary strings ≤ 10,000 chars; assert displayed counter equals `string.length`
    - Assert that input beyond 10,000 chars is blocked (counter stays at 10,000)
    - Minimum 100 iterations
    - Tag: `// Feature: campus-action-extractor, Property 6`
    - **Validates: Requirements 1.3, 1.9**

  - [x] 11.6 Write property-based test for serialization round-trip in `/client/src/__tests__/structuredResult.property.test.ts`
    - **Property 10: Serialization round-trip preserves StructuredResult**
    - Use `fast-check` to generate arbitrary valid `StructuredResult` objects
    - Assert `JSON.parse(JSON.stringify(result))` passes `validateSchema()` (imported from server utils or duplicated for client test) and deep-equals the original
    - Minimum 100 iterations
    - Tag: `// Feature: campus-action-extractor, Property 10`
    - **Validates: Requirements 5.1, 3.2**

- [x] 12. Checkpoint — Full application wired and tested
  - Run `jest` in both `/server` and `/client`. Ensure all tests pass. Ask the user if questions arise before proceeding.

- [x] 13. Implement the Kiro Agent Hook
  - [x] 13.1 Create the Agent Hook JSON file at `.kiro/hooks/announcement-analyzer.json`
    - Configure trigger: `PostFileSave` (or `PostFileCreate`) with matcher pattern `announcements/.*\.txt`
    - Action type: `agent` with a prompt instructing the agent to:
      1. Read the full text content of the file that triggered the hook
      2. Analyze it according to the extraction rules in the Campus Action specification
      3. Generate a `StructuredResult` conforming to the output schema
      4. Never invent information not explicitly supported by the announcement content
      5. Write output only to the corresponding result file (e.g., `announcements/results/<filename>.json`)
      6. Avoid modifying any source code, configuration, or files unrelated to announcement analysis
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 14. Write README documentation
  - [x] 14.1 Create `README.md` at the project root
    - Include dedicated sections for: project overview, problem statement, solution description, feature list, system architecture, technology stack, Kiro Spec workflow explanation, Agent Hook explanation, project directory structure, setup instructions, required environment variables (name + purpose, no values), running the application, example input/output pair, testing instructions, known limitations, and future improvements
    - Document `AI_API_KEY`, `AI_PROVIDER_ENDPOINT`, `AI_MODEL_NAME`, `PORT`, `NODE_ENV` by name and purpose only
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 15. Final checkpoint — All tests pass and docs complete
  - Run the full test suite in `/server` and `/client`. Verify README covers all required sections. Ask the user if any questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all property tests are optional sub-tasks
- Each task references specific requirements for traceability
- Checkpoints at tasks 7, 12, and 15 ensure incremental validation at backend-complete, full-app-wired, and final stages
- Property tests use `fast-check` and must run a minimum of 100 iterations each
- Unit tests complement property tests — both are needed for full coverage
- The AI adapter (`aiAdapter.ts`) is the single swappable module for changing AI providers; no other file changes are needed
- Never include API keys, stack traces, or raw AI output in any HTTP response body

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "3.3", "3.5", "3.6"] },
    { "id": 3, "tasks": ["3.2", "3.4", "4.1"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "8.1", "8.2"] },
    { "id": 7, "tasks": ["8.3", "9.1", "9.2"] },
    { "id": 8, "tasks": ["9.3", "9.4", "9.5", "9.6", "9.7", "9.8"] },
    { "id": 9, "tasks": ["9.9"] },
    { "id": 10, "tasks": ["10.1", "10.2"] },
    { "id": 11, "tasks": ["11.1", "11.2", "11.3"] },
    { "id": 12, "tasks": ["11.4", "11.5", "11.6"] },
    { "id": 13, "tasks": ["13.1"] },
    { "id": 14, "tasks": ["14.1"] }
  ]
}
```

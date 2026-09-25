# Requirements Document

## Introduction

Campus Action is an AI-powered web application that converts long college announcements into short, clear, actionable student checklists. Students paste an announcement, click "Extract Actions", and receive a structured dashboard showing what changed, who is affected, important dates, required actions, exceptions, required documents, and a priority classification. The system must never hallucinate information and must explicitly flag anything not mentioned in the announcement.

## Glossary

- **Campus_Action**: The full web application described in this document.
- **Announcement**: Raw text input provided by the student, representing a college announcement.
- **Extraction_Service**: The backend module responsible for sending the Announcement to the AI model and parsing the structured response.
- **AI_Model**: The external AI API (provider-swappable) used to analyze the Announcement.
- **Structured_Result**: The validated JSON object returned by the Extraction_Service conforming to the output schema.
- **Results_Dashboard**: The frontend UI component that renders the Structured_Result for the student.
- **Action_Item**: A single required student action derived from the Announcement.
- **Date_Card**: A UI element displaying one date entry with its associated event and status.
- **Agent_Hook**: A Kiro automation hook that triggers analysis whenever relevant announcement content is created or updated.
- **API_Key**: A secret credential used to authenticate with the AI_Model provider, stored only in backend environment variables.

---

## Requirements

### Requirement 1: Announcement Input Interface

**User Story:** As a student, I want a clear input interface to paste and submit a college announcement, so that I can quickly start the extraction process.

#### Acceptance Criteria

1. THE Campus_Action SHALL display an application name ("Campus Action") and a subtitle describing the tool's purpose on the main screen.
2. THE Campus_Action SHALL provide a text area for the student to paste an Announcement, accepting between 20 and 10,000 characters.
3. WHILE the student is entering text in the input area, THE Campus_Action SHALL display a live character counter showing the current character count and the maximum limit of 10,000 characters.
4. THE Campus_Action SHALL provide an "Extract Actions" primary button that submits the Announcement for analysis.
5. WHEN the student clicks "Clear", THE Campus_Action SHALL remove all text from the input area, reset the character counter to 0, and clear all content from the Results_Dashboard.
6. WHEN the student clicks "Try Example", THE Campus_Action SHALL populate the input area with a sample Announcement that contains at least one schedule change, at least one group of affected students, at least two distinct dates, at least one required action, at least one exemption condition, and at least one required document.
7. WHEN the student clicks "Extract Actions" with an empty input area, THE Campus_Action SHALL display a validation message indicating that an announcement is required and SHALL NOT submit the request to the backend.
8. WHEN the student clicks "Extract Actions" with an Announcement shorter than 20 characters, THE Campus_Action SHALL display a validation message indicating the input is too short and SHALL NOT submit the request to the backend.
9. IF the student enters more than 10,000 characters in the input area, THEN THE Campus_Action SHALL prevent additional input beyond 10,000 characters and SHALL display a message indicating the character limit has been reached.

---

### Requirement 2: Announcement Submission API

**User Story:** As a developer, I want a well-defined backend API endpoint, so that the frontend can securely submit announcements for analysis.

#### Acceptance Criteria

1. THE Campus_Action backend SHALL expose a POST endpoint at `/api/analyze`.
2. WHEN a POST request is received at `/api/analyze` with a JSON body containing an `announcement` field, THE backend SHALL forward the Announcement to the Extraction_Service.
3. IF the `announcement` field is missing or empty in the request body, THEN THE backend SHALL return an HTTP 400 response with an error message that identifies the missing field and contains no internal system details.
4. IF the `announcement` field contains fewer than 20 characters or more than 10,000 characters, THEN THE backend SHALL return an HTTP 400 response with an error message that states the required character range and contains no internal system details.
5. IF the Extraction_Service is unavailable or does not respond within 30 seconds, THEN THE backend SHALL return an HTTP 503 response with an error message indicating the service is temporarily unavailable and contains no internal system details.
6. THE backend SHALL never include the API_Key, stack traces, or internal error details in any HTTP response sent to the client.
7. THE backend SHALL read the AI_Model provider credentials exclusively from environment variables.

---

### Requirement 3: AI-Powered Extraction

**User Story:** As a student, I want the application to accurately extract key information from the announcement, so that I don't miss important details.

#### Acceptance Criteria

1. WHEN the Extraction_Service receives an Announcement, THE Extraction_Service SHALL send the Announcement to the AI_Model with a prompt that includes the output schema definition and instructs the AI_Model to return a response conforming to that schema.
2. THE Extraction_Service SHALL extract from the Announcement: `summary`, `whatChanged`, `whoIsAffected`, `importantDates`, `requiredActions`, `exceptions`, `documentsOrMaterials`, `priority`, and `missingInformation`.
3. THE Extraction_Service SHALL base all extracted values exclusively on information present in the Announcement.
4. WHEN a piece of information (such as a deadline or affected group) is not mentioned in the Announcement, THE Extraction_Service SHALL populate the corresponding field with a statement indicating that the information is not present in the announcement.
5. THE Extraction_Service SHALL distinguish between mandatory requirements ("must"), recommendations ("should"), and possibilities ("may") as stated in the Announcement, and SHALL reflect this distinction in the `requiredActions` field. IF the Announcement contains no modal verbs or action directives, THEN THE Extraction_Service SHALL populate `requiredActions` with a statement indicating no required actions were identified.
6. THE Extraction_Service SHALL classify `priority` as exactly one of: "Urgent", "Important", or "Informational", where "Urgent" applies when the Announcement contains a deadline within 48 hours or explicit urgency terms (e.g., "immediately", "urgent", "as soon as possible"), "Important" applies when the Announcement contains a deadline beyond 48 hours or action items without urgency terms, and "Informational" applies when the Announcement contains no deadlines and no action items.
7. THE Extraction_Service SHALL extract every date mentioned in the Announcement into the `importantDates` field and SHALL associate each date with its corresponding event description.
8. THE Extraction_Service SHALL identify exclusions and exemptions stated in the Announcement and populate the `exceptions` field accordingly.
9. THE Extraction_Service SHALL identify every document, ID, form, file, or material that the Announcement explicitly requires students to submit or bring, and populate the `documentsOrMaterials` field accordingly.
10. THE Extraction_Service SHALL preserve ambiguity present in the Announcement by populating the `missingInformation` field with each ambiguous or incomplete statement identified, rather than inferring or assuming a resolution.
11. IF the AI_Model returns a response that does not conform to the output schema or is unavailable, THEN THE Extraction_Service SHALL not return a partial extraction result and SHALL indicate to the caller that extraction failed.

---

### Requirement 4: Extraction Accuracy and Hallucination Prevention

**User Story:** As a student, I want to trust that the extracted information is accurate, so that I can act on it confidently without cross-checking every detail.

#### Acceptance Criteria

1. THE Extraction_Service SHALL never insert dates, deadlines, affected groups, required actions, exceptions, or documents into the Structured_Result that are not explicitly stated word-for-word or by clear direct reference in the Announcement.
2. THE Extraction_Service SHALL never convert a suggestion or recommendation from the Announcement into a mandatory Action_Item.
3. IF the Announcement does not mention registration being required, THEN THE Extraction_Service SHALL NOT include a registration requirement in the Structured_Result.
4. WHEN the Announcement uses ambiguous language, THE Extraction_Service SHALL include an entry in the `missingInformation` field that identifies the ambiguous term or phrase, explains why it is ambiguous, and ensures that no other field in the Structured_Result is populated using that ambiguous input.
5. THE Extraction_Service SHALL never omit information that is explicitly stated in the Announcement.
6. WHEN the Announcement contains contradictory statements, THE Extraction_Service SHALL include an entry in the `missingInformation` field identifying the contradiction and SHALL NOT resolve it by choosing one statement over the other.
7. WHEN the Announcement input is empty or below the minimum character threshold, THE Extraction_Service SHALL not attempt to call the AI_Model and SHALL return an error response to the caller.

---

### Requirement 5: Structured Result Validation

**User Story:** As a developer, I want the backend to validate the AI response before sending it to the frontend, so that the application never crashes due to malformed AI output.

#### Acceptance Criteria

1. WHEN the AI_Model returns a response, THE Extraction_Service SHALL validate that the response conforms to the output schema with all required fields present: `summary`, `whatChanged`, `whoIsAffected`, `importantDates`, `requiredActions`, `exceptions`, `documentsOrMaterials`, `priority`, and `missingInformation`.
2. IF the AI_Model response is missing one or more required fields, THEN THE Extraction_Service SHALL return an HTTP 500 response with a message containing no internal error details, and SHALL log the names of the missing fields and a timestamp on the server.
3. IF the AI_Model response is not valid JSON, THEN THE Extraction_Service SHALL return an HTTP 500 response with a message containing no internal error details, and SHALL log the raw AI_Model response and a timestamp on the server.
4. IF the AI_Model returns a rate limit error, THEN THE Extraction_Service SHALL return an HTTP 429 response with a message asking the student to try again later.
5. IF the AI_Model is unreachable or returns a network error, THEN THE Extraction_Service SHALL return an HTTP 502 response with a message indicating the analysis service is currently unavailable.
6. IF any required field in the AI_Model response contains a value of an incorrect type (for example, a string where an array is expected), THEN THE Extraction_Service SHALL treat the response as invalid and return an HTTP 500 response as described in criterion 2.

---

### Requirement 6: Results Dashboard

**User Story:** As a student, I want a clear, organized dashboard showing the extracted information, so that I can quickly understand what I need to do.

#### Acceptance Criteria

1. WHEN a Structured_Result is successfully received, THE Results_Dashboard SHALL render all eight sections in order: Executive Summary, What Changed, Who Is Affected, Important Dates, Required Actions, Exceptions / Exemptions, Documents / Materials, and Missing Information.
2. THE Results_Dashboard SHALL display each Required Action as a checklist item prefixed with a checkbox symbol (☐) and a text label; the checkbox SHALL be non-interactive and serve as a visual indicator only.
3. THE Results_Dashboard SHALL display each entry in `importantDates` as a Date_Card showing the date value, the associated event label, and the status or context; IF the `importantDates` field is empty, THEN THE Results_Dashboard SHALL display a "No important dates identified" placeholder within the Important Dates section.
4. THE Results_Dashboard SHALL display the `priority` value with a labeled badge showing the exact classification text ("Urgent", "Important", or "Informational") alongside a distinct icon or color indicator unique to each classification, such that the three classifications are visually distinguishable from one another without relying solely on color.
5. WHEN the `missingInformation` field contains one or more entries, THE Results_Dashboard SHALL display them in a dedicated "Missing Information" section.
6. WHEN the `missingInformation` field is empty, THE Results_Dashboard SHALL hide the Missing Information section entirely, leaving no empty section header visible.
7. THE Results_Dashboard SHALL be displayed below the input area on the same page after a successful extraction.
8. IF the `requiredActions` field is empty, THEN THE Results_Dashboard SHALL display a "No actions required" placeholder within the Required Actions section.

---

### Requirement 7: Loading and Error States

**User Story:** As a student, I want clear feedback during and after the extraction process, so that I always know what the application is doing.

#### Acceptance Criteria

1. WHEN the student clicks "Extract Actions" and the request is in progress, THE Campus_Action SHALL display a visible loading indicator within the submission area.
2. WHILE a request is in progress, THE Campus_Action SHALL disable the "Extract Actions" button; WHEN a response or error is received, THE Campus_Action SHALL re-enable the button and remove the loading indicator.
3. WHEN the backend returns an HTTP 400 error, THE Campus_Action SHALL display a message describing what input is invalid or missing, without including backend error details, stack traces, or raw server response content.
4. WHEN the backend returns an HTTP 429 error, THE Campus_Action SHALL display a message informing the student that the request limit has been reached and to try again later.
5. WHEN the backend returns an HTTP 500 or HTTP 502 error, THE Campus_Action SHALL display a message indicating that the analysis could not be completed and suggesting the student try again.
6. WHEN a network failure occurs before a response is received, THE Campus_Action SHALL display a message indicating that the connection could not be established and prompting the student to check their connection and retry.
7. WHEN no response is received within 30 seconds of the request being sent, THE Campus_Action SHALL cancel the request, re-enable the "Extract Actions" button, and display a message indicating that the request timed out and the student may try again.
8. THE Campus_Action SHALL never display API keys, stack traces, or internal server error details to the student.

---

### Requirement 8: Design and Accessibility

**User Story:** As a student, I want a polished, accessible interface, so that the application is easy and comfortable to use.

#### Acceptance Criteria

1. THE Campus_Action SHALL use a card-based layout for the Results_Dashboard sections, where each section is rendered in a visually distinct card container.
2. THE Campus_Action SHALL apply a consistent typographic scale and uniform spacing system throughout the interface, such that all equivalent UI elements (headings, body text, labels) share the same font size and spacing values.
3. THE Campus_Action SHALL provide sufficient color contrast for all text and interactive elements to meet WCAG 2.1 AA contrast ratio requirements (minimum 4.5:1 for normal text, 3:1 for large text and UI components).
4. THE Campus_Action SHALL be fully operable using keyboard navigation alone, and each interactive element SHALL display a visible focus indicator when focused via keyboard.
5. THE Campus_Action SHALL be responsive and usable on screen widths from 375px to 1440px without horizontal scrolling or content overflow.
6. WHEN the Results_Dashboard sections appear after a successful extraction, THE Campus_Action SHALL apply a brief fade-in or slide-in animation with a duration not exceeding 400ms per section.
7. WHEN no extraction has been performed, THE Campus_Action SHALL display a placeholder message or illustration in the results area indicating that the student should paste an announcement and click "Extract Actions" to see results.

---

### Requirement 9: AI Provider Configurability

**User Story:** As a developer, I want the AI provider to be swappable without rewriting the application, so that I can change providers as needed.

#### Acceptance Criteria

1. THE Extraction_Service SHALL interact with the AI_Model through a single adapter module; replacing that module with one implementing the same function signature SHALL be sufficient to switch AI providers without modifying any other file in the Extraction_Service.
2. THE Campus_Action backend SHALL read the AI provider name, endpoint, and API_Key exclusively from environment variables.
3. THE Campus_Action backend SHALL never embed API credentials in source code or frontend assets.

---

### Requirement 10: Agent Hook

**User Story:** As a developer, I want a Kiro Agent Hook that triggers announcement analysis automatically, so that the extraction workflow can run without manual intervention.

#### Acceptance Criteria

1. THE Campus_Action SHALL include a Kiro Agent Hook stored as a JSON file in the `.kiro/hooks/` directory, configured to fire when a file matching the pattern `announcements/*.txt` is created or saved.
2. WHEN the Agent_Hook fires, THE Agent_Hook SHALL instruct the Kiro agent to read the full text content of the file that triggered the hook and analyze it according to the extraction rules defined in this specification.
3. WHEN the Agent_Hook fires, THE Agent_Hook SHALL instruct the Kiro agent to generate a Structured_Result conforming to the output schema defined in this specification.
4. WHEN the Agent_Hook fires, THE Agent_Hook SHALL instruct the Kiro agent to never invent information not explicitly supported by the announcement content in the triggering file.
5. WHEN the Agent_Hook fires, THE Agent_Hook SHALL instruct the Kiro agent to write its output only to the corresponding result file and to avoid modifying any source code, configuration, or other files not directly related to the announcement analysis.

---

### Requirement 11: Sample Announcement

**User Story:** As a student evaluating the tool, I want a realistic built-in sample announcement, so that I can see the application working without having to find my own content.

#### Acceptance Criteria

1. THE Campus_Action SHALL include a hardcoded sample Announcement of between 150 and 800 characters, accessible via the "Try Example" button, that contains at least one schedule change, at least two distinct affected student groups, at least three dates with associated events, at least two required actions, at least one exemption, and at least one required document.
2. WHEN the student clicks "Try Example", THE Campus_Action SHALL populate the input area with the sample Announcement.
3. WHEN the student clicks "Try Example", THE Campus_Action SHALL NOT automatically submit the sample Announcement for analysis.

---

### Requirement 12: Testing Coverage

**User Story:** As a developer, I want automated tests covering all key extraction and error scenarios, so that I can verify the application behaves correctly.

#### Acceptance Criteria

1. THE Campus_Action test suite SHALL include a test for an Announcement containing multiple deadlines and verify that all dates are present in the `importantDates` field of the Structured_Result.
2. THE Campus_Action test suite SHALL include a test for an Announcement containing a schedule change and verify that the change is reflected in the `whatChanged` field.
3. THE Campus_Action test suite SHALL include a test for an Announcement containing an exemption and verify that the exemption appears in the `exceptions` field.
4. THE Campus_Action test suite SHALL include a test for an Announcement affecting multiple student groups and verify that all groups appear in the `whoIsAffected` field.
5. THE Campus_Action test suite SHALL include a test for an Announcement with no deadline and verify that the `importantDates` field does not contain any invented date values and instead contains a statement indicating no dates were found.
6. THE Campus_Action test suite SHALL include a test for an Announcement with no required action and verify that the `requiredActions` field does not contain any invented action items and instead contains a statement indicating no actions were found.
7. THE Campus_Action test suite SHALL include a test for an Announcement containing only optional suggestions and verify that no items in the `requiredActions` field are labeled or described as mandatory.
8. THE Campus_Action test suite SHALL include a test for an empty input submission and verify that the backend returns an HTTP 400 response.
9. THE Campus_Action test suite SHALL include a test simulating an invalid AI response and verify that the backend returns an HTTP 500 response whose body contains no internal error details or raw stack traces.
10. THE Campus_Action test suite SHALL include a test for an Announcement of at least 2000 characters and verify that the Extraction_Service returns a Structured_Result in which every defined field is populated with a non-null, non-empty value.

---

### Requirement 13: Documentation

**User Story:** As a developer or evaluator, I want professional documentation, so that I can understand, set up, and extend the project.

#### Acceptance Criteria

1. THE Campus_Action repository SHALL include a README.md file at the project root.
2. THE README.md SHALL contain a dedicated section for each of the following topics: project overview, problem statement, solution description, feature list, system architecture, technology stack, explanation of the Kiro Spec workflow used, Agent Hook explanation, project directory structure, setup instructions, required environment variables, instructions for running the application, an example input/output pair, testing instructions, known limitations, and a future improvements section.
3. THE README.md SHALL document each required environment variable by name and purpose without including actual credential values.

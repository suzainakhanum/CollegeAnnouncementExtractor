# Campus Action — College Announcement Action Extractor

Campus Action turns long, dense college announcements into short, clear, actionable student checklists. Paste an announcement, click **Extract Actions**, and get a structured dashboard showing what changed, who is affected, key dates, required actions, exceptions, required documents, and a priority classification — without invented information.

---

## Project Overview

Campus Action is an AI-powered, full-stack web application. Students provide raw announcement text, and the app uses an AI model to produce a validated, structured summary rendered in a sectioned dashboard. The backend owns all AI communication through a swappable adapter, so credentials never reach the browser and the AI provider can be changed by replacing a single module.

---

## Problem Statement

College announcements are often long, unstructured, and easy to skim past. Important deadlines, required documents, affected groups, and mandatory actions get buried in prose. Students risk missing critical steps because the "what do I actually have to do?" signal is hidden inside paragraphs of context. Manually re-reading and extracting this information is slow and error-prone.

---

## Solution Description

Campus Action reads an announcement and extracts a structured `StructuredResult` with nine fields. A strict backend validation layer guarantees the AI output conforms to the expected schema before it ever reaches the frontend, and the AI prompt is engineered to prevent hallucination — anything not explicitly stated is flagged under `missingInformation` rather than invented. The result is displayed in a card-based, accessible dashboard so students can immediately see what matters.

Key design principles:

- **No hallucination** — values are based exclusively on the announcement text; ambiguity is surfaced, not resolved.
- **Credentials stay server-side** — the client never sees API keys.
- **Schema-validated output** — malformed AI responses are rejected, never rendered.
- **Provider-swappable AI** — one adapter module isolates all provider-specific code.

---

## Feature List

- Paste-and-analyze input with a 20–10,000 character range and a live character counter.
- **Extract Actions**, **Clear**, and **Try Example** controls.
- Built-in realistic sample announcement for instant demoing.
- Structured extraction into nine fields (summary, changes, affected groups, dates, actions, exceptions, documents, priority, missing information).
- Priority classification (`Urgent` / `Important` / `Informational`) shown with an icon + label + color badge (not color alone).
- Eight-section results dashboard with empty-state placeholders and brief section animations.
- Clear loading, error, and empty states with a 30-second timeout on both client and server.
- Sanitized error responses — no API keys, stack traces, or raw AI output ever leave the server.
- Kiro Agent Hook for automated analysis of `.txt` files dropped into `/announcements/`.
- Unit tests and property-based tests across client and server.

---

## System Architecture

Campus Action is a monorepo with two independent package roots: a React frontend (`/client`) and a Node.js/Express backend (`/server`).

```
Browser (React /client)                Server (Node/Express /server)         External
─────────────────────────             ──────────────────────────────       ──────────
AnnouncementInput  ──POST /api/analyze──►  route: validateInput()
  (textarea + buttons)                       │
apiService.ts (fetch + 30s abort)            ▼
                                          extractionService.ts ──prompt──►  AI Model API
ResultsDashboard  ◄──200 + JSON──────────    │  ◄──JSON string──────────────
  (8 section cards)                          ▼
                                          validateSchema() ──► StructuredResult
                                             │
                                          logger.ts (server-side only)
```

Request flow:

1. The client posts `{ announcement }` to `POST /api/analyze` with a 30-second `AbortController` timeout.
2. The route runs `validateInput()` (character-range guard) and delegates to `extractionService.analyze()`.
3. The extraction service builds a prompt, calls the swappable `aiAdapter.complete()`, then runs `validateSchema()` on the raw response.
4. On success the route returns `200 { result }`; on failure it maps every internal error to a safe HTTP response. Only `logger.ts` sees raw error detail — nothing from it flows into a response body.

---

## Technology Stack

**Frontend (`/client`)**
- React 18 + TypeScript
- Vite (dev server and build)
- Fetch API with `AbortController`

**Backend (`/server`)**
- Node.js + Express + TypeScript
- `axios` for AI provider HTTP calls (30-second timeout)
- `dotenv` for environment configuration
- Swappable AI adapter (`aiAdapter.ts`)

**Testing**
- Jest + `ts-jest`
- `fast-check` for property-based tests (minimum 100 iterations per property)
- `@testing-library/react` + `@testing-library/user-event` (client)
- `supertest` (server HTTP route tests)

---

## Kiro Spec Workflow

This project was built using Kiro's spec-driven workflow, which moves through three artifacts stored under `.kiro/specs/campus-action-extractor/`:

1. **`requirements.md`** — Requirements were captured as user stories with EARS-style acceptance criteria (13 requirements covering input, API, extraction accuracy, validation, dashboard, error states, accessibility, provider configurability, the agent hook, the sample announcement, testing coverage, and documentation).
2. **`design.md`** — The design translated those requirements into an architecture: component/module breakdown, the `StructuredResult` data model, API request/response shapes, an HTTP status-code map, correctness properties, error-handling strategy, and a testing strategy. Each correctness property links back to specific requirements.
3. **`tasks.md`** — The design was decomposed into an ordered implementation plan of discrete, traceable coding tasks (each referencing the requirements it satisfies), with checkpoints after the backend, after full wiring, and at the end.

Each task was implemented one at a time, with property-based tests validating the correctness properties defined in the design. This README completes the documentation task (task 14.1, Requirement 13).

---

## Agent Hook

The project includes a Kiro Agent Hook at `.kiro/hooks/announcement-analyzer.json`. It fires when a file matching `announcements/*.txt` is created or saved. When triggered, it instructs the Kiro agent to:

1. Read the full text of the triggering file.
2. Analyze it according to the extraction rules in this spec.
3. Generate a `StructuredResult` conforming to the output schema.
4. Never invent information not explicitly supported by the announcement.
5. Write output only to the corresponding result file (e.g. `announcements/results/<filename>.json`) and avoid modifying source code, configuration, or unrelated files.

This provides an automated, no-UI path to analyze announcements simply by dropping a `.txt` file into `/announcements/`.

---

## Project Directory Structure

```
CollegeAnnouncementExtractor/
├── .kiro/
│   ├── hooks/
│   │   └── announcement-analyzer.json   # Agent Hook (Req 10)
│   └── specs/
│       └── campus-action-extractor/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
│
├── announcements/                       # Agent Hook trigger directory
│
├── client/                              # React frontend
│   └── src/
│       ├── components/                  # Header, AnnouncementInput, CharCounter,
│       │                                #   ResultsDashboard, PriorityBadge, SectionCard,
│       │                                #   ActionChecklist, DateCard, MissingInfoSection
│       ├── services/                    # apiService.ts, sampleAnnouncement.ts
│       ├── types/                       # StructuredResult, AppError interfaces
│       ├── __tests__/                   # unit + property-based tests
│       ├── App.tsx
│       ├── index.tsx
│       └── index.css
│
├── server/                              # Node.js / Express backend
│   ├── src/
│   │   ├── routes/                      # analyze.ts (POST /api/analyze)
│   │   ├── services/                    # extractionService.ts
│   │   ├── adapters/                    # aiAdapter.ts (swappable module)
│   │   ├── utils/                       # validateInput, validateSchema, buildPrompt, logger
│   │   ├── types/                       # shared types + error classes
│   │   ├── __tests__/                   # unit + property-based tests
│   │   ├── app.ts                       # Express app setup
│   │   └── index.ts                     # entry point
│   └── .env.example
│
└── README.md
```

---

## Setup Instructions

**Prerequisites:** Node.js 18+ and npm.

1. Clone the repository and open the project root.
2. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd ../client
   npm install
   ```
4. Configure the server environment:
   ```bash
   cd ../server
   cp .env.example .env
   ```
   Then fill in your own values in `.env` (see [Required Environment Variables](#required-environment-variables)). Never commit `.env`.

---

## Required Environment Variables

Configured on the **server only** and read exclusively from the environment. Documented here by name and purpose (no values). See `server/.env.example` for placeholders.

| Variable | Purpose | Required |
|---|---|---|
| `AI_API_KEY` | Authentication credential for the AI model provider | Yes |
| `AI_PROVIDER_ENDPOINT` | Base URL for the AI model API | Yes |
| `AI_MODEL_NAME` | Model identifier (e.g. `gpt-4o`) | Yes |
| `PORT` | HTTP port the Express server listens on (default `3001`) | No |
| `NODE_ENV` | Runtime environment (`development` / `production`) | No |

Credentials are never embedded in source code or shipped in the frontend bundle.

---

## Running the Application

Run the backend and frontend in two terminals.

**Terminal 1 — server:**
```bash
cd server
npm run dev
```
The Express API listens on `http://localhost:3001` (or the `PORT` you set).

**Terminal 2 — client:**
```bash
cd client
npm run dev
```
The Vite dev server serves the frontend (default `http://localhost:5173`). Open it in a browser, paste an announcement (or click **Try Example**), and click **Extract Actions**.

---

## Example Input / Output

**Input (announcement):**

> Attention second-year Engineering students and all Computer Science majors: the Data Structures midterm exam has been rescheduled from October 7 to October 14 at 9:00 AM in Hall B. You must register for the exam slot on the student portal by October 10. A revision session will be held on October 12 at 2:00 PM. On exam day, you must bring your student ID and submit your signed lab consent form. Students with approved medical leave are exempt from the registration deadline.

**Output (`StructuredResult`):**

```json
{
  "summary": "The Data Structures midterm has been moved to October 14 at 9:00 AM in Hall B. Affected students must register by October 10 and bring specific documents on exam day.",
  "whatChanged": [
    "The Data Structures midterm exam was rescheduled from October 7 to October 14 at 9:00 AM in Hall B."
  ],
  "whoIsAffected": [
    "Second-year Engineering students",
    "All Computer Science majors"
  ],
  "importantDates": [
    { "date": "October 10", "event": "Deadline to register for the exam slot on the student portal", "status": "Registration deadline" },
    { "date": "October 12, 2:00 PM", "event": "Revision session", "status": "Optional session" },
    { "date": "October 14, 9:00 AM", "event": "Data Structures midterm exam in Hall B", "status": "Exam day" }
  ],
  "requiredActions": [
    "Register for the exam slot on the student portal by October 10.",
    "Bring your student ID on exam day.",
    "Submit your signed lab consent form on exam day."
  ],
  "exceptions": [
    "Students with approved medical leave are exempt from the registration deadline."
  ],
  "documentsOrMaterials": [
    "Student ID",
    "Signed lab consent form"
  ],
  "priority": "Important",
  "missingInformation": [
    "The announcement does not state whether attendance at the October 12 revision session is mandatory."
  ]
}
```

---

## Testing

Both packages use Jest. Property-based tests run with `fast-check` (minimum 100 iterations each).

**Server tests:**
```bash
cd server
npm test
```

**Client tests:**
```bash
cd client
npm test
```

Coverage includes: input validation, schema validation, the extraction service, the `/api/analyze` route (via `supertest`), API-service error mapping, component rendering, and the ten correctness properties defined in `design.md`.

---

## Known Limitations

- Extraction quality depends on the configured AI model; weaker models may produce less precise field values.
- No persistence — results are not stored between sessions and there is no history view.
- Single-announcement analysis only; there is no batch UI (the Agent Hook covers file-based automation).
- English-language announcements are the primary target; other languages are untested.
- No authentication or per-user rate limiting is built into the app itself.
- The 30-second timeout may be too short for very large announcements on slow providers.

---

## Future Improvements

- Persistence and a searchable history of past extractions.
- Export of the dashboard to PDF, calendar (.ics) events, or a to-do integration.
- Interactive, savable checklists for required actions.
- Multi-language support and localization.
- User accounts with saved announcements and preferences.
- Additional AI adapters (e.g. Anthropic, local models) shipped alongside the current one.
- Confidence indicators per extracted field to surface lower-certainty items.
```
import React from 'react'
import type { StructuredResult, AppError } from '../types'
import SectionCard from './SectionCard'
import PriorityBadge from './PriorityBadge'
import ActionChecklist from './ActionChecklist'
import DateCard from './DateCard'
import MissingInfoSection from './MissingInfoSection'

/**
 * ResultsDashboard
 *
 * Renders the outcome of an extraction request. It has four mutually exclusive
 * display states, resolved in priority order:
 *   1. Loading   — a visible loading indicator while a request is in progress.
 *   2. Error     — a safe, user-facing message (Req 7.3, 7.4, 7.5, 7.6, 7.8).
 *   3. Empty     — a placeholder prompting the student to paste an announcement
 *                  (Req 8.7).
 *   4. Result    — all eight section cards in the required order (Req 6.1).
 *
 * Satisfies:
 * - Requirement 6.1: renders all eight sections in order — Executive Summary,
 *   What Changed, Who Is Affected, Important Dates, Required Actions,
 *   Exceptions / Exemptions, Documents / Materials, Missing Information.
 * - Requirement 6.2, 6.8: Required Actions rendered via <ActionChecklist>.
 * - Requirement 6.3: Important Dates rendered via <DateCard>, with a
 *   "No important dates identified" placeholder when empty.
 * - Requirement 6.4: priority rendered via <PriorityBadge> in the summary card.
 * - Requirement 6.5, 6.6: Missing Information rendered via <MissingInfoSection>
 *   which returns null (hides the section) when empty.
 * - Requirement 6.7: dashboard rendered below the input on the same page.
 * - Requirement 7.3–7.6, 7.8: error state shows only a safe message string,
 *   never a stack trace or internal detail.
 * - Requirement 8.6: each section card carries an animation class for a
 *   fade-in/slide-in effect (≤ 400ms, defined in global CSS).
 * - Requirement 8.7: empty-state placeholder before any extraction.
 */
interface ResultsDashboardProps {
  result: StructuredResult | null
  error: AppError | null
  isLoading: boolean
}

/** Renders a plain string[] field as an unordered list. */
const StringList: React.FC<{ items: string[] }> = ({ items }) => (
  <ul className="results-dashboard__list">
    {items.map((item, index) => (
      <li key={index} className="results-dashboard__list-item">
        {item}
      </li>
    ))}
  </ul>
)

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  result,
  error,
  isLoading,
}) => {
  // State 1: request in progress — show a loading indicator (Req 7.1 support).
  if (isLoading) {
    return (
      <div
        className="results-dashboard results-dashboard--loading"
        role="status"
        aria-live="polite"
      >
        Analyzing announcement…
      </div>
    )
  }

  // State 2: error — show only the safe, user-facing message. No stack traces
  // or internal details ever reach this branch (Req 7.3–7.6, 7.8).
  if (error) {
    return (
      <div
        className="results-dashboard results-dashboard--error"
        role="alert"
      >
        {error.message}
      </div>
    )
  }

  // State 3: nothing to show yet — prompt the student (Req 8.7).
  if (!result) {
    return (
      <div className="results-dashboard results-dashboard--empty">
        <p className="results-dashboard__empty-text">
          Paste a college announcement above and click &ldquo;Extract
          Actions&rdquo; to see your personalized action checklist here.
        </p>
      </div>
    )
  }

  // State 4: render all eight sections in order (Req 6.1). Each SectionCard
  // receives the animation class for the fade-in/slide-in effect (Req 8.6).
  const animate = 'section-card--animate'

  return (
    <div className="results-dashboard">
      {/* 1. Executive Summary — includes the priority badge (Req 6.4). */}
      <SectionCard title="Executive Summary" className={animate}>
        <div className="results-dashboard__summary-header">
          <PriorityBadge priority={result.priority} />
        </div>
        <p className="results-dashboard__summary">{result.summary}</p>
      </SectionCard>

      {/* 2. What Changed */}
      <SectionCard title="What Changed" className={animate}>
        <StringList items={result.whatChanged} />
      </SectionCard>

      {/* 3. Who Is Affected */}
      <SectionCard title="Who Is Affected" className={animate}>
        <StringList items={result.whoIsAffected} />
      </SectionCard>

      {/* 4. Important Dates — DateCard per entry, placeholder when empty (Req 6.3). */}
      <SectionCard title="Important Dates" className={animate}>
        {result.importantDates.length === 0 ? (
          <p className="results-dashboard__placeholder">
            No important dates identified
          </p>
        ) : (
          <div className="results-dashboard__dates">
            {result.importantDates.map((entry, index) => (
              <DateCard key={index} entry={entry} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* 5. Required Actions — checklist with its own empty state (Req 6.2, 6.8). */}
      <SectionCard title="Required Actions" className={animate}>
        <ActionChecklist actions={result.requiredActions} />
      </SectionCard>

      {/* 6. Exceptions / Exemptions */}
      <SectionCard title="Exceptions / Exemptions" className={animate}>
        <StringList items={result.exceptions} />
      </SectionCard>

      {/* 7. Documents / Materials */}
      <SectionCard title="Documents / Materials" className={animate}>
        <StringList items={result.documentsOrMaterials} />
      </SectionCard>

      {/* 8. Missing Information — hides itself entirely when empty (Req 6.5, 6.6). */}
      <MissingInfoSection items={result.missingInformation} />
    </div>
  )
}

export default ResultsDashboard

import React from 'react'
import SectionCard from './SectionCard'

/**
 * MissingInfoSection
 *
 * Renders the "Missing Information" section of the Results Dashboard. Each entry
 * in `items` represents an ambiguous, incomplete, or contradictory statement the
 * Extraction_Service flagged rather than resolved.
 *
 * Satisfies:
 * - Requirement 6.5: when `missingInformation` contains one or more entries,
 *   display them in a dedicated "Missing Information" section.
 * - Requirement 6.6: when `missingInformation` is empty, hide the section
 *   entirely (return null) so no empty section header is visible.
 */
export interface MissingInfoSectionProps {
  items: string[]
}

const MissingInfoSection: React.FC<MissingInfoSectionProps> = ({ items }) => {
  // Req 6.6: no entries → render nothing, leaving no empty section header.
  if (!items || items.length === 0) {
    return null
  }

  // Req 6.5: one or more entries → render a dedicated section as a list.
  return (
    <SectionCard title="Missing Information">
      <ul className="missing-info-section__list">
        {items.map((item, index) => (
          <li key={index} className="missing-info-section__item">
            {item}
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

export default MissingInfoSection

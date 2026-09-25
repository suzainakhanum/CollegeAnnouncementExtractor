import React from 'react'

/**
 * ActionChecklist
 *
 * Renders the list of required student actions.
 *
 * Satisfies:
 * - Requirement 6.2: each Required Action is displayed as a checklist item
 *   prefixed with a checkbox symbol (☐, U+2610 BALLOT BOX) and a text label;
 *   the checkbox is non-interactive and serves as a visual indicator only
 *   (plain text, NOT an <input type="checkbox">).
 * - Requirement 6.8: when there are no required actions, a
 *   "No actions required" placeholder is displayed.
 */
export interface ActionChecklistProps {
  actions: string[]
}

const ActionChecklist: React.FC<ActionChecklistProps> = ({ actions }) => {
  if (actions.length === 0) {
    return <p className="action-checklist__placeholder">No actions required</p>
  }

  return (
    <ul className="action-checklist">
      {actions.map((action, index) => (
        <li key={index} className="action-checklist__item">
          <span className="action-checklist__box" aria-hidden="true">
            {'\u2610'}
          </span>
          <span className="action-checklist__label">{action}</span>
        </li>
      ))}
    </ul>
  )
}

export default ActionChecklist

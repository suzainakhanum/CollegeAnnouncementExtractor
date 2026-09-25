import React from 'react'

// Requirements 6.4, 8.3 — priority badge with distinct icon, label, and color per
// classification so that color is NOT the sole differentiator, plus an accessible label.
export interface PriorityBadgeProps {
  priority: 'Urgent' | 'Important' | 'Informational'
}

interface PriorityMeta {
  icon: string
  modifier: string
}

// Each priority maps to a unique icon and a unique CSS modifier class.
// The background color is applied in CSS via the modifier class; the icon and
// label text guarantee the classification is distinguishable without color alone.
const PRIORITY_META: Record<PriorityBadgeProps['priority'], PriorityMeta> = {
  Urgent: { icon: '⚠️', modifier: 'priority-badge--urgent' },
  Important: { icon: '📌', modifier: 'priority-badge--important' },
  Informational: { icon: 'ℹ️', modifier: 'priority-badge--informational' },
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const { icon, modifier } = PRIORITY_META[priority]

  return (
    <span
      className={`priority-badge ${modifier}`}
      role="status"
      aria-label={`Priority: ${priority}`}
    >
      <span className="priority-badge__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="priority-badge__label">{priority}</span>
    </span>
  )
}

export default PriorityBadge

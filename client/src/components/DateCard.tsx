import React from 'react'
import type { DateEntry } from '../types'

// Requirement 6.3 — render a single date entry as a Date_Card showing the
// date value, the associated event label, and the status/context (if present)
export interface DateCardProps {
  entry: DateEntry
}

const DateCard: React.FC<DateCardProps> = ({ entry }) => {
  const { date, event, status } = entry

  return (
    <div className="date-card">
      <span className="date-card__date">{date}</span>
      <span className="date-card__event">{event}</span>
      {status ? <span className="date-card__status">{status}</span> : null}
    </div>
  )
}

export default DateCard

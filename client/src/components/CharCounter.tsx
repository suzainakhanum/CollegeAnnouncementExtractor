import React from 'react'

// Requirement 1.3 — live character counter showing current count and the maximum limit
export interface CharCounterProps {
  count: number
  max: number
}

const CharCounter: React.FC<CharCounterProps> = ({ count, max }) => {
  const formattedCount = count.toLocaleString('en-US')
  const formattedMax = max.toLocaleString('en-US')
  const atLimit = count >= max

  return (
    <p
      className={`char-counter${atLimit ? ' char-counter--at-limit' : ''}`}
      aria-live="polite"
    >
      {formattedCount} / {formattedMax}
    </p>
  )
}

export default CharCounter

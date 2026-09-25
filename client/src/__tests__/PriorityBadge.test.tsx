// Unit tests for the PriorityBadge component — task 11.3
//
// Verifies Requirement 6.4: each priority value renders a distinct icon AND its
// label text, so the classification is distinguishable without relying on color
// alone.
import { describe, expect, it } from '@jest/globals'
import '@testing-library/jest-dom/jest-globals'
import { render, screen } from '@testing-library/react'
import PriorityBadge from '../components/PriorityBadge'

type Priority = 'Urgent' | 'Important' | 'Informational'

const CASES: { priority: Priority; icon: string }[] = [
  { priority: 'Urgent', icon: '⚠️' },
  { priority: 'Important', icon: '📌' },
  { priority: 'Informational', icon: 'ℹ️' },
]

describe('PriorityBadge', () => {
  it.each(CASES)(
    'renders the $priority badge with its icon and label text (Req 6.4)',
    ({ priority, icon }) => {
      const { container } = render(<PriorityBadge priority={priority} />)

      // Label text is present (not color-only differentiation).
      const label = container.querySelector('.priority-badge__label')
      expect(label).toBeInTheDocument()
      expect(label).toHaveTextContent(priority)

      // Distinct icon is present for this classification.
      const iconEl = container.querySelector('.priority-badge__icon')
      expect(iconEl).toBeInTheDocument()
      expect(iconEl).toHaveTextContent(icon)

      // Accessible label exposes the classification textually.
      expect(
        screen.getByLabelText(`Priority: ${priority}`)
      ).toBeInTheDocument()
    }
  )

  it('renders a unique icon for each priority classification', () => {
    const icons = new Set<string>()
    for (const { priority } of CASES) {
      const { container, unmount } = render(<PriorityBadge priority={priority} />)
      const iconEl = container.querySelector('.priority-badge__icon')
      icons.add(iconEl?.textContent ?? '')
      unmount()
    }
    // Three priorities → three distinct icons.
    expect(icons.size).toBe(CASES.length)
  })
})

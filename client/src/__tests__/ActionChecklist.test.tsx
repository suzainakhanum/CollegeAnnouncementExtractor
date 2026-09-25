// Unit tests for the ActionChecklist component — task 11.3
//
// Verifies Requirement 6.2 (each required action renders as a checklist item
// prefixed with the ☐ symbol and a text label) and Requirement 6.8 (empty
// actions render a "No actions required" placeholder).
import { describe, expect, it } from '@jest/globals'
import '@testing-library/jest-dom/jest-globals'
import { render, screen } from '@testing-library/react'
import ActionChecklist from '../components/ActionChecklist'

describe('ActionChecklist', () => {
  it('renders each action with a ☐ (U+2610) prefix and its label text (Req 6.2)', () => {
    const actions = [
      'Bring your student ID',
      'Submit the medical form',
      'Register before the deadline',
    ]

    const { container } = render(<ActionChecklist actions={actions} />)

    // Every label is present.
    for (const action of actions) {
      expect(screen.getByText(action)).toBeInTheDocument()
    }

    // One list item per action, each carrying the ☐ ballot box symbol.
    const items = container.querySelectorAll('.action-checklist__item')
    expect(items).toHaveLength(actions.length)

    const boxes = container.querySelectorAll('.action-checklist__box')
    expect(boxes).toHaveLength(actions.length)
    boxes.forEach((box) => {
      expect(box.textContent).toBe('\u2610')
    })
  })

  it('renders the "No actions required" placeholder for an empty array (Req 6.8)', () => {
    render(<ActionChecklist actions={[]} />)

    expect(screen.getByText('No actions required')).toBeInTheDocument()
    // No checklist list items should be rendered when empty.
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})

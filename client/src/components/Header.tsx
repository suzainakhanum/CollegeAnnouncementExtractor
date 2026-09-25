import React from 'react'

/**
 * Header
 *
 * Renders the application name and a subtitle describing the tool's purpose.
 * Satisfies Requirement 1.1: display the application name ("Campus Action")
 * and a subtitle describing what the tool does on the main screen.
 */
const Header: React.FC = () => {
  return (
    <header className="header">
      <h1 className="header__title">Campus Action</h1>
      <p className="header__subtitle">
        Turn long college announcements into clear, actionable student checklists
      </p>
    </header>
  )
}

export default Header

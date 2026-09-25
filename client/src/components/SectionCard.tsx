import React from 'react'

/**
 * SectionCard
 *
 * Generic, reusable wrapper that renders its children inside a visually
 * distinct card container with a consistent heading and spacing. Used by the
 * ResultsDashboard to render each of its sections uniformly.
 *
 * Satisfies:
 * - Requirement 8.1: card-based layout where each section is a visually
 *   distinct card container.
 * - Requirement 8.2: consistent typographic scale and uniform spacing, so all
 *   equivalent elements (here, section headings) share the same styling.
 */
export interface SectionCardProps {
  title: string
  children: React.ReactNode
  /**
   * Optional extra class names appended to the card container. Used by the
   * ResultsDashboard to apply the fade-in/slide-in animation class (Req 8.6).
   */
  className?: string
}

const SectionCard: React.FC<SectionCardProps> = ({ title, children, className }) => {
  const classes = className ? `section-card ${className}` : 'section-card'
  return (
    <section className={classes}>
      <h2 className="section-card__title">{title}</h2>
      <div className="section-card__body">{children}</div>
    </section>
  )
}

export default SectionCard

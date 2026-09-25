import React, { useState } from 'react'
import CharCounter from './CharCounter'
import { SAMPLE_ANNOUNCEMENT } from '../services/sampleAnnouncement'

// Maximum accepted announcement length (Req 1.2, 1.9)
const MAX_CHARS = 10000
// Minimum accepted announcement length (Req 1.8)
const MIN_CHARS = 20

export interface AnnouncementInputProps {
  onSubmit: (announcement: string) => void
  onClear: () => void
  isLoading: boolean
}

const AnnouncementInput: React.FC<AnnouncementInputProps> = ({
  onSubmit,
  onClear,
  isLoading,
}) => {
  const [value, setValue] = useState<string>('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)

  // Req 1.9 — the textarea is at the hard character cap
  const atLimit = value.length >= MAX_CHARS

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    // onChange guard in addition to the maxLength attribute (Req 1.9)
    const next = event.target.value.slice(0, MAX_CHARS)
    setValue(next)
    // Clear any stale validation message as the student edits (Req 1.7, 1.8)
    if (validationMessage) {
      setValidationMessage(null)
    }
  }

  const handleSubmit = (): void => {
    const trimmed = value.trim()

    // Req 1.7 — empty input is rejected before hitting the backend
    if (trimmed.length === 0) {
      setValidationMessage('Please enter an announcement before extracting actions.')
      return
    }

    // Req 1.8 — input shorter than the minimum is rejected client-side
    if (trimmed.length < MIN_CHARS) {
      setValidationMessage(
        `Announcement is too short. Please enter at least ${MIN_CHARS} characters.`
      )
      return
    }

    setValidationMessage(null)
    onSubmit(value)
  }

  const handleClear = (): void => {
    // Req 1.5 — clear local text/counter and notify parent to clear the dashboard
    setValue('')
    setValidationMessage(null)
    onClear()
  }

  const handleTryExample = (): void => {
    // Req 1.6, 11.2, 11.3 — populate with the sample, never auto-submit
    setValue(SAMPLE_ANNOUNCEMENT)
    setValidationMessage(null)
  }

  return (
    <section className="announcement-input" aria-label="Announcement input">
      <label className="announcement-input__label" htmlFor="announcement-textarea">
        Paste your college announcement
      </label>

      <textarea
        id="announcement-textarea"
        className="announcement-input__textarea"
        value={value}
        onChange={handleChange}
        placeholder="Paste a college announcement here…"
        maxLength={MAX_CHARS}
        rows={10}
        disabled={isLoading}
        aria-label="Announcement text"
        aria-describedby="announcement-char-counter"
      />

      <div className="announcement-input__meta" id="announcement-char-counter">
        {/* Req 1.3 — live character counter, updated on every keystroke */}
        <CharCounter count={value.length} max={MAX_CHARS} />
        {atLimit && (
          <span className="announcement-input__limit-message" role="alert">
            Character limit of {MAX_CHARS.toLocaleString('en-US')} reached.
          </span>
        )}
      </div>

      {/* Req 1.7, 1.8 — client-side validation feedback */}
      {validationMessage && (
        <p className="announcement-input__validation" role="alert">
          {validationMessage}
        </p>
      )}

      <div className="announcement-input__actions">
        <button
          type="button"
          className="announcement-input__button announcement-input__button--primary"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {/* Req 1.4, 7.1, 7.2 — primary submit, disabled + loading indicator while in progress */}
          {isLoading ? (
            <span className="announcement-input__loading">
              <span className="announcement-input__spinner" aria-hidden="true" />
              Analyzing…
            </span>
          ) : (
            'Extract Actions'
          )}
        </button>

        <button
          type="button"
          className="announcement-input__button"
          onClick={handleClear}
          disabled={isLoading}
        >
          {/* Req 1.5 */}
          Clear
        </button>

        <button
          type="button"
          className="announcement-input__button"
          onClick={handleTryExample}
          disabled={isLoading}
        >
          {/* Req 1.6, 11.2, 11.3 */}
          Try Example
        </button>
      </div>
    </section>
  )
}

export default AnnouncementInput

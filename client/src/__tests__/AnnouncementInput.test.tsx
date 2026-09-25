// Unit tests for the AnnouncementInput component — task 11.1
//
// Verifies input validation, the live character counter, the 10,000-char cap,
// the loading state, and the Clear / Try Example / Extract Actions buttons
// (Requirements 1.2, 1.3, 1.5, 1.6, 1.7, 1.8, 1.9, 7.1, 7.2).
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import '@testing-library/jest-dom/jest-globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnnouncementInput from '../components/AnnouncementInput'
import { SAMPLE_ANNOUNCEMENT } from '../services/sampleAnnouncement'

const MAX_CHARS = 10000
const MIN_CHARS = 20

function setup(isLoading = false) {
  const onSubmit = jest.fn()
  const onClear = jest.fn()
  render(
    <AnnouncementInput
      onSubmit={onSubmit as (announcement: string) => void}
      onClear={onClear as () => void}
      isLoading={isLoading}
    />
  )
  const textarea = screen.getByLabelText('Announcement text') as HTMLTextAreaElement
  return { onSubmit, onClear, textarea }
}

function getExtractButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /extract actions|analyzing/i }) as HTMLButtonElement
}

describe('AnnouncementInput', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects empty input on submit and does not call onSubmit (Req 1.7)', async () => {
    const user = userEvent.setup()
    const { onSubmit } = setup()

    await user.click(screen.getByRole('button', { name: /extract actions/i }))

    expect(
      screen.getByText(/please enter an announcement/i)
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects input shorter than the minimum and does not call onSubmit (Req 1.8)', async () => {
    const user = userEvent.setup()
    const { onSubmit, textarea } = setup()

    await user.type(textarea, 'brief')

    await user.click(screen.getByRole('button', { name: /extract actions/i }))

    expect(
      screen.getByText(new RegExp(`at least ${MIN_CHARS} characters`, 'i'))
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('caps input at 10,000 characters and shows a limit-reached message (Req 1.9)', async () => {
    const user = userEvent.setup()
    const { textarea } = setup()

    // Paste is used instead of per-key typing so the long string is applied at once.
    const overLimit = 'a'.repeat(MAX_CHARS + 500)
    textarea.focus()
    await user.paste(overLimit)

    // onChange guard slices to MAX_CHARS regardless of the pasted length.
    expect(textarea.value.length).toBe(MAX_CHARS)

    // Counter reflects the capped length.
    expect(screen.getByText(`${MAX_CHARS.toLocaleString('en-US')} / ${MAX_CHARS.toLocaleString('en-US')}`)).toBeInTheDocument()

    // Limit-reached message is visible.
    expect(
      screen.getByText(/character limit of 10,000 reached/i)
    ).toBeInTheDocument()
  })

  it('disables the submit button and shows a loading indicator while loading (Req 7.1, 7.2)', () => {
    setup(true)

    const button = getExtractButton()
    expect(button).toBeDisabled()
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument()
  })

  it('clears the textarea, resets the counter, and calls onClear (Req 1.5)', async () => {
    const user = userEvent.setup()
    const { onClear, textarea } = setup()

    await user.type(textarea, 'some announcement text that is long enough')
    expect(textarea.value.length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(textarea.value).toBe('')
    expect(
      screen.getByText(`0 / ${MAX_CHARS.toLocaleString('en-US')}`)
    ).toBeInTheDocument()
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('populates the textarea with the sample and does not auto-submit (Req 1.6, 11.2, 11.3)', async () => {
    const user = userEvent.setup()
    const { onSubmit, textarea } = setup()

    await user.click(screen.getByRole('button', { name: /try example/i }))

    expect(textarea.value).toBe(SAMPLE_ANNOUNCEMENT)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('updates the live character counter on each keystroke (Req 1.3)', async () => {
    const user = userEvent.setup()
    const { textarea } = setup()

    await user.type(textarea, 'abc')
    expect(
      screen.getByText(`3 / ${MAX_CHARS.toLocaleString('en-US')}`)
    ).toBeInTheDocument()

    await user.type(textarea, 'de')
    expect(
      screen.getByText(`5 / ${MAX_CHARS.toLocaleString('en-US')}`)
    ).toBeInTheDocument()
  })

  it('submits valid input and calls onSubmit with the text (Req 1.2, 1.4)', async () => {
    const user = userEvent.setup()
    const { onSubmit, textarea } = setup()

    const valid = 'This announcement is definitely long enough to pass validation.'
    await user.type(textarea, valid)

    await user.click(screen.getByRole('button', { name: /extract actions/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(valid)
  })
})

import { InputValidationError } from '../types';

const MIN_LENGTH = 20;
const MAX_LENGTH = 10_000;

/**
 * Validates that the given value is a non-empty string within the allowed
 * character range (20–10,000 characters).
 *
 * Throws `InputValidationError` for any of the following conditions:
 *  - The value is not a string
 *  - The string is empty or contains only whitespace
 *  - The string's length is less than 20 characters
 *  - The string's length is greater than 10,000 characters
 *
 * Returns `void` when the input is valid.
 *
 * Requirements: 2.3, 2.4, 4.7
 */
export function validateInput(announcement: unknown): void {
  if (typeof announcement !== 'string') {
    throw new InputValidationError(
      'Announcement is required and must be a string between 20 and 10,000 characters.'
    );
  }

  if (announcement.trim().length === 0) {
    throw new InputValidationError(
      'Announcement is required and must be between 20 and 10,000 characters.'
    );
  }

  if (announcement.length < MIN_LENGTH) {
    throw new InputValidationError(
      `Announcement is too short. Please provide between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`
    );
  }

  if (announcement.length > MAX_LENGTH) {
    throw new InputValidationError(
      `Announcement is too long. Please provide between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`
    );
  }
}

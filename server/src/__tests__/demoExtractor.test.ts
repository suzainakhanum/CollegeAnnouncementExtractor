// Feature: campus-action-extractor
// Unit tests for the deterministic demo extractor (local fallback).
// Validates: Requirements 3.1, 3.3, 3.4, 3.6, 5.1

import { demoExtract } from '../utils/demoExtractor';
import { validateSchema } from '../utils/validateSchema';

// A realistic announcement mirroring the client sample.
const SAMPLE =
  'Attention second-year Engineering students and all Computer Science majors: ' +
  'the Data Structures midterm exam has been rescheduled from October 7 to October 14 at 9:00 AM in Hall B. ' +
  'You must register for the exam slot on the student portal by October 10. ' +
  'A revision session will be held on October 12 at 2:00 PM. ' +
  'On exam day, you must bring your student ID and submit your signed lab consent form. ' +
  'Students with approved medical leave are exempt from the registration deadline.';

describe('demoExtractor.demoExtract', () => {
  it('produces output that passes the shared schema validator (Req 5.1)', () => {
    const result = demoExtract(SAMPLE);
    // Must not throw — same validator used for real AI responses.
    expect(() => validateSchema(result)).not.toThrow();
  });

  it('is deterministic: identical input yields identical output', () => {
    const a = demoExtract(SAMPLE);
    const b = demoExtract(SAMPLE);
    expect(a).toEqual(b);
  });

  it('extracts only dates explicitly present in the text (no invented dates)', () => {
    const result = demoExtract(SAMPLE);
    const dates = result.importantDates.map((d) => d.date);
    // The four month-day literals in the sample.
    expect(dates).toEqual(
      expect.arrayContaining(['October 7', 'October 14', 'October 10', 'October 12'])
    );
    // Every extracted date literal must actually appear in the source text.
    for (const date of dates) {
      expect(SAMPLE).toContain(date);
    }
  });

  it('only promotes mandatory ("must"/"required") sentences to required actions', () => {
    const result = demoExtract(SAMPLE);
    // Both required-action sentences contain "must".
    expect(result.requiredActions.length).toBeGreaterThanOrEqual(1);
    for (const action of result.requiredActions) {
      expect(action.toLowerCase()).toMatch(/must|required|shall|mandatory|need to submit/);
    }
  });

  it('captures affected groups and exemptions that are explicitly stated', () => {
    const result = demoExtract(SAMPLE);
    expect(result.whoIsAffected.join(' ').toLowerCase()).toContain('engineering');
    expect(result.exceptions.join(' ').toLowerCase()).toContain('exempt');
  });

  it('classifies priority as Important when actions/dates exist without urgency words', () => {
    const result = demoExtract(SAMPLE);
    expect(result.priority).toBe('Important');
  });

  it('classifies priority as Urgent when explicit urgency language is present', () => {
    const urgent =
      'All students must submit the form immediately. This is urgent and applies to everyone.';
    expect(demoExtract(urgent).priority).toBe('Urgent');
  });

  it('uses the specified placeholders and empty arrays when content is absent', () => {
    const bland =
      'The campus library will feature a new reading nook near the east wing.';
    const result = demoExtract(bland);
    expect(result.requiredActions).toEqual([
      'No required actions were identified in the announcement.',
    ]);
    expect(result.whoIsAffected).toEqual(['Not mentioned in the announcement.']);
    expect(result.importantDates).toEqual([]);
    expect(result.exceptions).toEqual([]);
    expect(result.documentsOrMaterials).toEqual([]);
    // No deadlines and no actions -> Informational.
    expect(result.priority).toBe('Informational');
    // Still schema-valid.
    expect(() => validateSchema(result)).not.toThrow();
  });
});

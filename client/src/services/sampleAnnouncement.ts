/**
 * Hardcoded sample announcement used by the "Try Example" button.
 *
 * Satisfies Requirement 11.1 — the text is 150–800 characters and contains:
 *  - a schedule change (Midterm exam moved to a new date)
 *  - two distinct affected student groups (second-year Engineering students,
 *    all Computer Science majors)
 *  - three dates with associated events (Oct 14 exam, Oct 10 registration
 *    deadline, Oct 12 revision session)
 *  - two required actions (register on the portal, bring student ID)
 *  - an exemption (students with approved medical leave)
 *  - a required document (signed lab consent form)
 */
export const SAMPLE_ANNOUNCEMENT: string =
  'Attention second-year Engineering students and all Computer Science majors: ' +
  'the Data Structures midterm exam has been rescheduled from October 7 to October 14 at 9:00 AM in Hall B. ' +
  'You must register for the exam slot on the student portal by October 10. ' +
  'A revision session will be held on October 12 at 2:00 PM. ' +
  'On exam day, you must bring your student ID and submit your signed lab consent form. ' +
  'Students with approved medical leave are exempt from the registration deadline.';

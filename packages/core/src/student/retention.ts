import type { Clock } from "../ports";

/**
 * F2 (spec fix): retention is computed from programme duration and the
 * actual graduatedAt date, not stored as a static field.
 * See docs/kickoff/00-decision-record.md §"Spec fixes applied", F2.
 *
 * Retention window: graduation + 5 years (docs/copy/landing-page.md,
 * Section 5, Column 4 — "How long we keep it").
 */
const RETENTION_YEARS_AFTER_GRADUATION = 5;

export function computeDeletionDueAt(graduatedAt: Date, clock: Pick<Clock, "now"> = { now: () => new Date() }): Date {
  void clock;
  const due = new Date(graduatedAt);
  due.setFullYear(due.getFullYear() + RETENTION_YEARS_AFTER_GRADUATION);
  return due;
}

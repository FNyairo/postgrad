/**
 * F2 (spec fix): retention while the student has not yet graduated.
 * graduatedAt is unknown at registration time, so retentionUntil cannot yet
 * be "graduation + 5 years" (that's computeDeletionDueAt in retention.ts,
 * used once graduatedAt is actually recorded). Until then we derive a
 * placeholder ceiling from admission + expected programme duration.
 *
 * GRACE_YEARS is not sourced from any spec document — it's a placeholder
 * allowance for late defence before the record is reviewed. Confirm the
 * department's actual policy value before this ships; 1 year is a
 * conservative guess, not a decision.
 */
const GRACE_YEARS = 1;
const POST_GRACE_RETENTION_YEARS = 5;

export function computeDraftRetentionUntil(
  yearAdmission: number,
  programmeDurationYears: number | null,
): Date {
  const duration = programmeDurationYears ?? 3; // fallback if taxonomy has no duration on file
  const year = yearAdmission + duration + GRACE_YEARS + POST_GRACE_RETENTION_YEARS;
  return new Date(Date.UTC(year, 0, 1));
}

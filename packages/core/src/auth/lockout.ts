/**
 * Account lockout after repeated failed logins. Values are deliberately
 * conservative for a departmental register with a small user count — see
 * StaffUser.failedLogins / lockedUntil in schema.prisma.
 */
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export function shouldLock(failedLogins: number): boolean {
  return failedLogins >= MAX_FAILED_LOGINS;
}

export function computeLockoutUntil(now: Date = new Date()): Date {
  return new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000);
}

export function isLockedOut(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return lockedUntil !== null && now < lockedUntil;
}

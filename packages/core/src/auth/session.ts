import { createHash, randomBytes } from "node:crypto";

/**
 * Hand-rolled session module — see docs/kickoff/01-technical-proposal.md §2
 * for why (no OAuth, no provider abstraction needed; ~200 lines, auditable).
 *
 * The token handed to the browser is 32 random bytes (base64url). Only its
 * SHA-256 digest is stored as Session.id in the database, so a stolen DB
 * dump does not hand out working sessions (schema.prisma comment on
 * Session.id).
 */

const ABSOLUTE_TIMEOUT_HOURS = 12;
const IDLE_TIMEOUT_MINUTES = 30;

export interface IssuedSession {
  /** Give this to the browser as the cookie value. Never store it. */
  token: string;
  /** Store this as Session.id. */
  tokenHash: string;
  expiresAt: Date;
}

export function issueSession(now: Date = new Date()): IssuedSession {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000);
  return { token, tokenHash: hashSessionToken(token), expiresAt };
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface SessionRecord {
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

/**
 * A session is valid only if it is unrevoked, inside its absolute lifetime,
 * and has been seen inside the idle window. Both timeouts are enforced —
 * this is not "whichever is later".
 */
export function isSessionValid(session: SessionRecord, now: Date = new Date()): boolean {
  if (session.revokedAt) return false;
  if (now >= session.expiresAt) return false;
  const idleDeadline = new Date(session.lastSeenAt.getTime() + IDLE_TIMEOUT_MINUTES * 60 * 1000);
  if (now >= idleDeadline) return false;
  return true;
}

export const sessionTimeouts = {
  ABSOLUTE_TIMEOUT_HOURS,
  IDLE_TIMEOUT_MINUTES,
} as const;

import "server-only";
import { cookies, headers } from "next/headers";
import { createHash } from "node:crypto";
import { issueSession, isSessionValid, hashSessionToken } from "@pgsts/core";
import { sessionRepo, staffUserRepo } from "@pgsts/adapter-prisma";

export const SESSION_COOKIE = "pgsts_session";

// F6 (spec fix): HMAC-SHA-256(key, ip), not SHA-256(ip + pepper). Plain
// SHA-256 keyed with a secret pepper is still technically vulnerable to the
// IPv4 space being exhaustively enumerable; a keyed MAC is correct.
// IP_HASH_PEPPER is required — this throws rather than silently hashing
// with an empty key if the env var is missing.
function hashIp(ip: string): string {
  const pepper = process.env.IP_HASH_PEPPER;
  if (!pepper) throw new Error("IP_HASH_PEPPER is not set");
  return createHash("sha256").update(pepper).update(ip).digest("hex");
}

export async function createStaffSession(userId: string) {
  const issued = issueSession();
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = hdrs.get("user-agent");
  await sessionRepo.create(userId, issued, hashIp(ip), userAgent);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, issued.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: issued.expiresAt,
  });
}

export async function getCurrentStaffSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const record = await sessionRepo.findById(tokenHash);
  if (!record || !isSessionValid(record)) return null;

  await sessionRepo.touch(tokenHash);
  return record;
}

/**
 * Session + the StaffUser it belongs to, in one call — every page/route
 * that needs to check a role (canExportRegister, canEditStudents, ...)
 * wants both, and a disabled/deleted user should invalidate the session
 * even if the session row itself is still technically unexpired.
 */
export async function getCurrentStaffUser() {
  const session = await getCurrentStaffSession();
  if (!session) return null;

  const user = await staffUserRepo.findById(session.userId);
  if (!user || user.disabledAt) return null;

  return user;
}

export async function destroyStaffSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await sessionRepo.revoke(hashSessionToken(token));
  jar.delete(SESSION_COOKIE);
}

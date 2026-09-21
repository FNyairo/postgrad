import { describe, it, expect } from "vitest";
import { issueSession, hashSessionToken, isSessionValid } from "../session";

describe("issueSession", () => {
  it("returns a token whose hash matches the stored tokenHash", () => {
    const s = issueSession();
    expect(hashSessionToken(s.token)).toBe(s.tokenHash);
  });

  it("sets an absolute expiry in the future", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const s = issueSession(now);
    expect(s.expiresAt.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("isSessionValid", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("is valid when unrevoked, unexpired, and recently seen", () => {
    expect(
      isSessionValid(
        { expiresAt: new Date("2026-01-01T18:00:00Z"), lastSeenAt: new Date("2026-01-01T11:50:00Z"), revokedAt: null },
        now,
      ),
    ).toBe(true);
  });

  it("is invalid once revoked, even if otherwise fresh", () => {
    expect(
      isSessionValid(
        { expiresAt: new Date("2026-01-01T18:00:00Z"), lastSeenAt: now, revokedAt: new Date("2026-01-01T11:00:00Z") },
        now,
      ),
    ).toBe(false);
  });

  it("is invalid past the absolute timeout", () => {
    expect(
      isSessionValid(
        { expiresAt: new Date("2026-01-01T11:00:00Z"), lastSeenAt: now, revokedAt: null },
        now,
      ),
    ).toBe(false);
  });

  it("is invalid past the idle timeout even with time left on the absolute one", () => {
    expect(
      isSessionValid(
        { expiresAt: new Date("2026-01-02T00:00:00Z"), lastSeenAt: new Date("2026-01-01T11:00:00Z"), revokedAt: null },
        now,
      ),
    ).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { shouldLock, isLockedOut, computeLockoutUntil } from "../lockout";

describe("lockout", () => {
  it("locks at 5 failed attempts, not before", () => {
    expect(shouldLock(4)).toBe(false);
    expect(shouldLock(5)).toBe(true);
  });

  it("treats a future lockedUntil as locked", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const until = computeLockoutUntil(now);
    expect(isLockedOut(until, now)).toBe(true);
  });

  it("treats a past lockedUntil as not locked", () => {
    const now = new Date("2026-01-01T00:20:00Z");
    const until = new Date("2026-01-01T00:00:00Z");
    expect(isLockedOut(until, now)).toBe(false);
  });

  it("treats null as not locked", () => {
    expect(isLockedOut(null)).toBe(false);
  });
});

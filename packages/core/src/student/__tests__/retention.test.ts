import { describe, it, expect } from "vitest";
import { computeDeletionDueAt } from "../retention";

describe("computeDeletionDueAt", () => {
  it("adds five years to the graduation date", () => {
    const graduatedAt = new Date("2026-06-15T00:00:00Z");
    const due = computeDeletionDueAt(graduatedAt);
    expect(due.getUTCFullYear()).toBe(2031);
    expect(due.getUTCMonth()).toBe(graduatedAt.getUTCMonth());
    expect(due.getUTCDate()).toBe(graduatedAt.getUTCDate());
  });
});

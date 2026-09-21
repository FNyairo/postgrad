import { describe, expect, it } from "vitest";
import {
  canViewRegister,
  canExportRegister,
  canEditStudents,
  canManageShareTokens,
  canManageStaff,
  isReadOnlyRole,
} from "../permissions";

describe("SUPER_ADMIN", () => {
  it("can do everything", () => {
    expect(canViewRegister("SUPER_ADMIN")).toBe(true);
    expect(canExportRegister("SUPER_ADMIN")).toBe(true);
    expect(canEditStudents("SUPER_ADMIN")).toBe(true);
    expect(canManageShareTokens("SUPER_ADMIN")).toBe(true);
    expect(canManageStaff("SUPER_ADMIN")).toBe(true);
    expect(isReadOnlyRole("SUPER_ADMIN")).toBe(false);
  });
});

describe("COORDINATOR", () => {
  it("runs the register but cannot manage staff accounts", () => {
    expect(canViewRegister("COORDINATOR")).toBe(true);
    expect(canExportRegister("COORDINATOR")).toBe(true);
    expect(canEditStudents("COORDINATOR")).toBe(true);
    expect(canManageShareTokens("COORDINATOR")).toBe(true);
    expect(canManageStaff("COORDINATOR")).toBe(false);
    expect(isReadOnlyRole("COORDINATOR")).toBe(false);
  });
});

describe("VIEWER", () => {
  it("may look at the register and nothing else", () => {
    expect(canViewRegister("VIEWER")).toBe(true);
    expect(canEditStudents("VIEWER")).toBe(false);
    expect(canManageShareTokens("VIEWER")).toBe(false);
    expect(canManageStaff("VIEWER")).toBe(false);
    expect(isReadOnlyRole("VIEWER")).toBe(true);
  });

  it("cannot export unless the account is granted it", () => {
    // Looking at the register and taking a copy away are separate decisions.
    expect(canExportRegister("VIEWER")).toBe(false);
    expect(canExportRegister("VIEWER", false)).toBe(false);
    expect(canExportRegister("VIEWER", true)).toBe(true);
  });
});

describe("CHAIRPERSON", () => {
  // The chairperson feature is deferred (institution.ts, chairpersonEnabled),
  // but the role is modelled as read-only rather than powerless, so turning it
  // back on is a config flip rather than a permissions rewrite.
  it("is read-only, like a viewer", () => {
    expect(canViewRegister("CHAIRPERSON")).toBe(true);
    expect(canEditStudents("CHAIRPERSON")).toBe(false);
    expect(canManageShareTokens("CHAIRPERSON")).toBe(false);
    expect(canManageStaff("CHAIRPERSON")).toBe(false);
    expect(isReadOnlyRole("CHAIRPERSON")).toBe(true);
  });

  it("cannot export unless granted", () => {
    expect(canExportRegister("CHAIRPERSON")).toBe(false);
    expect(canExportRegister("CHAIRPERSON", true)).toBe(true);
  });
});

describe("editing is never available to read-only roles", () => {
  it.each(["VIEWER", "CHAIRPERSON"] as const)("%s cannot edit", (role) => {
    expect(canEditStudents(role)).toBe(false);
  });
});

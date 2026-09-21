import { describe, it, expect } from "vitest";
import { canViewRegister, canExportRegister, canEditStudents, canManageStaff } from "../permissions";

describe("role permissions", () => {
  it("SUPER_ADMIN can do everything", () => {
    expect(canViewRegister("SUPER_ADMIN")).toBe(true);
    expect(canExportRegister("SUPER_ADMIN")).toBe(true);
    expect(canEditStudents("SUPER_ADMIN")).toBe(true);
    expect(canManageStaff("SUPER_ADMIN")).toBe(true);
  });

  it("COORDINATOR can view, export, and edit, but not manage staff", () => {
    expect(canViewRegister("COORDINATOR")).toBe(true);
    expect(canExportRegister("COORDINATOR")).toBe(true);
    expect(canEditStudents("COORDINATOR")).toBe(true);
    expect(canManageStaff("COORDINATOR")).toBe(false);
  });

  it("CHAIRPERSON has no capabilities while the feature is deferred", () => {
    expect(canViewRegister("CHAIRPERSON")).toBe(false);
    expect(canExportRegister("CHAIRPERSON")).toBe(false);
    expect(canEditStudents("CHAIRPERSON")).toBe(false);
    expect(canManageStaff("CHAIRPERSON")).toBe(false);
  });
});

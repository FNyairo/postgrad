/**
 * Role capabilities. Kept as pure functions (role in, boolean out) so the
 * dashboard, the export route, and any future route can all ask the same
 * question the same way — there is no scattered "if role === ..." logic to
 * drift out of sync between files.
 *
 * CHAIRPERSON exists in the schema (docs/kickoff/00-decision-record.md) but
 * the feature is deferred — see packages/config/institution.ts,
 * chairpersonEnabled. Treated here as having no capabilities for now,
 * rather than removed, so re-enabling it later is a config flip, not a
 * schema change.
 */
export type StaffRole = "SUPER_ADMIN" | "COORDINATOR" | "CHAIRPERSON";

export function canViewRegister(role: StaffRole): boolean {
  return role === "SUPER_ADMIN" || role === "COORDINATOR";
}

export function canExportRegister(role: StaffRole): boolean {
  return role === "SUPER_ADMIN" || role === "COORDINATOR";
}

// F1 (spec fix): edit + soft-delete, always behind a mandatory reason —
// enforced by the caller requiring a reason string, not by this function.
export function canEditStudents(role: StaffRole): boolean {
  return role === "SUPER_ADMIN" || role === "COORDINATOR";
}

// Creating/disabling StaffUser accounts, issuing Chairperson share tokens
// (once that feature is back on) — SUPER_ADMIN only.
export function canManageStaff(role: StaffRole): boolean {
  return role === "SUPER_ADMIN";
}

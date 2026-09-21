/**
 * Role capabilities. Kept as pure functions (role in, boolean out) so the
 * dashboard, the export route, and any future route can all ask the same
 * question the same way — there is no scattered "if role === ..." logic to
 * drift out of sync between files.
 *
 * VIEWER is read-only: the register, search, filter and record detail, but
 * no edit, no soft-delete, no share tokens, no staff management. Export is
 * off by default and granted per-account (see canExportRegister) rather than
 * by role, because "may look" and "may take a copy away" are different
 * decisions for a register of personal data.
 *
 * CHAIRPERSON exists in the schema (docs/kickoff/00-decision-record.md) but
 * the feature is deferred — see packages/config/institution.ts,
 * chairpersonEnabled. Treated here as read-only with no export, rather than
 * removed, so re-enabling it later is a config flip, not a schema change.
 */
export type StaffRole = "SUPER_ADMIN" | "COORDINATOR" | "CHAIRPERSON" | "VIEWER";

/** Roles that see the register but may never change it. */
export function isReadOnlyRole(role: StaffRole): boolean {
  return role === "VIEWER" || role === "CHAIRPERSON";
}

export function canViewRegister(role: StaffRole): boolean {
  return (
    role === "SUPER_ADMIN" || role === "COORDINATOR" || role === "VIEWER" || role === "CHAIRPERSON"
  );
}

/**
 * Export is a role decision for staff who administer the register, and an
 * per-account decision for read-only roles — hence the second argument.
 * Callers pass the account's `allowExport` flag; omitting it denies, which
 * is the safe default for a new viewer account.
 */
export function canExportRegister(role: StaffRole, allowExport = false): boolean {
  if (role === "SUPER_ADMIN" || role === "COORDINATOR") return true;
  if (isReadOnlyRole(role)) return allowExport;
  return false;
}

// F1 (spec fix): edit + soft-delete, always behind a mandatory reason —
// enforced by the caller requiring a reason string, not by this function.
export function canEditStudents(role: StaffRole): boolean {
  return role === "SUPER_ADMIN" || role === "COORDINATOR";
}

// Issuing and revoking share tokens — coordinators and above.
export function canManageShareTokens(role: StaffRole): boolean {
  return role === "SUPER_ADMIN" || role === "COORDINATOR";
}

// Creating/disabling StaffUser accounts, taxonomy, retention rules, and the
// full audit log — SUPER_ADMIN only.
export function canManageStaff(role: StaffRole): boolean {
  return role === "SUPER_ADMIN";
}

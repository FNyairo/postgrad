import { redirect } from "next/navigation";
import {
  canEditStudents,
  canExportRegister,
  canManageStaff,
  isReadOnlyRole,
  type StaffRole,
} from "@pgsts/core";
import { requireStaffUser, destroyStaffSession } from "@/lib/session";
import { studentRepo } from "@pgsts/adapter-prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Also bounces an account still on its temporary password to /account/password.
  const staffUser = await requireStaffUser();
  const role = staffUser.role as StaffRole;

  // One set of checks, read once, passed down. The viewer and coordinator
  // dashboards are the same component tree — the difference is which controls
  // these flags allow, never a separate page.
  const perms = {
    canEdit: canEditStudents(role),
    canExport: canExportRegister(role, staffUser.allowExport),
    canManageStaff: canManageStaff(role),
    readOnly: isReadOnlyRole(role),
  };

  const [students, total] = await Promise.all([
    studentRepo.list({ take: 50 }),
    studentRepo.count(),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <h1 className={styles.title}>Postgraduate register</h1>
          <p className={styles.meta}>
            Signed in as {staffUser.name}
            {perms.readOnly && (
              <>
                {" "}
                <span className={styles.badge} title="This account cannot change records">
                  Read-only access
                </span>
              </>
            )}
          </p>
        </div>

        <div className={styles.actions}>
          {perms.canExport && (
            <a className={styles.action} href="/api/v1/export">
              Export CSV
            </a>
          )}
          {perms.canManageStaff && (
            <a className={styles.action} href="/account/password">
              Account
            </a>
          )}
          <form
            action={async () => {
              "use server";
              await destroyStaffSession();
              redirect("/login");
            }}
          >
            <button type="submit" className={styles.signOut}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      <p className={styles.count}>
        {total} registered {total === 1 ? "student" : "students"}
      </p>

      {/*
        Table only for now — search, filter, the detail drawer, and edit-
        with-reason (FIX F1) are the rest of build-order step 6 and are not
        in this pass. When they land they read `perms` rather than the role,
        so a new role never needs the dashboard rewritten.
      */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Reg. number</th>
              <th>Programme</th>
              <th>Stage</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  No registrations yet.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id}>
                  <td>{s.fullName}</td>
                  <td className={styles.mono}>{s.regNumber}</td>
                  <td>{s.programme}</td>
                  <td>{s.researchStage}</td>
                  <td className={styles.mono}>{s.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

import { redirect } from "next/navigation";
import { getCurrentStaffSession, destroyStaffSession } from "../../../lib/session";
import { studentRepo } from "@pgsts/adapter-prisma";

export default async function DashboardPage() {
  const session = await getCurrentStaffSession();
  if (!session) redirect("/login");

  const [students, total] = await Promise.all([
    studentRepo.list({ take: 50 }),
    studentRepo.count(),
  ]);

  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>Postgraduate register</h1>
        <form action={async () => { "use server"; await destroyStaffSession(); redirect("/login"); }}>
          <button type="submit">Sign out</button>
        </form>
      </header>

      <p>{total} registered students</p>

      {/*
        Table only for now — search, filter, the detail drawer, and edit-
        with-reason (FIX F1) are the rest of build-order step 6 and are not
        in this pass. Charts are dynamically imported per
        docs/kickoff/02-repo-structure.md ("never in the student bundle") —
        not added here since this route isn't the student-facing bundle
        anyway, but keeping the pattern consistent.
      */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1.5rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th>Name</th>
            <th>Reg. number</th>
            <th>Programme</th>
            <th>Stage</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
              <td>{s.fullName}</td>
              <td>{s.regNumber}</td>
              <td>{s.programme}</td>
              <td>{s.researchStage}</td>
              <td>{s.createdAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

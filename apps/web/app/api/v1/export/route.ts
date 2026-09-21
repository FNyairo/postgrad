import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { canExportRegister } from "@pgsts/core";
import { prisma } from "@pgsts/adapter-prisma";
import { getCurrentStaffUser } from "../../../../lib/session";

function hashIp(ip: string): string {
  const pepper = process.env.IP_HASH_PEPPER;
  if (!pepper) throw new Error("IP_HASH_PEPPER is not set");
  return createHash("sha256").update(pepper).update(ip).digest("hex");
}

const CSV_COLUMNS = [
  "fullName", "regNumber", "email", "phone",
  "programme", "degreeLevel", "yearAdmission",
  "researchTitle", "supervisors", "researchStage",
  "createdAt",
] as const;

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Streamed, never written to disk — matches
// docs/kickoff/02-repo-structure.md's api/v1/export/route.ts note. Paged
// through the table in batches rather than one findMany() for the whole
// register, so this doesn't hold the entire student list in memory at once
// as the register grows.
const PAGE_SIZE = 500;

export async function GET() {
  const staffUser = await getCurrentStaffUser();
  if (!staffUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!canExportRegister(staffUser.role)) {
    return NextResponse.json({ error: "Your role does not have export access." }, { status: 403 });
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Audit the export itself — this is exactly the kind of action
  // AuditLog.action's comment ("export.csv") calls out.
  await prisma.auditLog.create({
    data: {
      actorType: "staff",
      actorId: staffUser.id,
      action: "export.csv",
      ipHash: hashIp(ip),
    },
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(CSV_COLUMNS.join(",") + "\n"));

      let skip = 0;
      for (;;) {
        const batch = await prisma.student.findMany({
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          skip,
          take: PAGE_SIZE,
        });
        if (batch.length === 0) break;

        for (const s of batch) {
          const row = CSV_COLUMNS.map((col) => csvEscape((s as Record<string, unknown>)[col])).join(",");
          controller.enqueue(encoder.encode(row + "\n"));
        }

        skip += batch.length;
        if (batch.length < PAGE_SIZE) break;
      }

      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pgsts-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

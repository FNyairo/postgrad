import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { studentRegistrationSchema } from "@pgsts/schema";
import { slugify, computeDraftRetentionUntil } from "@pgsts/core";
import { studentRepo, DuplicateRegistrationError } from "@pgsts/adapter-prisma";
import { institution } from "@pgsts/config";

function hashIp(ip: string): string {
  const pepper = process.env.IP_HASH_PEPPER;
  if (!pepper) throw new Error("IP_HASH_PEPPER is not set");
  return createHash("sha256").update(pepper).update(ip).digest("hex");
}

// Rate limiting (RateLimit table / MySQL, per 01-technical-proposal.md §1)
// and CSRF (double-submit cookie, per §4) are not wired into this handler
// yet — both are explicitly called out in the technical proposal as required
// on every mutating /api/v1/* route before this is production-safe.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = studentRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed.", issues: parsed.data ?? parsed.error.flatten() }, { status: 422 });
  }

  const input = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    const student = await studentRepo.create({
      fullName: input.fullName,
      regNumber: input.regNumber,
      email: input.email,
      phone: input.phone,
      programme: input.programme.raw,
      programmeSlug: slugify(input.programme.slug || input.programme.raw),
      degreeLevel: input.degreeLevel.raw,
      degreeLevelSlug: slugify(input.degreeLevel.slug || input.degreeLevel.raw),
      yearAdmission: input.admissionYear,
      programmeDurationYears: null, // resolved from Taxonomy at submit — taxonomy lookup not wired up yet
      researchTitle: input.researchTitle,
      supervisors: input.supervisors.join("; "),
      researchStage: input.stage.raw,
      researchStageSlug: slugify(input.stage.slug || input.stage.raw),
      noticeAcknowledgedAt: new Date(),
      noticeVersion: institution.noticeVersion,
      lawfulBasis: institution.lawfulBasisMode,
      retentionUntil: computeDraftRetentionUntil(input.admissionYear, null),
      retentionBasis: "derived:admission+duration+grace+5y",
      submissionIpHash: hashIp(ip),
      userAgentHash: null,
    });

    return NextResponse.json({ id: student.id }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateRegistrationError) {
      // F7: identical response whether it was regNumber or email that
      // collided — do not let the client distinguish the two.
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

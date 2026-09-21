import { createHash } from "node:crypto";
import type { StudentRegistrationInput } from "@pgsts/schema";
import { slugify, computeDraftRetentionUntil } from "@pgsts/core";
import { studentRepo } from "@pgsts/adapter-prisma";
import { institution } from "@pgsts/config";

/**
 * The single place a Student row is created.
 *
 * Both the JSON API route (/api/v1/students) and the registration form's
 * server action go through here, so the derived columns — retention, notice
 * version, IP hash — can never drift apart between the two entry points.
 *
 * Callers are responsible for catching DuplicateRegistrationError and
 * rendering the F7 response; this function deliberately does not translate it,
 * so neither caller can accidentally leak which field collided.
 */
export async function registerStudent(input: StudentRegistrationInput, ip: string) {
  return studentRepo.create({
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
}

export function hashIp(ip: string): string {
  const pepper = process.env.IP_HASH_PEPPER;
  if (!pepper) throw new Error("IP_HASH_PEPPER is not set");
  return createHash("sha256").update(pepper).update(ip).digest("hex");
}

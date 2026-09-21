// Every department-specific string in one place. See
// docs/kickoff/02-repo-structure.md, "Why this shape".
//
// dpoName is still a placeholder — the user supplied the university name and
// a contact email but not a named Data Protection Officer. Kenyan DPA
// practice expects a named DPO, not just a role inbox, so fill this in
// before the Privacy Notice / footer go live. See docs/copy/landing-page.md
// reviewer checklist.
export const institution = {
  universityName: "University of Embu",
  departmentName: "Department of Education",
  dpoName: "[NAME]",
  dpoEmail: "info@learning254.com",
  retentionYearsAfterGraduation: 5,
  // Chairperson read-only access + share-token flow is deferred by request
  // (not Phase-1 scope for now). The Prisma schema still has ShareToken /
  // Role.CHAIRPERSON — that's harmless unused capacity, not a build target.
  // Toggle this back on to re-enable the feature and its landing-page copy.
  chairpersonEnabled: false,
  // Note B (docs/copy/landing-page.md) is not yet signed off by the DPO.
  // "notice" is the recommended default from that note's own analysis
  // (legitimate interest + acknowledgement, not a consent checkbox) and is
  // built as a single-column rename away from "consent" either way. Treat
  // this as PROVISIONAL, not a decision made on the department's behalf.
  lawfulBasisMode: "notice" as "notice" | "consent",
  noticeVersion: "privacy-v0.1-2026-09-DRAFT",
} as const;

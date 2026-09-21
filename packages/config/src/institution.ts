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

// ---------------------------------------------------------------------------
// REGISTRATION FORM
// ---------------------------------------------------------------------------

export const registration = {
  // Year-of-admission dropdown spans this many years back from the current
  // year, newest first. Fifteen covers a long-overdue PhD without turning the
  // list into a scroll.
  admissionYearsBack: 15,

  nameMinLength: 2,
  nameMaxLength: 80,

  researchTopicMinLength: 20,
  researchTopicMaxLength: 1000,
  // Show the character counter only once the student is near the ceiling,
  // so it reads as a warning rather than a running commentary.
  researchTopicCounterFrom: 800,

  // Kenyan mobile numbers: optional +254 or leading 0, then 7xx/1xx + 8 digits.
  phonePattern: "^(?:\\+254|0)?[17]\\d{8}$",

  // NOTE: the department has not supplied a canonical registration-number
  // format, and the column is only VARCHAR(50) with no CHECK. This pattern is
  // deliberately permissive — it rejects obvious junk (it demands at least one
  // digit and a sane length) without gambling on a shape nobody confirmed.
  // Tighten it once the real format is known; the hint below should change
  // with it.
  regNumberPattern: "^(?=.*\\d)[A-Za-z0-9/\\-.]{4,50}$",
  regNumberHint: "As printed on your admission letter, e.g. E521/1234/2023",
} as const;

// Fallback taxonomy, used only when the Taxonomy table is empty or
// unreachable. The database is the source of truth whenever it has rows —
// these mirror prisma/seed.ts so the form still works on a fresh install
// where the seed has not been run.
export const taxonomyFallback = {
  degreeLevels: [
    { slug: "masters", label: "Master's" },
    { slug: "phd", label: "PhD" },
  ],
  programmes: [
    { slug: "med-curriculum-studies", label: "Master of Education (Curriculum Studies)" },
    { slug: "med-educational-administration", label: "Master of Education (Educational Administration)" },
    { slug: "med-early-childhood-education", label: "Master of Education (Early Childhood Education)" },
    { slug: "phd-education", label: "PhD in Education" },
  ],
  researchStages: [
    { slug: "proposal-development", label: "Proposal development" },
    { slug: "proposal-defence", label: "Proposal defence" },
    { slug: "data-collection", label: "Data collection" },
    { slug: "thesis-writing", label: "Thesis / dissertation writing" },
    { slug: "thesis-defence", label: "Thesis / dissertation defence" },
  ],
} as const;

// Which degree level each programme belongs to.
//
// The Taxonomy table has no parent/child relation — PROGRAMME and
// DEGREE_LEVEL are flat siblings — so the cascade in the form needs this
// mapping. Keeping it here means a new programme can be grouped correctly by
// editing one line, with no migration. A `parentSlug` column on Taxonomy is
// the proper fix and would make this obsolete.
//
// Any programme missing from this map falls back to matching on its slug
// prefix, and failing that appears under every level rather than vanishing.
export const programmeDegreeLevel: Record<string, string> = {
  "med-curriculum-studies": "masters",
  "med-educational-administration": "masters",
  "med-early-childhood-education": "masters",
  "phd-education": "phd",
};

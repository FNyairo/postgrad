/**
 * Two staff accounts + starter taxonomy suggestions.
 *
 * Safe to re-run: everything here is an upsert, keyed on the natural unique
 * constraint (StaffUser.email; Taxonomy's [kind, slug]).
 *
 * Accounts:
 *   - SUPER_ADMIN — all rights (see packages/core/src/auth/permissions.ts):
 *     view, export, edit students, and manage other staff accounts. The
 *     schema has no "account management" UI/route yet — that capability
 *     exists in the permission function but nothing calls it yet.
 *   - COORDINATOR — view, export, and edit students (with a mandatory
 *     reason, per FIX F1), but cannot manage other staff accounts. This is
 *     the closest existing role to "mid-level admin, view/export/reports" —
 *     note it's actually BROADER than pure view+export, since it also
 *     carries the coordinator's edit/soft-delete rights the original spec
 *     gives that role. There is no narrower "view+export only, no edit"
 *     role in the schema; ask if you want one added as an actual role
 *     rather than overloading COORDINATOR.
 *   - CHAIRPERSON is deferred (see institution.ts, chairpersonEnabled) —
 *     not seeded.
 *
 * "Generate some reports" is only a raw CSV export right now
 * (/api/v1/export) — there is no aggregated/summary report view yet.
 *
 * Credentials: SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD and
 * SEED_COORDINATOR_EMAIL / SEED_COORDINATOR_PASSWORD override the
 * defaults. Any password not supplied is randomly generated and printed
 * ONCE to the console, never stored anywhere else. mustChangePassword is
 * always true on a freshly seeded account.
 *
 * Taxonomy rows below are starter suggestions to populate the registration
 * form's comboboxes on day one — NOT the department's confirmed programme
 * list. Nothing restricts a student to these (see FIX F3 in the decision
 * record); edit or replace them once the department confirms the real set.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { argon2Hasher } from "@pgsts/adapter-argon2";

const prisma = new PrismaClient();

type SeedAccount = {
  role: "SUPER_ADMIN" | "COORDINATOR";
  name: string;
  envEmailKey: string;
  envPasswordKey: string;
  defaultEmail: string;
};

const STAFF_ACCOUNTS: SeedAccount[] = [
  {
    role: "SUPER_ADMIN",
    name: "System Administrator",
    envEmailKey: "SEED_SUPER_ADMIN_EMAIL",
    envPasswordKey: "SEED_SUPER_ADMIN_PASSWORD",
    defaultEmail: "admin@embuni.ac.ke",
  },
  {
    role: "COORDINATOR",
    name: "Postgraduate Coordinator",
    envEmailKey: "SEED_COORDINATOR_EMAIL",
    envPasswordKey: "SEED_COORDINATOR_PASSWORD",
    defaultEmail: "coordinator@embuni.ac.ke",
  },
];

async function seedStaffAccounts() {
  for (const account of STAFF_ACCOUNTS) {
    const email = process.env[account.envEmailKey] ?? account.defaultEmail;
    const providedPassword = process.env[account.envPasswordKey];
    const password = providedPassword ?? randomBytes(12).toString("base64url");

    const passwordHash = await argon2Hasher.hash(password);

    await prisma.staffUser.upsert({
      where: { email },
      update: {}, // do not overwrite an existing account's password on re-run
      create: {
        email,
        name: account.name,
        role: account.role,
        passwordHash,
        mustChangePassword: true,
      },
    });

    console.log(`\n${account.role} account ready: ${email}`);
    if (!providedPassword) {
      console.log(`Temporary password (shown once, not stored anywhere): ${password}`);
      console.log("mustChangePassword is set — cannot be used past first login without changing it.");
    } else {
      console.log(`Password taken from ${account.envPasswordKey}.`);
    }
  }
  console.log("");
}

type TaxonomySeed = {
  kind: "PROGRAMME" | "DEGREE_LEVEL" | "RESEARCH_STAGE";
  slug: string;
  label: string;
  aliases?: string;
  durationYears?: number;
  sortOrder: number;
};

const taxonomySeeds: TaxonomySeed[] = [
  // --- Degree levels ---
  { kind: "DEGREE_LEVEL", slug: "masters", label: "Master's", aliases: "MEd\nM.Ed\nMasters\nMaster's Degree", sortOrder: 0 },
  { kind: "DEGREE_LEVEL", slug: "phd", label: "PhD", aliases: "Doctorate\nDoctoral\nPh.D.", sortOrder: 1 },

  // --- Programmes (starter suggestions — Department of Education) ---
  { kind: "PROGRAMME", slug: "med-curriculum-studies", label: "Master of Education (Curriculum Studies)", durationYears: 2, sortOrder: 0 },
  { kind: "PROGRAMME", slug: "med-educational-administration", label: "Master of Education (Educational Administration)", durationYears: 2, sortOrder: 1 },
  { kind: "PROGRAMME", slug: "med-early-childhood-education", label: "Master of Education (Early Childhood Education)", durationYears: 2, sortOrder: 2 },
  { kind: "PROGRAMME", slug: "phd-education", label: "PhD in Education", durationYears: 4, sortOrder: 3 },

  // --- Research stages ---
  { kind: "RESEARCH_STAGE", slug: "proposal-development", label: "Proposal development", sortOrder: 0 },
  { kind: "RESEARCH_STAGE", slug: "proposal-defence", label: "Proposal defence", sortOrder: 1 },
  { kind: "RESEARCH_STAGE", slug: "data-collection", label: "Data collection", sortOrder: 2 },
  { kind: "RESEARCH_STAGE", slug: "thesis-writing", label: "Thesis / dissertation writing", sortOrder: 3 },
  { kind: "RESEARCH_STAGE", slug: "thesis-defence", label: "Thesis / dissertation defence", sortOrder: 4 },
];

async function seedTaxonomy() {
  for (const t of taxonomySeeds) {
    await prisma.taxonomy.upsert({
      where: { kind_slug: { kind: t.kind, slug: t.slug } },
      update: { label: t.label, aliases: t.aliases ?? null, durationYears: t.durationYears ?? null, sortOrder: t.sortOrder },
      create: {
        kind: t.kind,
        slug: t.slug,
        label: t.label,
        aliases: t.aliases ?? null,
        durationYears: t.durationYears ?? null,
        sortOrder: t.sortOrder,
      },
    });
  }
  console.log(`Seeded ${taxonomySeeds.length} taxonomy rows.`);
}

async function main() {
  await seedStaffAccounts();
  await seedTaxonomy();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

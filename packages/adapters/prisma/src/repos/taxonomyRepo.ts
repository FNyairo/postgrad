import { prisma } from "../client";

export type TaxonomyOption = {
  slug: string;
  label: string;
  durationYears: number | null;
};

export type TaxonomyLists = {
  degreeLevels: TaxonomyOption[];
  programmes: TaxonomyOption[];
  researchStages: TaxonomyOption[];
};

/**
 * Active taxonomy rows, grouped by kind, ordered as the department set them.
 *
 * The registration form calls this at render time. It deliberately does NOT
 * throw when the database is unreachable or the table is empty — the caller
 * substitutes the fallback lists from @pgsts/config, so a missing seed
 * degrades the form to sensible defaults instead of a 500.
 */
export const taxonomyRepo = {
  async listActive(): Promise<TaxonomyLists> {
    const rows = await prisma.taxonomy.findMany({
      where: { active: true },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
      select: { kind: true, slug: true, label: true, durationYears: true },
    });

    const pick = (kind: string): TaxonomyOption[] =>
      rows
        .filter((r) => r.kind === kind)
        .map((r) => ({ slug: r.slug, label: r.label, durationYears: r.durationYears }));

    return {
      degreeLevels: pick("DEGREE_LEVEL"),
      programmes: pick("PROGRAMME"),
      researchStages: pick("RESEARCH_STAGE"),
    };
  },
};

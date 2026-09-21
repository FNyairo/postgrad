import "server-only";
import { taxonomyRepo, type TaxonomyLists } from "@pgsts/adapter-prisma";
import { taxonomyFallback } from "@pgsts/config";

export type { TaxonomyLists };

const toOption = (o: { slug: string; label: string }) => ({ ...o, durationYears: null });

function withFallback(lists: TaxonomyLists): TaxonomyLists {
  // An empty table is the expected state on an install where the seed has not
  // run. Fall back per-kind rather than all-or-nothing, so a partially seeded
  // table still contributes whatever it has.
  return {
    degreeLevels: lists.degreeLevels.length
      ? lists.degreeLevels
      : taxonomyFallback.degreeLevels.map(toOption),
    programmes: lists.programmes.length ? lists.programmes : taxonomyFallback.programmes.map(toOption),
    researchStages: lists.researchStages.length
      ? lists.researchStages
      : taxonomyFallback.researchStages.map(toOption),
  };
}

/**
 * Taxonomy for the registration form, with config fallbacks.
 *
 * A database that is down must not take the form down with it, so a failed
 * query degrades to the seeded defaults rather than throwing. Shared by the
 * page (to render the pickers) and the server action (to turn a submitted
 * slug back into the label stored in the `raw` column).
 */
export async function loadTaxonomy(): Promise<TaxonomyLists> {
  try {
    return withFallback(await taxonomyRepo.listActive());
  } catch {
    return withFallback({ degreeLevels: [], programmes: [], researchStages: [] });
  }
}

export function labelFor(options: { slug: string; label: string }[], slug: string): string {
  return options.find((o) => o.slug === slug)?.label ?? slug;
}

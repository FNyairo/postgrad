/**
 * F3 (spec fix): raw student input is kept verbatim; this only derives the
 * slug used for filtering/grouping. It never overwrites or "corrects" what
 * the student typed.
 */
export function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);
}

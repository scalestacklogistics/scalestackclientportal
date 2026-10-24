/** Which dashboard sections a client sees, based on the categories of their active services. */
export type Sections = { performance: boolean; projects: boolean; deliverables: boolean };

const PERFORMANCE = new Set(["ads", "marketing", "seo"]);
const BUILD = new Set(["website", "ecommerce", "ai"]);
const DESIGN = new Set(["design"]);

export function sectionsFor(categorySlugs: string[]): Sections {
  const has = (set: Set<string>) => categorySlugs.some((c) => set.has(c));
  return {
    performance: has(PERFORMANCE),
    projects: has(BUILD) || has(DESIGN),
    deliverables: has(BUILD) || has(DESIGN),
  };
}

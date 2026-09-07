/** Native rental categories/domain pairs observed in the public MLU search on 2026-09-07.
 * MLU1473 is apartment rentals, NOT all rentals. Never accept a sale/holiday card on the
 * strength of its title: the search can silently drop a category or return recommendations. */
export const ML_RENTAL_CATEGORIES = [
  { id: "MLU1473", domain: "MLU-APARTMENTS_FOR_RENT", name: "apartamentos", propertyType: "apartamento" },
  { id: "MLU1467", domain: "MLU-HOUSES_FOR_RENT", name: "casas", propertyType: "casa" },
  { id: "MLU211281", domain: "MLU-ROOMS_FOR_RENT", name: "habitaciones", propertyType: "habitacion" },
  { id: "MLU1482", domain: "MLU-RETAIL_SPACE_FOR_RENT", name: "locales", propertyType: "local" },
  { id: "MLU50634", domain: "MLU-OFFICES_FOR_RENT", name: "oficinas", propertyType: "oficina" },
  { id: "MLU1494", domain: "MLU-LANDS_FOR_RENT", name: "terrenos", propertyType: "terreno" },
  { id: "MLU455467", domain: "MLU-WAREHOUSES_FOR_RENT", name: "galpones", propertyType: "local" },
  { id: "MLU50549", domain: "MLU-FARM_HOUSES_FOR_RENT", name: "chacras", propertyType: "casa" },
  { id: "MLU6395", domain: "MLU-OTHER_PROPERTIES_FOR_RENT", name: "otros inmuebles", propertyType: "otro" },
] as const;

export const ML_PAGE_SIZE = 20;
export const ML_OFFSET_CEILING = 4_000;
export type MLFilters = Record<string, string>;
interface FilterValue { id?: unknown; results?: unknown }
interface Filter { id?: unknown; values?: FilterValue[] }
export interface MLSearchEvidence {
  paging?: { total?: unknown; offset?: unknown };
  filters?: Filter[];
  available_filters?: Filter[];
}

export function mlRentalCard(category: unknown, domain: unknown): boolean {
  return ML_RENTAL_CATEGORIES.some(row => row.id === category && row.domain === domain);
}

export function mlCount(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

/** A missing-location remainder is evidence of a coverage gap, not permission to drop it. */
export function mlPartitionRemainder(page: MLSearchEvidence, parent: MLFilters, children: MLFilters[]): number | null {
  const total = mlCount(page.paging?.total);
  const key = children[0] && Object.keys(children[0]).find(id => children[0]![id] !== parent[id]);
  if (total === null || !key) return null;
  const values = page.available_filters?.find(filter => filter?.id === key)?.values;
  const sum = children.reduce((count, child) => count + (mlCount(values?.find(value => value?.id === child[key])?.results) ?? 0), 0);
  // Overlapping counts cannot prove all listings have a location either.
  return sum > total ? null : total - sum;
}

/** Only APPLIED filters count. Available chips also contain pets/private/today on every page. */
export function mlApplied(page: MLSearchEvidence, id: string, value: string): boolean {
  return Array.isArray(page.filters) && page.filters.some(filter =>
    filter?.id === id && Array.isArray(filter.values) && filter.values.some(item => item?.id === value));
}

export function mlPageMatches(page: MLSearchEvidence, filters: MLFilters, offset: number): boolean {
  return mlCount(page.paging?.offset) === offset &&
    Object.entries(filters).every(([id, value]) => mlApplied(page, id, value));
}

export function mlParams(filters: MLFilters, offset: number): URLSearchParams {
  return new URLSearchParams({
    country: "UY", q: "alquiler", limit: String(ML_PAGE_SIZE), raw: "true",
    ...filters, "q.category": filters.category!, offset: String(offset),
  });
}

function priceBounds(value: string): [number, number] | null {
  const match = /^(\*|\d+(?:\.\d+)?)-(\*|\d+(?:\.\d+)?)$/.exec(value);
  if (!match) return null;
  const min = match[1] === "*" ? 0 : Number(match[1]);
  const max = match[2] === "*" ? Infinity : Number(match[2]);
  return min < max ? [min, max] : null;
}

/** Counts alone cannot prove coverage: overlapping intervals can hide a gap elsewhere.
 * Shared endpoints are allowed, but the interiors must not overlap and must span the parent. */
function contiguousPrices(values: string[], parentValue?: string): boolean {
  const parent = parentValue ? priceBounds(parentValue) : [0, Infinity];
  const ranges = values.map(priceBounds);
  if (!parent || ranges.some(range => !range)) return false;
  const sorted = (ranges as Array<[number, number]>).sort((a, b) => a[0] - b[0]);
  return sorted[0]?.[0] === parent[0] && sorted[sorted.length - 1]?.[1] === parent[1] &&
    sorted.every((range, index) => index === 0 || sorted[index - 1]![1] === range[0]);
}

/** Partition only using native values actually offered for THIS category/current slice.
 * Boundaries can overlap (e.g. 25,000); global advert-ID deduplication handles that overlap.
 * Prefer bounded, contiguous price slices when locations leave a remainder. Otherwise preserve
 * the location-first fallback; the caller retains parent cards and still reports partial. */
export function mlPartitions(page: MLSearchEvidence, filters: MLFilters, maxPartitionSize = 120 * ML_PAGE_SIZE): MLFilters[] {
  const total = mlCount(page.paging?.total);
  if (!total || !Array.isArray(page.available_filters)) return [];
  let fallback: MLFilters[] = [];
  for (const id of ["state", "city", "neighborhood", "price"]) {
    if (id !== "price" && filters[id]) continue;
    const facet = page.available_filters.find(filter => filter?.id === id);
    const candidates = new Map<string, number>();
    for (const item of Array.isArray(facet?.values) ? facet.values : []) {
      const value = typeof item?.id === "string" ? item.id : "";
      const count = mlCount(item?.results);
      if (!value || value === filters[id] || !count || count >= total) continue;
      if (id === "price") {
        const range = priceBounds(value);
        const parent = filters.price ? priceBounds(filters.price) : [0, Infinity];
        if (!range || !parent || range[0] < parent[0]! || range[1] > parent[1]!) continue;
      } else if (!/^[A-Za-z0-9_-]{1,100}$/.test(value)) continue;
      candidates.set(value, count);
    }
    if (candidates.size > 1) {
      const children = [...candidates].sort((a, b) => b[1] - a[1]).map(([value]) => ({ ...filters, [id]: value }));
      if (!fallback.length) {
        fallback = children;
        if (mlPartitionRemainder(page, filters, fallback) === 0) return fallback;
      // A duplicate or malformed option must not disappear and make the remaining sum look complete.
      } else if (id === "price" && facet?.values?.filter(value => !filters.price || value?.id !== filters.price).length === candidates.size &&
        Number.isFinite(maxPartitionSize) && maxPartitionSize > 0 &&
        [...candidates.values()].every(count => count <= maxPartitionSize) &&
        mlPartitionRemainder(page, filters, children) === 0 &&
        contiguousPrices([...candidates.keys()], filters.price)) {
        return children;
      }
    }
  }
  return fallback;
}

export function mlBoundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= min ? Math.min(max, Math.floor(number)) : fallback;
}

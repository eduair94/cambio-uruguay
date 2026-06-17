// Framework-agnostic helpers for the per-department programmatic-SEO pages
// (`pages/dolar/[departamento].vue`).
//
// These are PURE functions (no Vue/Nuxt runtime, no global state) so they can be
// unit-tested in plain Node via vitest, and reused by the page, the server
// sitemap route, and anywhere else without duplicating the slug/filter logic.
//
// Types come from the shared API contract; imported relatively so this module
// stays runtime-agnostic.
import type { EvolutionLocalData } from '../types/api'

/**
 * Local-data entry for a single exchange house, keyed by `origin` in the map
 * returned by `GET /localData`. Structurally identical to the per-evolution
 * `EvolutionLocalData`, so we reuse that contract.
 */
export type HouseLocalData = EvolutionLocalData

/** The `GET /localData` payload: a map of `origin` -> {@link HouseLocalData}. */
export type LocalDataMap = Record<string, HouseLocalData>

/** An exchange house that has at least one branch in a given department. */
export interface DepartmentHouse {
  /** Exchange house id / `origin` (e.g. `'itau'`); the key in {@link LocalDataMap}. */
  origin: string
  /** Display name of the house, falling back to a humanised `origin` when missing. */
  name: string
  /** Website URL for the house, if known. */
  website: string
  /** Google Maps URL for the house, if known. */
  maps: string
}

/** A department exposed by the API, with its URL slug and canonical name. */
export interface DepartmentEntry {
  /** URL-safe slug (lowercase, accent-stripped, spaces -> hyphens). */
  slug: string
  /** Canonical UPPERCASE department name as stored in `localData` (e.g. `'CERRO LARGO'`). */
  name: string
}

/**
 * Turn a department name into a URL slug: lowercased, accents stripped, and
 * runs of non-alphanumeric characters collapsed to single hyphens.
 *
 * Examples: `'MONTEVIDEO'` -> `'montevideo'`, `'CERRO LARGO'` -> `'cerro-largo'`,
 * `'PAYSANDÚ'` -> `'paysandu'`, `'Río Negro'` -> `'rio-negro'`.
 */
export function slugifyDepartment(name: string): string {
  return name
    .normalize('NFD') // split accented chars into base + combining mark
    .replace(/[\u0300-\u036F]/g, '') // drop the combining marks (accents)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // collapse non-alphanumerics to hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}

/**
 * Humanise an `origin` id into a display name (e.g. `'cambio-minas'` ->
 * `'Cambio Minas'`). Used only as a fallback when `localData[origin].name` is
 * missing.
 */
function humaniseOrigin(origin: string): string {
  return origin
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Resolve a department slug back to its canonical name from a list of known
 * names. Matching is done on the slug, so it is accent- and case-insensitive.
 *
 * @returns the canonical name (as it appears in `allNames`) or `null` when no
 * known department slugifies to `slug`.
 */
export function departmentFromSlug(slug: string, allNames: readonly string[]): string | null {
  const target = slugifyDepartment(slug)
  if (!target) return null
  for (const name of allNames) {
    if (slugifyDepartment(name) === target) return name
  }
  return null
}

/**
 * List every department known to the API, de-duplicated and sorted by name.
 *
 * Departments are the union of `localData[origin].departments` across all
 * houses (UPPERCASE names like `'MONTEVIDEO'`). Each entry carries its slug so
 * callers can build routes and links without re-slugifying.
 */
export function listDepartments(localData: LocalDataMap): DepartmentEntry[] {
  const names = new Set<string>()
  for (const house of Object.values(localData)) {
    for (const dept of house.departments ?? []) {
      const trimmed = dept.trim()
      if (trimmed) names.add(trimmed)
    }
  }
  return Array.from(names)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map(name => ({ slug: slugifyDepartment(name), name }))
}

/**
 * List the exchange houses that have at least one branch in `departmentName`.
 *
 * Department membership is matched case-insensitively (the API stores names in
 * UPPERCASE). Results are de-duplicated by `origin` and sorted by display name
 * for a stable, reproducible order.
 *
 * @returns a strictly-typed list of {@link DepartmentHouse}; empty when the
 * department is unknown or no house operates there.
 */
export function housesInDepartment(
  localData: LocalDataMap,
  departmentName: string
): DepartmentHouse[] {
  const target = departmentName.trim().toUpperCase()
  if (!target) return []

  const houses: DepartmentHouse[] = []
  for (const [origin, data] of Object.entries(localData)) {
    const inDept = (data.departments ?? []).some(dept => dept.trim().toUpperCase() === target)
    if (!inDept) continue
    houses.push({
      origin,
      name: data.name && data.name.trim() ? data.name : humaniseOrigin(origin),
      website: data.website ?? '',
      maps: data.maps ?? '',
    })
  }

  return houses.sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

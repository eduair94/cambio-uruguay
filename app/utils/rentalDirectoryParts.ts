// Which part of /api/rentals a request asks for (`parts` in the query string).
//
// The directory page asks for two things that do not need each other: the cards of the next page
// while the reader scrolls (`items`), and the barrio list of another department while the drawer
// is open (`facets`). Before 2026-11-20 both were full responses, so every scroll page also paid
// the facet pass over the whole inventory and every drawer change paid a page of cards nobody
// read. See docs/app/RENTALS_DIRECTORY_API.md.
import type { RentalsResponse } from './rentals'

export type RentalDirectoryParts = 'all' | 'items' | 'facets'

/** Anything but `items` or `facets` is the full response, so old clients keep what they had. */
export function normalizeRentalDirectoryParts(value: unknown): RentalDirectoryParts {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === 'items' || raw === 'facets' ? raw : 'all'
}

/** `parts=items`: one page of cards, nothing else. */
export interface RentalsItemsResponse {
  parts: 'items'
  items: RentalsResponse['items']
  /** Not computed for this part yet: the count rides the facet pass, which `items` skips. */
  total: number | null
  page: number
  perPage: number
}

/** `parts=facets`: the counts of the search, no cards. */
export interface RentalsFacetsResponse {
  parts: 'facets'
  total: number
  medianUyu: number
  facets: RentalsResponse['facets']
}

export type RentalsDirectoryResponse =
  RentalsResponse | RentalsItemsResponse | RentalsFacetsResponse

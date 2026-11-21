/**
 * The visible catalogue of /alquileres-uruguay (how many properties, how many from each portal),
 * independent from the reader's filters and from the latest scraper run.
 *
 * Until 2026-11-20 it was a pass of its own: the whole public inventory, every `all` request whose
 * 60-second cache had expired (2.06 s on production that day). Since P5 it is READ from the default
 * search's facet entry (server/utils/rentalDirectoryData.ts), which is the same pass by
 * construction: the default search has no filter, and its availability (`all`) never excludes an
 * advert (utils/rentalAvailability.ts), so its public stages are exactly `rentalCoverageStages`'
 * (tests/unit/rentalsCoverage.test.ts proves it), and its facet counts the properties and their
 * portals the same way.
 */
import {
  RENTAL_SOURCE_LABEL,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalPublicStages,
  type RentalCoverage,
  type RentalFacetValue,
  type RentalSource,
} from '../../utils/rentals'

/** The pass coverage used to be. Kept as the definition the default facet is tested against. */
export function rentalCoverageStages(staleDays: number) {
  const { filter } = buildRentalFilter(normalizeRentalQuery(), staleDays)
  return [
    ...rentalPublicStages(filter, staleDays),
    {
      $facet: {
        properties: [{ $count: 'count' }],
        // rentalPublicStages rebuilds this set from valid, current offers before counting it.
        sources: [
          { $unwind: '$sources' },
          { $group: { _id: '$sources', properties: { $sum: 1 } } },
        ],
      },
    },
  ]
}

/**
 * The coverage of the default facet: its count, and every portal with its properties (a portal
 * with none is a successful zero, never left out). `builtAt` is when that facet was read.
 */
export function rentalCoverageFromFacet(
  facet: { total: number; sources: readonly RentalFacetValue[] },
  builtAt: number
): RentalCoverage {
  const counts = new Map(facet.sources.map(source => [source.value, source.count]))
  return {
    computedAt: new Date(builtAt).toISOString(),
    properties: facet.total,
    sources: (Object.keys(RENTAL_SOURCE_LABEL) as RentalSource[]).map(key => ({
      key,
      properties: counts.get(key) ?? 0,
    })),
  }
}

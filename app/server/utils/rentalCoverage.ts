import { RentalListingModel } from '../models/RentalListing'
import {
  RENTAL_COLLATION,
  RENTAL_SOURCE_LABEL,
  buildRentalFilter,
  normalizeRentalQuery,
  rentalPublicStages,
  type RentalCoverage,
  type RentalSource,
} from '../../utils/rentals'

const CACHE_MS = 60_000

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

interface CoverageRow {
  properties: Array<{ count: number }>
  sources: Array<{ _id: string; properties: number }>
}

type AggregateCoverage = (
  stages: ReturnType<typeof rentalCoverageStages>
) => PromiseLike<CoverageRow[]>

/** One small process-local cache; changing a sync or the UTC visibility cutoff invalidates it. */
export function createRentalCoverageReader(aggregate: AggregateCoverage) {
  let cached: { key: string; expires: number; value: RentalCoverage } | null = null
  let revision = 0
  const pending = new Map<string, Promise<RentalCoverage | null>>()

  return (generatedAt: string | undefined, staleDays: number): Promise<RentalCoverage | null> => {
    const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString().slice(0, 10)
    const key = JSON.stringify([generatedAt ?? null, staleDays, cutoff])
    if (cached?.key === key && cached.expires > Date.now()) return Promise.resolve(cached.value)
    const existing = pending.get(key)
    if (existing) return existing

    const requestRevision = ++revision
    const promise = Promise.resolve()
      .then(() => aggregate(rentalCoverageStages(staleDays)))
      .then(rows => {
        const row = rows[0]
        const counts = new Map(row?.sources.map(source => [source._id, source.properties]) ?? [])
        const value: RentalCoverage = {
          computedAt: new Date().toISOString(),
          properties: row?.properties[0]?.count ?? 0,
          sources: (Object.keys(RENTAL_SOURCE_LABEL) as RentalSource[]).map(key => ({
            key,
            properties: counts.get(key) ?? 0,
          })),
        }
        // An older in-flight sync must not replace a newer snapshot that finished first.
        if (requestRevision === revision) cached = { key, expires: Date.now() + CACHE_MS, value }
        return value
      })
      .catch(error => {
        console.error('[api/rentals] coverage unavailable', error)
        return null
      })
      .finally(() => pending.delete(key))
    pending.set(key, promise)
    return promise
  }
}

export const getRentalCoverage = createRentalCoverageReader(stages =>
  RentalListingModel.aggregate<CoverageRow>(stages).collation(RENTAL_COLLATION)
)

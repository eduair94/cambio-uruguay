/**
 * The page of /api/rentals in two passes: first the ORDER (which keys, in which order), then the
 * CARDS of those keys only.
 *
 * Until 2026-11-20 one pass did both: every public property (~71,900 on that day) carried its
 * 95-path card into Mongo's blocking sort, so `/api/rentals?page=5` waited 4.3–8 s. The keys pass
 * sorts only what the sort reads (measured on production, design of that day: 2,353 ms where the
 * single pass took 4,000+), and the cards pass reads 24 documents by key (10 ms, IXSCAN on the key
 * index). See docs/app/RENTALS_DIRECTORY_API.md.
 *
 * Both passes keep the route's derivation UNCHANGED: the keys pass runs the same
 * `rentalPublicStages` and `rentalOfferStages` before its projection, and the cards pass IS the
 * route's single-pass pipeline (`rentalDirectoryItemsPipeline` in server/api/rentals/index.get.ts),
 * run over those keys. A card therefore cannot differ from the card the single pass returned.
 *
 * Pure: no Mongo, no Nitro. The cards builder takes the route's pipeline as an argument instead of
 * importing it, because a util that imports a route file would run that route's
 * `defineCachedEventHandler` on load.
 */
import type { PipelineStage } from 'mongoose'
import { rentalDistanceStages } from '../../utils/rentalDistance'
import { rentalPricePerM2Stages } from '../../utils/rentalPricePerM2'
import { rentalMongoSort, rentalRecentSortProjection, type RentalQuery } from '../../utils/rentals'

/**
 * The `$project` of the keys pass: the key and EVERY key of the sort, nothing else.
 *
 * Every `$sort` key has to survive it: Mongo sorts a missing field as null without a word, every
 * row ties and the order silently falls to the next key (the map lost two sorts that way before
 * 2026-11-20, server/api/rentals/mapa.get.ts). "Más recientes" and "mayor baja" sort on fields that
 * are computed right here (homes-first tier, hour, hash of the key); the others were computed by
 * the stages before (`priceUyu`, `area`, `priceDrop.pct`, `freshAt`, distance, monthly total, price
 * per m²) and are kept as they are.
 */
export function rentalSortKeyProjection(
  query: Pick<RentalQuery, 'sort' | 'types' | 'type'>
): Record<string, unknown> {
  const computed = rentalRecentSortProjection(query)
  const projection: Record<string, unknown> = { _id: 0, key: 1 }
  for (const field of Object.keys(rentalMongoSort(query.sort)))
    projection[field] = Object.hasOwn(computed, field) ? computed[field] : 1
  return projection
}

export interface RentalDirectoryKeysWindow {
  skip: number
  limit: number
  /** Also count every row of the search in the same pass (`{ n, keys }` instead of key rows). */
  count?: boolean
}

/**
 * The keys pass: the page's keys in the search's order, as `{ key }` rows. With `count`, one
 * document `{ n: [{ n }], keys: [{ key }…] }`, so the count and the keys come from one snapshot.
 *
 * The distance stages only `$set` (utils/rentalDistance.ts), so they are needed only when the
 * distance is a sort key; the per-m² stages likewise.
 */
export function rentalDirectoryKeysPipeline(
  query: RentalQuery,
  publicStages: object[],
  offerStages: object[],
  { skip, limit, count = false }: RentalDirectoryKeysWindow
): PipelineStage[] {
  const page = [
    { $sort: rentalMongoSort(query.sort) },
    { $skip: skip },
    { $limit: limit },
    { $project: { _id: 0, key: 1 } },
  ]
  return [
    ...publicStages,
    ...offerStages,
    ...(query.sort === 'distancia' ? rentalDistanceStages(query) : []),
    ...(query.sort === 'precio-m2' ? rentalPricePerM2Stages() : []),
    { $project: rentalSortKeyProjection(query) },
    ...(count ? [{ $facet: { n: [{ $count: 'n' }], keys: page } }] : page),
  ] as PipelineStage[]
}

/**
 * The keys pass's own public stages narrowed to the keys of the page: its first `$match` (the
 * indexed prefilter) and its last (the whole filter) gain `key: {$in}`, everything in between is
 * kept by reference.
 *
 * Never a second `rentalPublicStages` call: that one computes its current-offer cutoff from the
 * clock, so a cards pass that started after midnight UTC would drop an offer seen exactly on the
 * old cutoff day — the cheaper one the keys pass ordered the property by — and show another price,
 * another `matchingOffer`, at a position no single pass gives it.
 */
export function rentalDirectoryCardsStages(
  publicStages: readonly object[],
  keys: readonly string[]
): object[] {
  const narrow = (stage: object | undefined) => {
    const match = (stage as { $match?: Record<string, unknown> } | undefined)?.$match
    // `rentalPublicStages` opens and closes with a `$match`; anything else is not its output.
    if (!match) throw new Error('rentalDirectoryCardsStages: expected rentalPublicStages')
    return { $match: { ...match, key: { $in: [...keys] } } }
  }
  if (publicStages.length < 2)
    throw new Error('rentalDirectoryCardsStages: expected rentalPublicStages')
  return [narrow(publicStages[0]), ...publicStages.slice(1, -1), narrow(publicStages.at(-1))]
}

export type RentalDirectoryItemsPipeline = (
  query: RentalQuery,
  publicStages: object[],
  offerStages: object[]
) => PipelineStage[]

/**
 * The cards pass: the route's own single-pass pipeline, on page 1 with `perPage = n`, over
 * `publicStagesForKeys = rentalDirectoryCardsStages(publicStages, keys)`. The `key: {$in}` reaches
 * the first `$match`, so Mongo reads those documents by index and derives nothing else.
 */
export function rentalDirectoryCardsPipeline(
  query: RentalQuery,
  publicStagesForKeys: object[],
  offerStages: object[],
  n: number,
  itemsPipeline: RentalDirectoryItemsPipeline
): PipelineStage[] {
  return itemsPipeline({ ...query, page: 1, perPage: n }, publicStagesForKeys, offerStages)
}

/**
 * The cards in the keys pass's order. A key the cards pass did not return (the hourly harvest
 * wrote between the two passes and the property left the search) is dropped: the page is one card
 * short, never a wrong card. A row whose key the keys pass did not return is dropped too.
 */
export function orderByKeys<T extends { key: string }>(
  rows: readonly T[],
  keys: readonly string[]
): T[] {
  const byKey = new Map(rows.map(row => [row.key, row]))
  return keys.flatMap(key => {
    const row = byKey.get(key)
    return row ? [row] : []
  })
}

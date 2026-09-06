import type {
  RentalAlertCandidate,
  RentalAlertFilters,
  RentalAlertKind,
} from '../../utils/rentalAlerts'
import {
  buildRentalFilter,
  normalizeRentalQuery,
  RENTAL_COLLATION,
  RENTAL_SOURCE_LABEL,
  RENTAL_STALE_DAYS,
  rentalOfferMatchesQuery,
  rentalOfferStages,
  rentalPublicStages,
  type RentalPublicProperty,
} from '../../utils/rentals'
import { rentalPropertyPath } from '../../utils/rentalPresentation'
import {
  queryPropertyOpportunities,
  type PropertyOpportunitySnapshot,
} from '../../utils/propertyOpportunityQuery'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { PropertyOpportunitySnapshotModel } from '../models/PropertyOpportunitySnapshot'
import { rentalPublicPropertyProjection } from './rentalDetail'
import { loadRentalAvailabilityIndex } from './rentalAvailability'
import { normalizeRentalAvailabilityFilter } from '../../utils/rentalAvailability'

export const RENTAL_ALERT_STALE_DAYS = RENTAL_STALE_DAYS
const PAGE = 400
export function rentalAlertCandidateId(source: unknown, listingId: unknown): string | null {
  if (
    typeof source !== 'string' ||
    !Object.hasOwn(RENTAL_SOURCE_LABEL, source) ||
    typeof listingId !== 'string'
  )
    return null
  const own = listingId.startsWith(`${source}:`) ? listingId.slice(source.length + 1) : listingId
  return /^[\w-]{1,160}$/.test(own) ? `rent:${source}:${own}` : null
}

export interface RentalAlertInventory {
  ids: string[]
  algorithm: string
  sourceVersion: string
}

/** Read directly, bypassing the public route cache when establishing an activation boundary. */
export async function rentalAlertOpportunitySnapshot(
  now = Date.now()
): Promise<PropertyOpportunitySnapshot> {
  const row = await PropertyOpportunitySnapshotModel.findOne({ key: 'rent' })
    .select({ _id: 0, snapshot: 1 })
    .maxTimeMS(15_000)
    .lean()
  const snapshot = row?.snapshot as PropertyOpportunitySnapshot | undefined
  if (
    !snapshot ||
    snapshot.operation !== 'rent' ||
    snapshot.version !== 1 ||
    !Array.isArray(snapshot.items)
  )
    throw new Error('Rental opportunities are unavailable')
  if (queryPropertyOpportunities(snapshot, {}, now).stale)
    throw new Error('Rental opportunities are not current')
  return snapshot
}

export function rentalAlertOpportunityMatches(
  snapshot: PropertyOpportunitySnapshot,
  filters: RentalAlertFilters,
  now: number
) {
  const first = queryPropertyOpportunities(
    snapshot,
    { ...filters, operation: 'rent', page: 1, perPage: 48 },
    now
  )
  if (first.stale) return []
  const items = [...first.items]
  for (let page = 2; page <= first.pages; page++)
    items.push(
      ...queryPropertyOpportunities(
        snapshot,
        { ...filters, operation: 'rent', page, perPage: 48 },
        now
      ).items
    )
  return items.filter(
    item =>
      item.subject.operation === 'rent' &&
      item.subject.id === rentalAlertCandidateId(item.subject.source, item.subject.listingId)
  )
}

export async function readRentalAlertInventory(
  kind: RentalAlertKind,
  now = Date.now(),
  guard: () => Promise<void> = async () => {}
): Promise<RentalAlertInventory> {
  if (kind === 'rental-opportunity') {
    const snapshot = await rentalAlertOpportunitySnapshot(now)
    return {
      ids: rentalAlertOpportunityMatches(snapshot, {}, now).map(item => item.subject.id),
      algorithm: snapshot.algorithm,
      sourceVersion: snapshot.generatedAt,
    }
  }
  const before = await RentalMetaModel.findOne({ key: 'uy-rentals' })
    .select({ generatedAt: 1 })
    .lean()
  if (!before?.generatedAt) throw new Error('Rental inventory is unavailable')
  const ids = new Set<string>()
  let after = ''
  for (;;) {
    await guard()
    const rows = await RentalListingModel.find(after ? { key: { $gt: after } } : {})
      .select({ _id: 0, key: 1, 'offers.listingId': 1, 'offers.source': 1 })
      .sort({ key: 1 })
      .limit(PAGE)
      .maxTimeMS(15_000)
      .lean()
    for (const row of rows)
      for (const offer of row.offers || []) {
        const id = rentalAlertCandidateId(offer.source, offer.listingId)
        if (id) ids.add(id)
      }
    if (rows.length < PAGE) break
    after = rows.at(-1)!.key
  }
  const final = await RentalMetaModel.findOne({ key: 'uy-rentals' })
    .select({ generatedAt: 1 })
    .lean()
  if (before.generatedAt !== final?.generatedAt || !ids.size)
    throw new Error('Rental inventory changed during observation; retry later')
  return { ids: [...ids].sort(), algorithm: 'rental-search-v1', sourceVersion: before.generatedAt }
}

/** Exactly the directory's matching pipeline, with candidate restriction before it and no page truncation. */
export function rentalAlertSearchStages(
  filters: RentalAlertFilters,
  listingIds: string[],
  usdUyu: number,
  after = '',
  excludedAdvertIds: readonly string[] = []
) {
  const query = normalizeRentalQuery(filters)
  const { filter } = buildRentalFilter(query, RENTAL_ALERT_STALE_DAYS, usdUyu)
  return [
    {
      $match: {
        'offers.listingId': { $in: listingIds },
        ...(after ? { key: { $gt: after } } : {}),
      },
    },
    ...rentalPublicStages(filter, RENTAL_ALERT_STALE_DAYS, excludedAdvertIds),
    ...rentalOfferStages(query, usdUyu),
    { $sort: { key: 1 as const } },
    { $limit: PAGE },
    { $project: rentalPublicPropertyProjection },
  ]
}

export function rentalAlertCandidatesFromRows(
  rows: RentalPublicProperty[],
  filters: RentalAlertFilters,
  wanted: ReadonlySet<string>,
  usdUyu: number
): RentalAlertCandidate[] {
  const query = normalizeRentalQuery(filters)
  const result = new Map<string, RentalAlertCandidate>()
  for (const row of rows)
    for (const offer of row.offers) {
      const id = rentalAlertCandidateId(offer.source, offer.listingId)
      if (!id || !wanted.has(id) || !rentalOfferMatchesQuery(offer, query, usdUyu)) continue
      if (
        !Number.isFinite(offer.price) ||
        offer.price <= 0 ||
        !['UYU', 'USD'].includes(offer.currency)
      )
        continue
      const expenses: RentalAlertCandidate['expenses'] =
        offer.commonExpenses === 0
          ? { amount: 0, currency: offer.commonExpensesCurrency === 'USD' ? 'USD' : 'UYU' }
          : typeof offer.commonExpenses === 'number' &&
              Number.isFinite(offer.commonExpenses) &&
              offer.commonExpenses >= 0 &&
              (offer.commonExpensesCurrency === 'UYU' || offer.commonExpensesCurrency === 'USD')
            ? { amount: offer.commonExpenses, currency: offer.commonExpensesCurrency }
            : null
      result.set(id, {
        id,
        propertyKey: row.key,
        title: offer.title || row.title,
        url: rentalPropertyPath(row.key),
        price: { amount: offer.price, currency: offer.currency },
        expenses,
        department: row.department,
        neighborhood: row.neighborhood,
        bedrooms: row.bedrooms,
        image: offer.image || null,
      })
    }
  return [...result.values()]
}

export async function matchRentalAlertCandidates(
  kind: RentalAlertKind,
  filters: RentalAlertFilters,
  candidateIds: string[],
  now = Date.now()
): Promise<RentalAlertCandidate[]> {
  if (!candidateIds.length) return []
  const wanted = new Set(candidateIds)
  const visibility = normalizeRentalAvailabilityFilter(filters.availability)
  // Inventory identity remains independent from this optional visibility setting. Withdrawing
  // or expiring a report must never make an old advert a new notification candidate.
  const availability = visibility === 'all' ? null : await loadRentalAvailabilityIndex()
  const excluded = availability?.excludedAdvertIds(visibility) ?? []
  if (kind === 'rental-opportunity') {
    const snapshot = await rentalAlertOpportunitySnapshot(now)
    const currentSnapshot = availability
      ? {
          ...snapshot,
          items: snapshot.items.map(item => ({
            ...item,
            subject: {
              ...item.subject,
              availability: availability.byAdvertId.get(item.subject.id),
            },
          })),
        }
      : snapshot
    const selected = rentalAlertOpportunityMatches(currentSnapshot, filters, now).filter(item =>
      wanted.has(item.subject.id)
    )
    const current = new Map(
      (
        await matchRentalAlertCandidates(
          'rental-search',
          { availability: visibility },
          selected.map(item => item.subject.id),
          now
        )
      ).map(candidate => [candidate.id, candidate])
    )
    return selected.flatMap(({ subject, analysis }) => {
      const live = current.get(subject.id)
      // Resolve a split's new internal URL by advert ID. A changed own price awaits a new analysis.
      if (
        !live ||
        live.price.amount !== subject.price.amount ||
        live.price.currency !== subject.price.currency ||
        live.expenses?.amount !== subject.expenses?.amount ||
        (live.expenses?.amount !== 0 && live.expenses?.currency !== subject.expenses?.currency)
      )
        return []
      return [
        {
          id: subject.id,
          propertyKey: live.propertyKey,
          title: subject.title,
          url: live.url,
          price: { amount: subject.price.amount, currency: subject.price.currency },
          expenses: subject.expenses
            ? { amount: subject.expenses.amount, currency: subject.expenses.currency }
            : null,
          department: subject.department,
          neighborhood: subject.neighborhood,
          bedrooms: subject.bedrooms,
          image: subject.image,
          opportunityGapPct: analysis.gapPct,
        },
      ]
    })
  }
  const meta = await RentalMetaModel.findOne({ key: 'uy-rentals' }).select({ usdUyu: 1 }).lean()
  const usdUyu = Number(meta?.usdUyu) || 0
  const listingIds = candidateIds.flatMap(id => {
    const match = /^rent:([^:]+):(.+)$/.exec(id)
    return match ? [`${match[1]}:${match[2]}`, match[2]!] : []
  })
  const result = new Map<string, RentalAlertCandidate>()
  let after = ''
  for (;;) {
    const rows = (await RentalListingModel.aggregate(
      rentalAlertSearchStages(filters, listingIds, usdUyu, after, excluded)
    )
      .collation(RENTAL_COLLATION)
      .option({ maxTimeMS: 15_000 })) as RentalPublicProperty[]
    for (const candidate of rentalAlertCandidatesFromRows(rows, filters, wanted, usdUyu))
      result.set(candidate.id, candidate)
    if (rows.length < PAGE) break
    after = rows.at(-1)!.key
  }
  return [...result.values()]
}

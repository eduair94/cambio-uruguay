import { createHash } from 'node:crypto'
import type { PipelineStage } from 'mongoose'
import { RENTAL_STALE_DAYS, rentalPublicStages } from '../../utils/rentals'
import {
  emptyRentalAvailability,
  rentalAvailabilityAdvertId,
  rentalAvailabilityHidden,
  type RentalAvailabilityAdvert,
  type RentalAvailabilityFilter,
  type RentalAvailabilitySummary,
} from '../../utils/rentalAvailability'
import {
  RentalAvailabilityReportModel,
  type RentalAvailabilityReportDoc,
} from '../models/RentalAvailabilityReport'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb } from './db'
import {
  compatibleAvailabilityEvidence,
  resolveAvailabilityOwners,
  type RentalAvailabilityOwner,
  type RentalAvailabilityOwnerRow,
} from './rentalAvailabilityIdentity'

export interface RentalAvailabilityIndex {
  byAdvertId: Map<string, RentalAvailabilitySummary>
  excludedAdvertIds(filter: RentalAvailabilityFilter): string[]
  summaryForOffers(
    offers: readonly RentalAvailabilityAdvert[],
    propertyKey?: string
  ): RentalAvailabilitySummary
}

/** All voter identities remain in this closure; no public projection exposes them. */
export function buildRentalAvailabilityIndex(
  reports: RentalAvailabilityReportDoc[],
  owners: Map<string, RentalAvailabilityOwner>,
  now = new Date()
): RentalAvailabilityIndex {
  const voters = new Map<string, Map<string, string>>()
  for (const report of reports) {
    const owner = owners.get(report.advertId)
    if (
      !owner ||
      report.withdrawnAt ||
      !(new Date(report.expiresAt).getTime() > now.getTime()) ||
      !(new Date(report.reportedAt).getTime() <= now.getTime()) ||
      !compatibleAvailabilityEvidence(report.evidence, owner.evidence)
    )
      continue
    const own = voters.get(report.advertId) || new Map<string, string>()
    const at = new Date(report.reportedAt).toISOString()
    if (!own.has(report.uid) || own.get(report.uid)! < at) own.set(report.uid, at)
    voters.set(report.advertId, own)
  }
  function summary(votes: Map<string, string>): RentalAvailabilitySummary {
    return {
      count: votes.size,
      lastReportedAt: [...votes.values()].sort().at(-1) || null,
      status: 'unconfirmed',
    }
  }
  const byAdvertId = new Map([...voters].map(([id, votes]) => [id, summary(votes)]))
  return {
    byAdvertId,
    excludedAdvertIds: filter =>
      [...byAdvertId]
        .filter(([, value]) => rentalAvailabilityHidden(value, filter))
        .map(([id]) => id),
    summaryForOffers(offers, propertyKey) {
      const all = new Map<string, string>()
      for (const offer of offers) {
        const id = rentalAvailabilityAdvertId(offer.source, offer.listingId)
        if (!id || (propertyKey && owners.get(id)?.key !== propertyKey)) continue
        for (const [uid, at] of voters.get(id) || [])
          if (!all.has(uid) || all.get(uid)! < at) all.set(uid, at)
      }
      return summary(all)
    },
  }
}

/** Public stages preserve the exact search freshness and reject zero/unknown-price offers. */
export async function loadAvailabilityOwners(
  adverts: readonly RentalAvailabilityAdvert[],
  now = new Date()
) {
  const sources = new Map<string, Set<string>>()
  for (const advert of adverts) {
    const id = rentalAvailabilityAdvertId(advert.source, advert.listingId)
    if (!id) continue
    const own = id.slice(`rent:${advert.source}:`.length)
    const values = sources.get(advert.source) || new Set<string>()
    values.add(own)
    values.add(`${advert.source}:${own}`)
    sources.set(advert.source, values)
  }
  if (!sources.size) return new Map<string, RentalAvailabilityOwner>()
  const rows = await RentalListingModel.aggregate<RentalAvailabilityOwnerRow>([
    {
      $match: {
        $or: [...sources].map(([source, ids]) => ({
          offers: { $elemMatch: { source, listingId: { $in: [...ids] } } },
        })),
      },
    },
    ...rentalPublicStages({}, RENTAL_STALE_DAYS),
    {
      $project: {
        _id: 0,
        key: 1,
        'offers.source': 1,
        'offers.listingId': 1,
        'offers.title': 1,
        'offers.priceUyu': 1,
        'offers.lastSeen': 1,
        'offers.identity': 1,
        'offers.details.description': 1,
      },
    },
  ] as PipelineStage[]).option({ maxTimeMS: 10_000 })
  return resolveAvailabilityOwners(rows, now)
}

let cache: { signature: string; until: number; value: RentalAvailabilityIndex } | null = null
export function invalidateRentalAvailabilityIndex() {
  cache = null
}

export async function loadRentalAvailabilityIndex(): Promise<RentalAvailabilityIndex> {
  await connectDb()
  const now = new Date()
  // Read the small active-report index every time: a write in another worker invalidates this
  // cache without a process-local pub/sub dependency. Scrape generation also invalidates owners.
  const [reports, meta] = await Promise.all([
    RentalAvailabilityReportModel.find({
      withdrawnAt: null,
      expiresAt: { $gt: now },
      reportedAt: { $lte: now },
    })
      .select('+uid +evidence')
      .maxTimeMS(10_000)
      .lean(),
    RentalMetaModel.findOne({ key: 'uy-rentals' })
      .select({ generatedAt: 1, _id: 0 })
      .maxTimeMS(10_000)
      .lean(),
  ])
  const signature = createHash('sha256')
    .update(
      JSON.stringify([
        meta?.generatedAt || '',
        reports
          .map(row => [row._id, row.revision])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      ])
    )
    .digest('hex')
  if (cache && cache.signature === signature && cache.until > now.getTime()) return cache.value
  const owners = await loadAvailabilityOwners(reports, now)
  const value = buildRentalAvailabilityIndex(reports, owners, now)
  let until = now.getTime() + 30_000
  for (const row of reports) until = Math.min(until, new Date(row.expiresAt).getTime())
  cache = { signature, until, value }
  return value
}

export function annotateRentalAvailability<
  T extends {
    key: string
    offers: RentalAvailabilityAdvert[]
    matchingOffer?: RentalAvailabilityAdvert | null
  },
>(property: T, index: RentalAvailabilityIndex): T & { availability: RentalAvailabilitySummary } {
  const annotate = (offer: RentalAvailabilityAdvert) => ({
    ...offer,
    availability: index.summaryForOffers([offer], property.key),
  })
  return {
    ...property,
    offers: property.offers.map(annotate),
    ...(property.matchingOffer ? { matchingOffer: annotate(property.matchingOffer) } : {}),
    availability:
      index.summaryForOffers(property.offers, property.key) || emptyRentalAvailability(),
  }
}

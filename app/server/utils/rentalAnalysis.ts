import type { PipelineStage } from 'mongoose'
import {
  analyzeRentalMarket,
  estimateRentalPrice,
  rentalAnalysisFresh,
  rentalAnalysisText,
  type RentalAnalysisCatalogue,
  type RentalAnalysisListing,
  type RentalAnalysisType,
  type RentalEstimateQuery,
} from '../../utils/rentalAnalysis'
import { RENTAL_STALE_DAYS, type RentalOffer } from '../../utils/rentals'
import { rentalEligibility } from '../../utils/rentalEligibility'
import { publicBusinessUrl, safeAgency } from '../../utils/propertyAdvertiser'
import { rentalAvailabilityAdvertId } from '../../utils/rentalAvailability'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb } from './db'
import { rentalBudgetOwnExpenses } from './rentalBudget'
import { loadRentalAvailabilityIndex } from './rentalAvailability'

interface AnalysisIdentity {
  version?: number
  propertyType?: string
  department?: string
  neighborhood?: string
  bedrooms?: number | null
  bathrooms?: number | null
  description?: string
}
export interface RentalAnalysisRawProperty {
  key: string
  offers: Array<RentalOffer & { identity?: AnalysisIdentity }>
}

/** Read only the own-advert evidence needed for normalization; never read contact or addresses. */
export const rentalAnalysisProjection = {
  _id: 0,
  key: 1,
  'offers.source': 1,
  'offers.listingId': 1,
  'offers.title': 1,
  'offers.url': 1,
  'offers.price': 1,
  'offers.currency': 1,
  'offers.commonExpenses': 1,
  'offers.commonExpensesCurrency': 1,
  'offers.parkingSpaces': 1,
  'offers.lastSeen': 1,
  'offers.sellerType': 1,
  'offers.agency.version': 1,
  'offers.agency.key': 1,
  'offers.agency.name': 1,
  'offers.agency.profileUrl': 1,
  'offers.agency.observedAt': 1,
  'offers.identity.version': 1,
  'offers.identity.propertyType': 1,
  'offers.identity.department': 1,
  'offers.identity.neighborhood': 1,
  'offers.identity.bedrooms': 1,
  'offers.identity.bathrooms': 1,
  'offers.identity.description': 1,
  'offers.details.description': 1,
  'offers.details.guaranteeText': 1,
  'offers.details.builtArea': 1,
  'offers.details.totalArea': 1,
} as const

const integer = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null
const areaValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 20 && value <= 450 ? value : null

/** No canonical attributes are fallback evidence for a missing original advert. */
export function projectRentalAnalysisProperty(
  property: RentalAnalysisRawProperty,
  now = new Date()
): RentalAnalysisListing[] {
  if (typeof property.key !== 'string' || !/^[\w-]{1,180}$/.test(property.key)) return []
  const rows: RentalAnalysisListing[] = []
  for (const offer of property.offers || []) {
    const identity = offer.identity
    const advertId = rentalAvailabilityAdvertId(offer.source, offer.listingId)
    if (
      identity?.version !== 1 ||
      !['casa', 'apartamento'].includes(identity.propertyType || '') ||
      !advertId ||
      typeof offer.lastSeen !== 'string' ||
      !rentalAnalysisFresh(offer.lastSeen, now)
    )
      continue
    const department = rentalAnalysisText(identity.department)
    const neighborhood = rentalAnalysisText(identity.neighborhood)
    const title = rentalAnalysisText(offer.title)
    const url = publicBusinessUrl(offer.url, offer.source)
    const description = identity.description || offer.details?.description || ''
    if (
      !department ||
      !title ||
      !url ||
      !rentalEligibility({
        title: offer.title,
        description,
        guaranteeText: offer.details?.guaranteeText,
        currency: offer.currency,
        price: offer.price,
        propertyType: identity.propertyType || '',
      }).eligible
    )
      continue
    const built = areaValue(offer.details?.builtArea)
    const total = areaValue(offer.details?.totalArea)
    // A contradictory labelled area cannot be silently repaired with the group-wide field.
    const contradictoryArea =
      built !== null && total !== null && built > total * 1.05 && built - total > 2
    const area = contradictoryArea
      ? null
      : (built ?? (identity.propertyType === 'apartamento' ? total : null))
    const areaBasis = area === null ? null : built !== null ? 'built' : 'total'
    const expenses = rentalBudgetOwnExpenses(offer, description)
    // A mixed-currency total would depend on a conversion snapshot. Keep the public analysis
    // entirely in the advert's quoted currency; zero is invariant under currency conversion.
    const commonExpenses =
      expenses.commonExpenses === 0
        ? 0
        : expenses.commonExpensesCurrency === offer.currency
          ? expenses.commonExpenses
          : null
    const agency =
      offer.sellerType === 'particular'
        ? null
        : safeAgency(offer.agency, offer.source, now.getTime())
    rows.push({
      propertyKey: property.key,
      advertId,
      title,
      url,
      source: offer.source,
      department,
      neighborhood,
      type: identity.propertyType as RentalAnalysisType,
      bedrooms: integer(identity.bedrooms, 0, 10),
      bathrooms: integer(identity.bathrooms, 1, 10),
      parkingSpaces: integer(offer.parkingSpaces, 0, 10),
      area,
      areaBasis,
      areas: {
        built: contradictoryArea ? null : built,
        total: contradictoryArea || identity.propertyType !== 'apartamento' ? null : total,
      },
      price: offer.price,
      currency: offer.currency,
      commonExpenses,
      lastSeen: offer.lastSeen,
      advertiserKey: agency?.key || null,
    })
  }
  return rows
}

const MAX_PROPERTIES = 100_000
export class RentalAnalysisStaleError extends Error {
  readonly code = 'RENTAL_ANALYSIS_STALE'

  constructor(readonly generatedAt: string) {
    super('Rental analysis source metadata is stale')
    this.name = 'RentalAnalysisStaleError'
  }
}

let cache: { until: number; value: RentalAnalysisCatalogue } | null = null
let loading: Promise<RentalAnalysisCatalogue> | null = null
export async function loadRentalAnalysisCatalogue(): Promise<RentalAnalysisCatalogue> {
  if (cache && cache.until > Date.now()) return cache.value
  if (loading) return loading
  loading = (async () => {
    await connectDb()
    const now = new Date()
    const cutoff = new Date(now.getTime() - RENTAL_STALE_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const meta = await RentalMetaModel.findOne({ key: 'uy-rentals' })
      .select({ _id: 0, generatedAt: 1 })
      .maxTimeMS(10_000)
      .lean()
    if (
      typeof meta?.generatedAt !== 'string' ||
      !Number.isFinite(Date.parse(meta.generatedAt)) ||
      Date.parse(meta.generatedAt) > now.getTime()
    )
      throw new Error('Rental analysis source metadata unavailable')
    if (!rentalAnalysisFresh(meta.generatedAt, now))
      throw new RentalAnalysisStaleError(meta.generatedAt)
    const cursor = RentalListingModel.aggregate<RentalAnalysisRawProperty>([
      { $match: { lastSeen: { $gte: cutoff } } },
      { $limit: MAX_PROPERTIES + 1 },
      { $project: rentalAnalysisProjection },
    ] as PipelineStage[])
      .option({ maxTimeMS: 15_000 })
      .cursor({ batchSize: 500 })
    let catalogueProperties = 0
    const listings: RentalAnalysisListing[] = []
    try {
      for await (const property of cursor) {
        catalogueProperties++
        if (catalogueProperties > MAX_PROPERTIES)
          throw new Error('Rental analysis exceeds its complete read budget')
        // Discard each raw document after normalization instead of retaining a second catalogue.
        for (const listing of projectRentalAnalysisProperty(property, now)) listings.push(listing)
      }
    } finally {
      await cursor.close()
    }
    const value: RentalAnalysisCatalogue = {
      generatedAt: meta.generatedAt,
      catalogueProperties,
      listings,
    }
    cache = { until: Date.now() + 60_000, value }
    return value
  })()
  try {
    return await loading
  } finally {
    loading = null
  }
}

async function currentCatalogue(): Promise<RentalAnalysisCatalogue> {
  const [catalogue, availability] = await Promise.all([
    loadRentalAnalysisCatalogue(),
    loadRentalAvailabilityIndex(),
  ])
  // Community evidence is checked on every read, even when the normalized source is cached.
  const excluded = new Set(availability.excludedAdvertIds('hide_any'))
  return { ...catalogue, listings: catalogue.listings.filter(row => !excluded.has(row.advertId)) }
}
export async function loadRentalAnalysis(input: Record<string, unknown>) {
  return analyzeRentalMarket(await currentCatalogue(), input)
}
export async function loadRentalEstimate(query: RentalEstimateQuery) {
  return estimateRentalPrice(await currentCatalogue(), query)
}

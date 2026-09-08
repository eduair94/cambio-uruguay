import type { PipelineStage } from 'mongoose'
import { createHash } from 'node:crypto'
import {
  analyzeRentalMarket,
  estimateRentalPrice,
  normalizeRentalAnalysisQuery,
  rentalAnalysisFresh,
  rentalAnalysisText,
  type RentalAnalysisCatalogue,
  type RentalAnalysisListing,
  type RentalAnalysisType,
  type RentalAnalysisResponse,
  type RentalEstimateQuery,
} from '../../utils/rentalAnalysis'
import type { RentalOffer } from '../../utils/rentals'
import { rentalEligibility } from '../../utils/rentalEligibility'
import { publicBusinessUrl, safeAgency } from '../../utils/propertyAdvertiser'
import { rentalAvailabilityAdvertId } from '../../utils/rentalAvailability'
import { RentalListingModel } from '../models/RentalListing'
import { RentalMetaModel } from '../models/RentalMeta'
import { connectDb } from './db'
import { rentalBudgetOwnExpenses } from './rentalBudget'
import { loadRentalAvailabilityIndex } from './rentalAvailability'
import {
  createRentalAnalysisCatalogueCache,
  createRentalAnalysisResponseCache,
  rentalAnalysisSnapshotRevision,
} from './rentalAnalysisCache'
import {
  createRentalAnalysisDiskCache,
  RENTAL_ANALYSIS_CACHE_BYTES,
  RENTAL_ANALYSIS_CACHE_ROWS,
} from './rentalAnalysisDiskCache'
export { RentalAnalysisStaleError } from './rentalAnalysisCache'

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
async function readAnalysisMeta() {
  await connectDb()
  return RentalMetaModel.findOne({ key: 'uy-rentals' })
    .select({ _id: 0, generatedAt: 1 })
    .maxTimeMS(10_000)
    .lean()
}
async function readAnalysisCatalogue(
  generatedAt: string,
  at: number,
  cutoff: string
): Promise<RentalAnalysisCatalogue> {
  const now = new Date(at)
  const cursor = RentalListingModel.aggregate<RentalAnalysisRawProperty>([
    { $match: { lastSeen: { $gte: cutoff } } },
    { $limit: MAX_PROPERTIES + 1 },
    { $project: rentalAnalysisProjection },
  ] as PipelineStage[])
    .option({ maxTimeMS: 15_000 })
    .cursor({ batchSize: 500 })
  let catalogueProperties = 0,
    bytes = 0
  const listings: RentalAnalysisListing[] = []
  try {
    for await (const property of cursor) {
      catalogueProperties++
      if (catalogueProperties > MAX_PROPERTIES)
        throw new Error('Rental analysis exceeds its complete read budget')
      // Discard each raw document after normalization instead of retaining a second catalogue.
      for (const listing of projectRentalAnalysisProperty(property, now)) {
        bytes += Buffer.byteLength(JSON.stringify(listing))
        if (bytes > RENTAL_ANALYSIS_CACHE_BYTES || listings.length >= RENTAL_ANALYSIS_CACHE_ROWS)
          throw new Error('Rental analysis exceeds its normalized read budget')
        listings.push(listing)
      }
    }
  } finally {
    await cursor.close()
  }
  return { generatedAt, catalogueProperties, listings }
}
const loadAnalysisSnapshot = createRentalAnalysisCatalogueCache({
  readMeta: readAnalysisMeta,
  readCatalogue: readAnalysisCatalogue,
  // Unit tests use injected stores; they must never share production/local fixture state.
  shared: process.env.NODE_ENV === 'test' ? undefined : createRentalAnalysisDiskCache(),
})
export async function loadRentalAnalysisCatalogue(): Promise<RentalAnalysisCatalogue> {
  return (await loadAnalysisSnapshot()).value
}
const responseCache = createRentalAnalysisResponseCache<RentalAnalysisResponse>()

async function currentAnalysis() {
  const [snapshot, availability] = await Promise.all([
    loadAnalysisSnapshot(),
    loadRentalAvailabilityIndex(),
  ])
  // Community evidence is checked before even looking up an aggregate response.
  const excluded = availability.excludedAdvertIds('hide_any').sort()
  return { snapshot, excluded }
}
export async function loadRentalAnalysis(input: Record<string, unknown>) {
  const { snapshot, excluded } = await currentAnalysis()
  const query = normalizeRentalAnalysisQuery(input)
  const exclusions = createHash('sha256').update(JSON.stringify(excluded)).digest('hex')
  const key = JSON.stringify([
    rentalAnalysisSnapshotRevision(snapshot),
    query,
    new Date().toISOString().slice(0, 10),
    exclusions,
  ])
  const existing = responseCache.get(key)
  if (existing) return existing
  const hidden = new Set(excluded)
  const result = analyzeRentalMarket(
    {
      ...snapshot.value,
      listings: snapshot.value.listings.filter(row => !hidden.has(row.advertId)),
    },
    input
  )
  responseCache.set(key, result)
  return result
}
export async function loadRentalEstimate(query: RentalEstimateQuery) {
  const { snapshot, excluded } = await currentAnalysis()
  const hidden = new Set(excluded)
  return estimateRentalPrice(
    {
      ...snapshot.value,
      listings: snapshot.value.listings.filter(row => !hidden.has(row.advertId)),
    },
    query
  )
}

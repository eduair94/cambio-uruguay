import type {
  OpportunityPublicListing,
  OpportunityComparable,
  OpportunityItem,
  OpportunityOperation,
} from '../../utils/propertyOpportunities'
import { PropertyOpportunitySnapshotModel } from '../models/PropertyOpportunitySnapshot'
import { connectDb } from './db'
import type { PropertyOpportunitySnapshot } from '../../utils/propertyOpportunityQuery'

/** Explicit public projection: a later private field added to the stored model cannot leak. */
export function publicOpportunityListing(row: OpportunityPublicListing): OpportunityPublicListing {
  return {
    id: row.id,
    operation: row.operation,
    ...(row.propertyKey ? { propertyKey: row.propertyKey } : {}),
    source: row.source,
    listingId: row.listingId,
    url: row.url,
    title: row.title,
    image: row.image,
    sellerName: row.sellerName,
    department: row.department,
    locality: row.locality,
    neighborhood: row.neighborhood,
    propertyType: row.propertyType,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    area: { value: row.area.value, basis: row.area.basis },
    price: { amount: row.price.amount, currency: row.price.currency },
    expenses: row.expenses
      ? { amount: row.expenses.amount, currency: row.expenses.currency }
      : null,
    comparisonPrice: row.comparisonPrice,
    lastSeen: row.lastSeen,
    publishedAt: row.publishedAt,
  }
}

function publicOpportunityItem(item: OpportunityItem): OpportunityItem {
  const a = item.analysis
  return {
    subject: publicOpportunityListing(item.subject),
    analysis: {
      pricingBasis: a.pricingBasis,
      currency: a.currency,
      median: a.median,
      q25: a.q25,
      q75: a.q75,
      spread: a.spread,
      gapPct: a.gapPct,
      conservativeGapPct: a.conservativeGapPct,
      perAreaGapPct: a.perAreaGapPct,
      distinctN: a.distinctN,
      sellersN: a.sellersN,
      sources: a.sources,
      oldestLastSeen: a.oldestLastSeen,
      newestLastSeen: a.newestLastSeen,
      areaBasis: a.areaBasis,
      areaMin: a.areaMin,
      areaMax: a.areaMax,
      confidence: a.confidence,
    },
    comparables: item.comparables.slice(0, 10).map(
      (row): OpportunityComparable => ({
        ...publicOpportunityListing(row),
        differences: { areaPercent: row.differences.areaPercent },
      })
    ),
    cautions: item.cautions,
  }
}

// Cache only by operation; budgets and regions filter the immutable analysis afterwards.
const cache = new Map<
  OpportunityOperation,
  { expires: number; snapshot: PropertyOpportunitySnapshot }
>()

export async function loadPropertyOpportunities(
  operation: OpportunityOperation
): Promise<PropertyOpportunitySnapshot | null> {
  const found = cache.get(operation)
  if (found && found.expires > Date.now()) return found.snapshot
  await connectDb()
  const row = await PropertyOpportunitySnapshotModel.findOne({ key: operation })
    .select({ _id: 0, snapshot: 1 })
    .maxTimeMS(10_000)
    .lean()
  const raw = row?.snapshot
  if (!raw || raw.version !== 1 || raw.operation !== operation || !Array.isArray(raw.items))
    return null
  const snapshot: PropertyOpportunitySnapshot = {
    version: raw.version,
    algorithm: raw.algorithm,
    operation,
    generatedAt: raw.generatedAt,
    sourceReadAt: raw.sourceReadAt,
    usdUyu: raw.usdUyu,
    items: raw.items
      .filter(item => item.subject.operation === operation)
      .map(publicOpportunityItem),
    stats: {
      input: raw.stats.input,
      eligible: raw.stats.eligible,
      analyzed: raw.stats.analyzed,
      shortlisted: raw.stats.shortlisted,
      qualified: raw.stats.qualified,
      excluded: raw.stats.excluded,
      risks: raw.stats.risks,
    },
    coverage: raw.coverage.map(source => ({
      source: source.source,
      observed: source.observed,
      lastRead: source.lastRead,
      complete: source.complete,
      note: source.note,
    })),
  }
  cache.set(operation, { snapshot, expires: Date.now() + 180_000 })
  return snapshot
}

import { CarCatalogMetaModel } from '../models/CarCatalogMeta'
import { CarMarketSnapshotModel } from '../models/CarMarketSnapshot'
import { CarOpportunitySnapshotModel } from '../models/CarOpportunitySnapshot'
import type {
  PublicCarCatalogMeta,
  PublicCarListing,
  PublicCarMarketSnapshot,
  PublicCarOpportunitySnapshot,
} from '../../utils/carsPublic'
import { connectDb } from './db'

const CAR_FIELDS = [
  'key',
  'brand',
  'brandSlug',
  'model',
  'modelSlug',
  'marketSlug',
  'title',
  'year',
  'km',
  'price',
  'currency',
  'priceUsd',
  'priceConverted',
  'transmission',
  'fuel',
  'engine',
  'trim',
  'department',
  'neighborhood',
  'sellerType',
  'dealerName',
  'picture',
  'pictureCount',
  'permalink',
  'firstSeen',
  'lastSeen',
  'priceDrop',
  'flags',
  'opportunity',
] as const

export const carListingProjection: Record<string, 0 | 1> = Object.fromEntries([
  ['_id', 0],
  ...CAR_FIELDS.map(field => [field, 1]),
])

const prefixed = (value: unknown, prefix: string): string | null =>
  typeof value === 'string' && value.startsWith(prefix) ? value : null
const optionalText = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const optionalNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/** Rebuilds a public row field by field: unknown fields in the collection never reach the wire. */
export function publicCarRow(row: Record<string, any>): PublicCarListing {
  return {
    key: String(row.key),
    brand: String(row.brand),
    brandSlug: String(row.brandSlug),
    model: String(row.model),
    modelSlug: String(row.modelSlug),
    marketSlug: String(row.marketSlug),
    title: String(row.title),
    year: Number(row.year),
    km: optionalNumber(row.km),
    price: Number(row.price),
    currency: row.currency === 'UYU' ? 'UYU' : 'USD',
    priceUsd: Number(row.priceUsd),
    priceConverted: row.priceConverted === true,
    transmission: row.transmission ?? null,
    fuel: row.fuel ?? null,
    engine: optionalText(row.engine),
    trim: optionalText(row.trim),
    department: optionalText(row.department),
    neighborhood: optionalText(row.neighborhood),
    sellerType: row.sellerType ?? null,
    dealerName: optionalText(row.dealerName),
    picture: prefixed(row.picture, 'https://http2.mlstatic.com/'),
    pictureCount: optionalNumber(row.pictureCount),
    permalink: prefixed(row.permalink, 'https://auto.mercadolibre.com.uy/MLU-') ?? '',
    firstSeen: String(row.firstSeen),
    lastSeen: String(row.lastSeen),
    priceDrop: row.priceDrop
      ? {
          from: Number(row.priceDrop.from),
          currency: row.priceDrop.currency === 'UYU' ? 'UYU' : 'USD',
          since: String(row.priceDrop.since),
        }
      : null,
    flags: Array.isArray(row.flags)
      ? row.flags.filter((flag: unknown) => typeof flag === 'string')
      : [],
    opportunity: row.opportunity
      ? {
          tier: row.opportunity.tier === 'strict' ? 'strict' : 'exploratory',
          gap: Number(row.opportunity.gap),
          median: Number(row.opportunity.median),
          n: Number(row.opportunity.n),
        }
      : null,
  }
}

let metaCache: { expires: number; meta: PublicCarCatalogMeta } | null = null
export async function loadCarCatalogMeta(): Promise<PublicCarCatalogMeta | null> {
  if (metaCache && metaCache.expires > Date.now()) return metaCache.meta
  await connectDb()
  const doc = await CarCatalogMetaModel.findOne({ key: 'uy-cars' })
    .select({ _id: 0, meta: 1 })
    .maxTimeMS(5_000)
    .lean()
  const meta = doc?.meta
  if (!meta || meta.key !== 'uy-cars') return null
  metaCache = { meta, expires: Date.now() + 60_000 }
  return meta
}

let opportunityCache: { expires: number; snapshot: PublicCarOpportunitySnapshot } | null = null
export async function loadCarOpportunities(): Promise<PublicCarOpportunitySnapshot | null> {
  if (opportunityCache && opportunityCache.expires > Date.now()) return opportunityCache.snapshot
  await connectDb()
  const doc = await CarOpportunitySnapshotModel.findOne({ key: 'used' })
    .select({ _id: 0, snapshot: 1 })
    .maxTimeMS(10_000)
    .lean()
  const raw = doc?.snapshot
  if (!raw || raw.version !== 1 || !Array.isArray(raw.items)) return null
  const snapshot: PublicCarOpportunitySnapshot = {
    ...raw,
    items: raw.items.map(entry => ({
      ...entry,
      subject: publicCarRow(entry.subject),
      comparables: entry.comparables.map(peer => ({
        key: String(peer.key),
        title: String(peer.title),
        year: Number(peer.year),
        km: Number(peer.km),
        priceUsd: Number(peer.priceUsd),
        trim: optionalText(peer.trim),
        engine: optionalText(peer.engine),
        sellerType: peer.sellerType ?? null,
        permalink: prefixed(peer.permalink, 'https://auto.mercadolibre.com.uy/MLU-') ?? '',
        lastSeen: String(peer.lastSeen),
      })),
    })),
  }
  opportunityCache = { snapshot, expires: Date.now() + 180_000 }
  return snapshot
}

const marketCache = new Map<string, { expires: number; snapshot: PublicCarMarketSnapshot | null }>()
export async function loadCarMarket(slug: string): Promise<PublicCarMarketSnapshot | null> {
  const cached = marketCache.get(slug)
  if (cached && cached.expires > Date.now()) return cached.snapshot
  await connectDb()
  const doc = await CarMarketSnapshotModel.findOne({ key: slug })
    .select({ _id: 0, snapshot: 1 })
    .maxTimeMS(5_000)
    .lean()
  const snapshot = doc?.snapshot?.version === 1 ? doc.snapshot : null
  if (marketCache.size > 500) marketCache.clear()
  marketCache.set(slug, { snapshot, expires: Date.now() + 300_000 })
  return snapshot
}

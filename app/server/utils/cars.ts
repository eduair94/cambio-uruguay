import { CarCatalogMetaModel } from '../models/CarCatalogMeta'
import { CarMarketSnapshotModel } from '../models/CarMarketSnapshot'
import { CarOpportunitySnapshotModel } from '../models/CarOpportunitySnapshot'
import { CarReportSnapshotModel } from '../models/CarReportSnapshot'
import { CarRiskSnapshotModel } from '../models/CarRiskSnapshot'
import {
  CAR_SOURCE_RULES,
  CAR_SOURCES_PUBLIC,
  carSafePermalink,
  carSafePicture,
} from '../../utils/cars'
import type {
  PublicCarCatalogMeta,
  PublicCarFuelEconomy,
  PublicCarListing,
  PublicCarMarketSnapshot,
  PublicCarOpportunitySnapshot,
  PublicCarReference,
  PublicCarReportSnapshot,
  PublicCarRisk,
  PublicCarRiskSnapshot,
  PublicCarSource,
} from '../../utils/carsPublic'
import { connectDb } from './db'

const CAR_FIELDS = [
  'key',
  'source',
  'sourceName',
  'brand',
  'brandSlug',
  'model',
  'modelSlug',
  'marketSlug',
  'title',
  'year',
  'km',
  'price',
  'listedPrice',
  'currency',
  'priceUsd',
  'priceConverted',
  'currencyInferred',
  'transmission',
  'fuel',
  'fuelEconomy',
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
  'risks',
  'opportunity',
  'reference',
] as const

export const carListingProjection: Record<string, 0 | 1> = Object.fromEntries([
  ['_id', 0],
  ...CAR_FIELDS.map(field => [field, 1]),
])

const sourceOf = (value: unknown): PublicCarSource =>
  CAR_SOURCES_PUBLIC.includes(value as PublicCarSource)
    ? (value as PublicCarSource)
    : 'mercadolibre'

function referenceOf(value: any): PublicCarReference | null {
  if (!value || !(Number(value.priceUsd) > 0)) return null
  return {
    priceUsd: Number(value.priceUsd),
    basis: value.basis === 'version' ? 'version' : 'year',
    updatedAt: String(value.updatedAt ?? ''),
  }
}
const optionalText = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const optionalNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const FUEL_ECONOMY_BASES = ['advert', 'model_engine', 'model', 'engine_class'] as const

/** Litres per 100 km, rebuilt field by field; anything malformed is no figure rather than a wrong one. */
function fuelEconomyOf(value: unknown): PublicCarFuelEconomy | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const litersPer100Km = optionalNumber(row.litersPer100Km)
  const basis = FUEL_ECONOMY_BASES.find(item => item === row.basis)
  if (litersPer100Km === null || litersPer100Km <= 0 || !basis) return null
  return {
    litersPer100Km,
    city: optionalNumber(row.city),
    highway: optionalNumber(row.highway),
    combined: optionalNumber(row.combined),
    basis,
    sellers: optionalNumber(row.sellers),
  }
}

const RISK_CATEGORIES = [
  'deuda',
  'papeles',
  'siniestro',
  'recupero',
  'mecanica',
  'chapa_extranjera',
  'uso_intensivo',
] as const

// La cita es texto del vendedor y se vuelve a acotar al leer: la frontera pública se revalida de
// este lado, no se confía en lo que quedó escrito en la base.
const riskOf = (raw: Record<string, unknown>): PublicCarRisk | null => {
  const category = RISK_CATEGORIES.find(name => name === raw.category)
  const quote = typeof raw.quote === 'string' ? raw.quote.slice(0, 200).trim() : ''
  if (!category || !quote) return null
  return {
    category,
    severity: raw.severity === 'media' ? 'media' : 'alta',
    quote,
    from: raw.from === 'title' ? 'title' : 'description',
  }
}

/** Rebuilds a public row field by field: unknown fields in the collection never reach the wire. */
export function publicCarRow(row: Record<string, any>): PublicCarListing {
  const source = sourceOf(row.source)
  return {
    key: String(row.key),
    source,
    sourceName: CAR_SOURCE_RULES[source].name,
    brand: String(row.brand),
    brandSlug: String(row.brandSlug),
    model: String(row.model),
    modelSlug: String(row.modelSlug),
    marketSlug: String(row.marketSlug),
    title: String(row.title),
    year: Number(row.year),
    km: optionalNumber(row.km),
    price: Number(row.price),
    // What the portal lists when the price is the cash price the advert states (often the down
    // payment). A missing or non-positive value means the listed number IS the price.
    listedPrice:
      optionalNumber(row.listedPrice) !== null && Number(row.listedPrice) > 0
        ? Number(row.listedPrice)
        : null,
    currency: row.currency === 'UYU' ? 'UYU' : 'USD',
    priceUsd: Number(row.priceUsd),
    priceConverted: row.priceConverted === true,
    currencyInferred: row.currencyInferred === true,
    transmission: row.transmission ?? null,
    fuel: row.fuel ?? null,
    fuelEconomy: fuelEconomyOf(row.fuelEconomy),
    engine: optionalText(row.engine),
    trim: optionalText(row.trim),
    department: optionalText(row.department),
    neighborhood: optionalText(row.neighborhood),
    sellerType: row.sellerType ?? null,
    dealerName: optionalText(row.dealerName),
    picture: carSafePicture(source, row.picture),
    pictureCount: optionalNumber(row.pictureCount),
    permalink: carSafePermalink(source, row.permalink),
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
    // La cita del vendedor se revalida acá también: sin cita legible no se publica el riesgo.
    risks: (Array.isArray(row.risks) ? row.risks : [])
      .map((item: Record<string, unknown>) => riskOf(item))
      .filter((item: PublicCarRisk | null): item is PublicCarRisk => !!item),
    opportunity: row.opportunity
      ? {
          tier: row.opportunity.tier === 'strict' ? 'strict' : 'exploratory',
          gap: Number(row.opportunity.gap),
          median: Number(row.opportunity.median),
          n: Number(row.opportunity.n),
        }
      : null,
    reference: referenceOf(row.reference),
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
        source: sourceOf(peer.source),
        sourceName: CAR_SOURCE_RULES[sourceOf(peer.source)].name,
        title: String(peer.title),
        year: Number(peer.year),
        km: Number(peer.km),
        priceUsd: Number(peer.priceUsd),
        trim: optionalText(peer.trim),
        engine: optionalText(peer.engine),
        sellerType: peer.sellerType ?? null,
        permalink: carSafePermalink(sourceOf(peer.source), peer.permalink),
        lastSeen: String(peer.lastSeen),
      })),
    })),
  }
  opportunityCache = { snapshot, expires: Date.now() + 180_000 }
  return snapshot
}

let riskCache: { expires: number; snapshot: PublicCarRiskSnapshot } | null = null
export async function loadCarRisks(): Promise<PublicCarRiskSnapshot | null> {
  if (riskCache && riskCache.expires > Date.now()) return riskCache.snapshot
  await connectDb()
  const doc = await CarRiskSnapshotModel.findOne({ key: 'used' })
    .select({ _id: 0, snapshot: 1 })
    .maxTimeMS(10_000)
    .lean()
  const raw = doc?.snapshot
  if (!raw || raw.version !== 1 || !Array.isArray(raw.items)) return null
  const snapshot: PublicCarRiskSnapshot = {
    ...raw,
    items: raw.items
      .map(entry => ({
        ...entry,
        subject: publicCarRow(entry.subject),
        risks: (Array.isArray(entry.risks) ? entry.risks : [])
          .map(item => riskOf(item as Record<string, unknown>))
          .filter((item): item is PublicCarRisk => !!item),
      }))
      // Un aviso sin ninguna cita legible no se publica: sin evidencia no hay afirmación.
      .filter(entry => entry.risks.length > 0),
  }
  riskCache = { snapshot, expires: Date.now() + 180_000 }
  return snapshot
}

let reportCache: { expires: number; snapshot: PublicCarReportSnapshot } | null = null
export async function loadCarReport(): Promise<PublicCarReportSnapshot | null> {
  if (reportCache && reportCache.expires > Date.now()) return reportCache.snapshot
  await connectDb()
  const doc = await CarReportSnapshotModel.findOne({ key: 'used' })
    .select({ _id: 0, snapshot: 1 })
    .maxTimeMS(10_000)
    .lean()
  const raw = doc?.snapshot
  // Son agregados: no hay fila de aviso que revalidar, sólo que el documento sea el que esperamos.
  if (!raw || raw.version !== 1 || !raw.data?.market) return null
  reportCache = { snapshot: raw, expires: Date.now() + 600_000 }
  return raw
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
  const raw = doc?.snapshot?.version === 1 ? doc.snapshot : null
  // Snapshots written before the ML guide existed have no guide fields.
  const snapshot = raw
    ? {
        ...raw,
        guide: Array.isArray(raw.guide) ? raw.guide : [],
        guideUpdatedAt: raw.guideUpdatedAt ?? null,
      }
    : null
  if (marketCache.size > 500) marketCache.clear()
  marketCache.set(slug, { snapshot, expires: Date.now() + 300_000 })
  return snapshot
}

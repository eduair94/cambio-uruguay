// Junta lo que necesita utils/carInsight.ts#buildCarInsight para la ficha de un aviso: los pares del
// mismo modelo, los autos de otros modelos en la misma plata y los snapshots que ya existen.
//
// Dos reglas que la ficha necesita:
//  * Si la lectura de PARES falla, no hay análisis (null), nunca uno vacío: un análisis sin pares
//    diría "todavía no hay cinco avisos comparables", que es falso, y taparía la frase de cohorte
//    del snapshot de mercado que la página sabe mostrar sola.
//  * Todo el análisis tiene un tope de tiempo. La ficha es el aviso; esto es lo de abajo.
import {
  buildCarInsight,
  CAR_INSIGHT_BAND_FLOOR,
  CAR_INSIGHT_PRICE_STRETCH,
  type CarInsight,
  type CarInsightBandRow,
} from '../../utils/carInsight'
import type { PublicCarListing, PublicCarMarketSnapshot } from '../../utils/carsPublic'
import { CarCatalogModel } from '../models/CarCatalog'
import { loadCarFuelPrices } from './carFuelPrices'
import { carListingProjection, loadCarAdvisor, loadCarReport, publicCarRow } from './cars'

/** Pares del mismo modelo, año ±2: alcanza para el modelo más publicado del catálogo. */
const MAX_PEERS = 1_500
/** Candidatos por orden para las tarjetas de otros modelos (después se filtran los no limpios). */
const PICK_CANDIDATES = 60
/** La banda entera en filas livianas, para la tabla de modelos. */
const MAX_BAND = 5_000
export const CAR_INSIGHT_TIMEOUT_MS = 4_000

const BAND_PROJECTION = {
  _id: 0,
  key: 1,
  marketSlug: 1,
  brand: 1,
  model: 1,
  year: 1,
  km: 1,
  priceUsd: 1,
  title: 1,
  flags: 1,
  risks: 1,
  currencyInferred: 1,
} as const

const rows = (docs: unknown[]): PublicCarListing[] =>
  docs.map(doc => publicCarRow(doc as Record<string, unknown>))

function bandRow(doc: Record<string, unknown>): CarInsightBandRow {
  return {
    key: String(doc.key ?? ''),
    marketSlug: String(doc.marketSlug ?? ''),
    brand: String(doc.brand ?? ''),
    model: String(doc.model ?? ''),
    year: Number(doc.year) || 0,
    km: typeof doc.km === 'number' ? doc.km : null,
    priceUsd: Number(doc.priceUsd) || 0,
    title: String(doc.title ?? ''),
    flags: Array.isArray(doc.flags) ? (doc.flags as CarInsightBandRow['flags']) : [],
    risks: Array.isArray(doc.risks) ? (doc.risks as CarInsightBandRow['risks']) : [],
    currencyInferred: doc.currencyInferred === true,
  }
}

async function readCarInsight(
  car: PublicCarListing,
  market: PublicCarMarketSnapshot | null,
  freshDays: number
): Promise<CarInsight | null> {
  const fresh = new Date(Date.now() - freshDays * 86_400_000).toISOString()
  const bandFilter = {
    priceUsd: {
      $gte: Math.round(car.priceUsd * CAR_INSIGHT_BAND_FLOOR),
      $lte: Math.round(car.priceUsd * CAR_INSIGHT_PRICE_STRETCH),
    },
    marketSlug: { $ne: car.marketSlug },
    lastSeen: { $gte: fresh },
    ...(car.body ? { 'body.type': car.body.type } : {}),
  }
  const candidates = (sort: Record<string, 1 | -1>, extra: Record<string, unknown> = {}) =>
    CarCatalogModel.find({ ...bandFilter, ...extra })
      .select(carListingProjection)
      .sort(sort)
      .limit(PICK_CANDIDATES)
      .maxTimeMS(3_000)
      .lean()
      .then(rows)
      .catch(() => [] as PublicCarListing[])
  const [peers, newest, lowestKm, band, report, advisor, fuel] = await Promise.all([
    CarCatalogModel.find({
      marketSlug: car.marketSlug,
      year: { $gte: car.year - 2, $lte: car.year + 2 },
      lastSeen: { $gte: fresh },
    })
      .select(carListingProjection)
      .limit(MAX_PEERS)
      .maxTimeMS(3_000)
      .lean()
      .then(rows)
      .catch(() => null),
    candidates({ year: -1, km: 1, key: 1 }),
    candidates({ km: 1, year: -1, key: 1 }, { km: { $gte: 1_000 } }),
    CarCatalogModel.find(bandFilter)
      .select(BAND_PROJECTION)
      .limit(MAX_BAND)
      .maxTimeMS(3_000)
      .lean()
      .then(docs => docs.map(doc => bandRow(doc as Record<string, unknown>)))
      .catch(() => [] as CarInsightBandRow[]),
    loadCarReport().catch(() => null),
    loadCarAdvisor().catch(() => null),
    loadCarFuelPrices().catch(() => null),
  ])
  if (!peers) return null
  const seen = new Set<string>()
  const alternatives = [...newest, ...lowestKm].filter(item =>
    seen.has(item.key) ? false : (seen.add(item.key), true)
  )
  return buildCarInsight({
    car,
    peers,
    alternatives,
    band,
    market,
    report,
    advisor,
    fuel:
      fuel?.latest?.super95 != null && fuel.latest.gasoil50s != null
        ? { super95: fuel.latest.super95, gasoil50s: fuel.latest.gasoil50s, asOf: fuel.asOf }
        : null,
  })
}

export function loadCarInsight(
  car: PublicCarListing,
  market: PublicCarMarketSnapshot | null,
  freshDays: number,
  timeoutMs = CAR_INSIGHT_TIMEOUT_MS
): Promise<CarInsight | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => resolve(null), timeoutMs)
  })
  return Promise.race([readCarInsight(car, market, freshDays).catch(() => null), timeout]).finally(
    () => clearTimeout(timer)
  )
}

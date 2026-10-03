// Junta lo que necesita utils/carInsight.ts#buildCarInsight para la ficha de un aviso: los pares del
// mismo modelo, los autos de otros modelos en la misma plata y los snapshots que ya existen. Cada
// lectura es opcional: si una tarda o falla, el análisis sale con lo que haya.
import {
  buildCarInsight,
  CAR_INSIGHT_BAND_FLOOR,
  CAR_INSIGHT_PRICE_STRETCH,
  type CarInsight,
} from '../../utils/carInsight'
import type { PublicCarListing, PublicCarMarketSnapshot } from '../../utils/carsPublic'
import { CarCatalogModel } from '../models/CarCatalog'
import { loadCarFuelPrices } from './carFuelPrices'
import { carListingProjection, loadCarAdvisor, loadCarReport, publicCarRow } from './cars'

/** Tope de filas por lectura: alcanza para cualquier modelo-año y no arrastra el catálogo entero. */
const MAX_ROWS = 400

const rows = (docs: unknown[]): PublicCarListing[] =>
  docs.map(doc => publicCarRow(doc as Record<string, unknown>))

export async function loadCarInsight(
  car: PublicCarListing,
  market: PublicCarMarketSnapshot | null,
  freshDays: number
): Promise<CarInsight> {
  const fresh = new Date(Date.now() - freshDays * 86_400_000).toISOString()
  const [peers, alternatives, report, advisor, fuel] = await Promise.all([
    CarCatalogModel.find({
      marketSlug: car.marketSlug,
      year: { $gte: car.year - 2, $lte: car.year + 2 },
      lastSeen: { $gte: fresh },
    })
      .select(carListingProjection)
      .limit(MAX_ROWS)
      .maxTimeMS(3_000)
      .lean()
      .then(rows)
      .catch(() => [] as PublicCarListing[]),
    CarCatalogModel.find({
      priceUsd: {
        $gte: Math.round(car.priceUsd * CAR_INSIGHT_BAND_FLOOR),
        $lte: Math.round(car.priceUsd * CAR_INSIGHT_PRICE_STRETCH),
      },
      marketSlug: { $ne: car.marketSlug },
      lastSeen: { $gte: fresh },
      ...(car.body ? { 'body.type': car.body.type } : {}),
    })
      .select(carListingProjection)
      .sort({ priceUsd: 1, key: 1 })
      .limit(MAX_ROWS)
      .maxTimeMS(3_000)
      .lean()
      .then(rows)
      .catch(() => [] as PublicCarListing[]),
    loadCarReport().catch(() => null),
    loadCarAdvisor().catch(() => null),
    loadCarFuelPrices().catch(() => null),
  ])
  return buildCarInsight({
    car,
    peers,
    alternatives,
    market,
    report,
    advisor,
    fuel:
      fuel?.latest?.super95 != null && fuel.latest.gasoil50s != null
        ? { super95: fuel.latest.super95, gasoil50s: fuel.latest.gasoil50s, asOf: fuel.asOf }
        : null,
  })
}

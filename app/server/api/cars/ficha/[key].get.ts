import { carKeyValid, type CarDetailResponse } from '../../../../utils/cars'
import { CarCatalogModel } from '../../../models/CarCatalog'
import {
  carFichaProjection,
  carListingProjection,
  loadCarCatalogMeta,
  loadCarMarket,
  loadCarOpportunities,
  publicCarRow,
} from '../../../utils/cars'
import { connectDb } from '../../../utils/db'
import { carHistory } from '../../../utils/priceHistory'

export default defineEventHandler(async event => {
  const key = String(getRouterParam(event, 'key') || '')
  if (!carKeyValid(key)) throw createError({ statusCode: 404, statusMessage: 'Advert not found' })
  let row: Record<string, unknown> | null
  let freshDays = 4
  try {
    await connectDb()
    freshDays = (await loadCarCatalogMeta())?.freshDays ?? 4
    row = (await CarCatalogModel.findOne({ key })
      .select(carFichaProjection)
      .maxTimeMS(5_000)
      .lean()) as Record<string, unknown> | null
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Advert temporarily unavailable',
      cause: error,
    })
  }
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Advert not found' })
  const car = publicCarRow(row)
  // Market, similar adverts and the opportunity are optional: a slow read never hides the advert.
  const [market, similar, opportunities, priceHistory] = await Promise.all([
    loadCarMarket(car.marketSlug).catch(() => null),
    CarCatalogModel.find({
      marketSlug: car.marketSlug,
      key: { $ne: car.key },
      year: { $gte: car.year - 1, $lte: car.year + 1 },
      lastSeen: { $gte: new Date(Date.now() - freshDays * 86_400_000).toISOString() },
    })
      .select(carListingProjection)
      .sort({ priceUsd: 1, key: 1 })
      .limit(8)
      .maxTimeMS(3_000)
      .lean()
      .then(rows => rows.map(entry => publicCarRow(entry as Record<string, unknown>)))
      .catch(() => []),
    loadCarOpportunities().catch(() => null),
    // El historial por aviso es opcional igual que el resto: una lectura lenta nunca esconde la ficha.
    carHistory(key).catch(() => null),
  ])
  const cohort =
    market?.rows.find(
      entry =>
        entry.year === car.year &&
        entry.trim === car.trim &&
        entry.engine === car.engine &&
        entry.transmission === car.transmission
    ) ??
    market?.years.find(entry => entry.year === car.year) ??
    null
  setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
  const response: CarDetailResponse = {
    car,
    cohort,
    market: market
      ? { slug: market.slug, brand: market.brand, model: market.model, listings: market.listings }
      : null,
    similar,
    opportunity: opportunities?.items.find(entry => entry.subject.key === key) ?? null,
    priceHistory,
  }
  return response
})

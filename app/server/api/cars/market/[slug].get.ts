import {
  CAR_MARKET_INDEX_MIN,
  carMarketSlugValid,
  type CarMarketResponse,
} from '../../../../utils/cars'
import type { PublicCarMarketSnapshot } from '../../../../utils/carsPublic'
import { CarCatalogModel } from '../../../models/CarCatalog'
import {
  carListingProjection,
  loadCarCatalogMeta,
  loadCarMarket,
  loadCarOpportunities,
  publicCarRow,
} from '../../../utils/cars'

export default defineEventHandler(async event => {
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!carMarketSlugValid(slug))
    throw createError({ statusCode: 404, statusMessage: 'Model not found' })
  let market: PublicCarMarketSnapshot | null
  let freshDays = 4
  try {
    market = await loadCarMarket(slug)
    freshDays = (await loadCarCatalogMeta())?.freshDays ?? 4
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Model temporarily unavailable',
      cause: error,
    })
  }
  if (!market) throw createError({ statusCode: 404, statusMessage: 'Model not found' })
  const [listings, opportunities] = await Promise.all([
    CarCatalogModel.find({
      marketSlug: slug,
      lastSeen: { $gte: new Date(Date.now() - freshDays * 86_400_000).toISOString() },
    })
      .select(carListingProjection)
      .sort({ year: -1, priceUsd: 1, key: 1 })
      .limit(48)
      .maxTimeMS(5_000)
      .lean()
      .then(rows => rows.map(row => publicCarRow(row as Record<string, unknown>)))
      .catch(() => []),
    loadCarOpportunities()
      .then(
        snapshot =>
          snapshot?.items.filter(entry => entry.subject.marketSlug === slug).slice(0, 6) ?? []
      )
      .catch(() => []),
  ])
  setResponseHeader(event, 'cache-control', 'public, max-age=120, s-maxage=300')
  const response: CarMarketResponse = {
    market,
    listings,
    opportunities,
    indexable: market.listings >= CAR_MARKET_INDEX_MIN,
  }
  return response
})

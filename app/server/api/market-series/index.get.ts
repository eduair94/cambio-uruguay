import {
  MARKET_VERTICALS,
  type MarketSeriesIndex,
  type MarketVertical,
} from '../../../utils/marketSeries'
import { MarketSeriesMetaModel } from '../../models/MarketSeries'
import { connectDb } from '../../utils/db'

/**
 * The `index:<market>` document written by currency-market-series: the places or models that have a
 * series today (the page's selectors) and the biggest same-offer moves.
 */
export default defineEventHandler(async (event): Promise<{ index: MarketSeriesIndex | null }> => {
  const vertical = String(getQuery(event).v || '')
  if (!(MARKET_VERTICALS as readonly string[]).includes(vertical))
    throw createError({ statusCode: 400, statusMessage: 'Unknown market' })
  try {
    await connectDb()
    const index = await MarketSeriesMetaModel.findOne({
      key: `index:${vertical as MarketVertical}`,
    })
      .select({ _id: 0, __v: 0 })
      .maxTimeMS(5_000)
      .lean()
    setResponseHeader(
      event,
      'cache-control',
      'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
    )
    return { index: (index as unknown as MarketSeriesIndex | null) ?? null }
  } catch {
    // Mongo caído no tira la página: cómo se mide y el FAQ valen igual.
    setResponseHeader(event, 'cache-control', 'no-store')
    return { index: null }
  }
})

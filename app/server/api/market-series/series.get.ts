import {
  carModelOfKey,
  housingSiblingKeys,
  isMarketSeriesKey,
  type MarketSeriesDoc,
  type MarketSeriesResponse,
  type MarketSibling,
} from '../../../utils/marketSeries'
import { MarketSeriesModel } from '../../models/MarketSeries'
import { connectDb } from '../../utils/db'

/**
 * One cohort's series plus its siblings: the other types and bedroom counts of the same place, or the
 * years of the same car model. A missing series is a 200 with `series: null` — the page explains that
 * the combination has too few adverts instead of showing an error.
 */
export default defineEventHandler(async (event): Promise<MarketSeriesResponse> => {
  const key = getQuery(event).key
  if (!isMarketSeriesKey(key))
    throw createError({ statusCode: 400, statusMessage: 'Invalid series key' })
  try {
    await connectDb()
    const model = carModelOfKey(key)
    // `model` only matches [a-z0-9-]: safe inside an anchored prefix regex, which rides the key index.
    const siblingFilter = model
      ? { key: { $regex: `^autos\\|USD\\|m:${model}\\|y:` } }
      : { key: { $in: housingSiblingKeys(key) } }
    const [series, siblings] = await Promise.all([
      MarketSeriesModel.findOne({ key }).select({ _id: 0, __v: 0 }).maxTimeMS(5_000).lean(),
      MarketSeriesModel.find(siblingFilter)
        .select({ _id: 0, key: 1, dims: 1, latest: 1, updatedAt: 1 })
        .limit(200)
        .maxTimeMS(5_000)
        .lean(),
    ])
    setResponseHeader(
      event,
      'cache-control',
      'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
    )
    return {
      series: (series as unknown as MarketSeriesDoc | null) ?? null,
      siblings: siblings as unknown as MarketSibling[],
    }
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return { series: null, siblings: [] }
  }
})

// Latest PricePrediction doc (date <= today) for a currency — absorbs a
// missed/failed cron day instead of 404ing, mirroring server/api/analysis/[currency].get.ts.
import { connectDb } from '../../utils/db'
import { PricePredictionModel } from '../../models/PricePrediction'
import { montevideoToday } from '../../../utils/blog'

export default defineCachedEventHandler(
  async event => {
    await connectDb()
    const raw = getRouterParam(event, 'currency') ?? ''
    const currency = raw.toUpperCase()
    if (!currency) {
      throw createError({ statusCode: 400, statusMessage: 'Missing currency' })
    }
    const doc = await PricePredictionModel.findOne({
      currency,
      date: { $lte: montevideoToday() },
    })
      .sort({ date: -1 })
      .lean()
    return doc ?? null
  },
  {
    maxAge: 60 * 30,
    staleMaxAge: 60 * 60 * 6,
    name: 'predictions',
    getKey: event => (getRouterParam(event, 'currency') ?? '').toUpperCase(),
  }
)

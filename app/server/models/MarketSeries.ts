import mongoose, { Schema } from 'mongoose'
import type { MarketSeriesDoc, MarketSeriesIndex } from '../../utils/marketSeries'

// Written by the backend job currency-market-series (classes/marketseries/store.ts); read-only here.
// The private per-advert log `marketpricelogs` is never read by the app.
const options = { autoCreate: false, autoIndex: false, strict: false }
export const MarketSeriesModel =
  (mongoose.models.MarketSeries as mongoose.Model<MarketSeriesDoc>) ||
  mongoose.model<MarketSeriesDoc>(
    'MarketSeries',
    new Schema({ key: String }, options),
    'marketseries'
  )
export const MarketSeriesMetaModel =
  (mongoose.models.MarketSeriesMeta as mongoose.Model<MarketSeriesIndex>) ||
  mongoose.model<MarketSeriesIndex>(
    'MarketSeriesMeta',
    new Schema({ key: String }, options),
    'marketseriesmetas'
  )

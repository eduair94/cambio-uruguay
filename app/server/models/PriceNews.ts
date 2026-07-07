import mongoose, { Schema, type Model } from 'mongoose'

export interface PriceNewsDoc {
  date: string // 'YYYY-MM-DD' America/Montevideo
  currency: string
  headlines: { title: string; source: string; link: string; pubDate: string }[]
}

const PriceNewsSchema = new Schema<PriceNewsDoc>(
  {
    date: { type: String, required: true },
    currency: { type: String, required: true },
    headlines: [
      {
        _id: false,
        title: String,
        source: String,
        link: String,
        pubDate: String,
      },
    ],
  },
  { timestamps: true }
)

PriceNewsSchema.index({ date: 1, currency: 1 }, { unique: true })

export const PriceNewsModel: Model<PriceNewsDoc> =
  (mongoose.models.PriceNews as Model<PriceNewsDoc>) ||
  mongoose.model<PriceNewsDoc>('PriceNews', PriceNewsSchema)

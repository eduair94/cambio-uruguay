import mongoose, { Schema, type Model } from 'mongoose'

export interface PricePredictionDoc {
  currency: string
  date: string // 'YYYY-MM-DD'
  ai: {
    lean: 'up' | 'down' | 'flat'
    confidence: 'low' | 'medium' | 'high'
    reasoning: string
    basedOn: { period: '7d' | '30d' | '90d'; pctChange: number }[]
  } | null
  externalForecasts: {
    source: string
    link: string
    direction: 'up' | 'down' | 'flat' | null
    summary: string
  }[]
}

const PricePredictionSchema = new Schema<PricePredictionDoc>(
  {
    currency: { type: String, required: true },
    date: { type: String, required: true },
    ai: {
      type: {
        _id: false,
        lean: { type: String, enum: ['up', 'down', 'flat'] },
        confidence: { type: String, enum: ['low', 'medium', 'high'] },
        reasoning: String,
        basedOn: {
          type: [{ _id: false, period: String, pctChange: Number }],
          default: [],
        },
      },
      default: null,
    },
    externalForecasts: {
      type: [
        {
          _id: false,
          source: String,
          link: String,
          direction: { type: String, enum: ['up', 'down', 'flat', null], default: null },
          summary: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
)

PricePredictionSchema.index({ currency: 1, date: 1 }, { unique: true })

export const PricePredictionModel: Model<PricePredictionDoc> =
  (mongoose.models.PricePrediction as Model<PricePredictionDoc>) ||
  mongoose.model<PricePredictionDoc>('PricePrediction', PricePredictionSchema)

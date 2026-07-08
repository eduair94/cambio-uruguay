import mongoose, { Schema, type Model } from 'mongoose'

export interface MoveExplanationDoc {
  currency: string
  date: string // 'YYYY-MM-DD'
  pctChange: number
  direction: 'up' | 'down'
  drivers: { key: string; dayMovePct: number }[]
  narrative: string | null
  headlines: { title: string; source: string; link: string }[]
}

const MoveExplanationSchema = new Schema<MoveExplanationDoc>(
  {
    currency: { type: String, required: true },
    date: { type: String, required: true },
    pctChange: { type: Number, required: true },
    direction: { type: String, required: true, enum: ['up', 'down'] },
    drivers: {
      type: [{ _id: false, key: String, dayMovePct: Number }],
      default: [],
    },
    narrative: { type: String, default: null },
    headlines: {
      type: [{ _id: false, title: String, source: String, link: String }],
      default: [],
    },
  },
  { timestamps: true }
)

MoveExplanationSchema.index({ currency: 1, date: 1 }, { unique: true })

export const MoveExplanationModel: Model<MoveExplanationDoc> =
  (mongoose.models.MoveExplanation as Model<MoveExplanationDoc>) ||
  mongoose.model<MoveExplanationDoc>('MoveExplanation', MoveExplanationSchema)

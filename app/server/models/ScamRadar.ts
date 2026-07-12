import mongoose, { Schema, type Model } from 'mongoose'

/**
 * The published radar: one doc per modus operandi, rewritten by each `reddit:sentiment` run.
 * The page reads only this, so a Reddit outage never blanks it.
 *
 * Note what is NOT stored: no company names, no accusations. Only the pattern, counts, links to
 * the threads, and fragments that passed `isSafeToQuote`.
 */
export interface ScamRadarDoc {
  patternId: string
  label: string
  icon: string
  how: string
  defence: string
  reports: number
  recent: number
  threads: Array<{ date: string; permalink: string; sub: string }>
  quotes: Array<{ text: string; date: string; permalink: string; sub: string }>
  asOf: Date
}

const ScamRadarSchema = new Schema<ScamRadarDoc>(
  {
    patternId: { type: String, required: true },
    label: { type: String, default: '' },
    icon: { type: String, default: '' },
    how: { type: String, default: '' },
    defence: { type: String, default: '' },
    reports: { type: Number, default: 0 },
    recent: { type: Number, default: 0 },
    threads: {
      type: [{ _id: false, date: String, permalink: String, sub: String }],
      default: [],
    },
    quotes: {
      type: [{ _id: false, text: String, date: String, permalink: String, sub: String }],
      default: [],
    },
    asOf: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

ScamRadarSchema.index({ patternId: 1 }, { unique: true })

export const ScamRadarModel: Model<ScamRadarDoc> =
  (mongoose.models.ScamRadar as Model<ScamRadarDoc>) ||
  mongoose.model<ScamRadarDoc>('ScamRadar', ScamRadarSchema)

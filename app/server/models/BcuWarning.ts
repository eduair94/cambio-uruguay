import mongoose, { Schema, type Model } from 'mongoose'
import type { WarningKind } from '../../utils/bcuWarnings'

/**
 * A BCU advertencia, stored so the page never depends on the BCU being up, and so we can detect
 * what CHANGES — in nine months of archived snapshots the BCU never removed an entry, so if one
 * ever disappears we would be the only ones with the record.
 *
 * `firstSeenAt` is deliberately never overwritten: it is our evidence of when we published a
 * claim about a named company.
 */
export interface BcuWarningDoc {
  /** Stable key: the BCU's date + its own headline. */
  key: string
  date: string // 'YYYY-MM-DD'
  title: string
  entities: string
  kind: WarningKind
  url: string
  sharedSource: boolean
  firstSeenAt: Date
  lastSeenAt: Date
}

const BcuWarningSchema = new Schema<BcuWarningDoc>(
  {
    key: { type: String, required: true },
    date: { type: String, default: '' },
    title: { type: String, default: '' },
    entities: { type: String, default: '' },
    kind: { type: String, default: 'otro' },
    url: { type: String, default: '' },
    sharedSource: { type: Boolean, default: false },
    firstSeenAt: { type: Date, default: () => new Date() },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
)

BcuWarningSchema.index({ key: 1 }, { unique: true })
BcuWarningSchema.index({ date: -1 })

export const BcuWarningModel: Model<BcuWarningDoc> =
  (mongoose.models.BcuWarning as Model<BcuWarningDoc>) ||
  mongoose.model<BcuWarningDoc>('BcuWarning', BcuWarningSchema)

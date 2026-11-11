import mongoose, { Schema } from 'mongoose'
import type { FeedbackRecord } from '../../utils/siteFeedback'

/**
 * One answer from the site-wide feedback (utils/siteFeedback.ts): a suggestion, a bug report, a
 * compliment or the one-tap "¿Te sirvió esta página?". No IP is stored; `clientId` is a random
 * per-browser id. The e-mail is there only when the person left it to be answered, and the
 * technical data only for a bug report whose box was left checked.
 */
export interface SiteFeedbackDoc extends FeedbackRecord {
  _id: mongoose.Types.ObjectId
  userAgent: string | null
  emailed: boolean
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<SiteFeedbackDoc>(
  {
    kind: { type: String, required: true },
    helpful: { type: String, default: null },
    message: { type: String, default: '' },
    email: { type: String, default: null, select: false },
    path: { type: String, default: '/' },
    locale: { type: String, default: 'es' },
    tech: { type: Schema.Types.Mixed, default: null },
    userAgent: { type: String, default: null },
    clientId: { type: String, default: null },
    emailed: { type: Boolean, default: false },
  },
  { timestamps: true, minimize: false, collection: 'sitefeedbacks' }
)
schema.index({ createdAt: -1 })
schema.index({ kind: 1, path: 1, createdAt: -1 })

export const SiteFeedbackModel =
  (mongoose.models.SiteFeedback as mongoose.Model<SiteFeedbackDoc>) ||
  mongoose.model<SiteFeedbackDoc>('SiteFeedback', schema)

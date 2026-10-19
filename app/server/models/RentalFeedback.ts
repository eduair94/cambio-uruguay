import mongoose, { Schema } from 'mongoose'
import type { RentalFeedbackRecord } from '../../utils/rentalFeedback'

/**
 * One answer from someone who used the rental directory (see utils/rentalFeedback.ts for the closed
 * lists every field is checked against). No IP is stored; `clientId` is a random per-browser id, and
 * the e-mail is there only when the person left it to be answered.
 */
export interface RentalFeedbackDoc extends RentalFeedbackRecord {
  _id: mongoose.Types.ObjectId
  /** The alert's kind when the answer came from an alert email. */
  alertKind: string | null
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<RentalFeedbackDoc>(
  {
    kind: { type: String, required: true },
    surface: { type: String, required: true },
    path: { type: String, default: '' },
    filters: { type: [String], default: [] },
    zone: { type: String, default: null },
    propertyKey: { type: String, default: null },
    found: { type: String, default: null },
    reasons: { type: [String], default: [] },
    goal: { type: String, default: null },
    answers: { type: Schema.Types.Mixed, default: {} },
    surveyVersion: { type: String, default: null },
    comment: { type: String, default: '' },
    email: { type: String, default: null, select: false },
    alertId: { type: String, default: null },
    alertKind: { type: String, default: null },
    clientId: { type: String, default: null },
  },
  { timestamps: true, minimize: false, collection: 'rentalfeedbacks' }
)
schema.index({ createdAt: -1 })
// One survey answer per alert and wording: answering again from the next email updates it.
schema.index(
  { surveyVersion: 1, alertId: 1 },
  { unique: true, partialFilterExpression: { kind: 'survey', alertId: { $type: 'string' } } }
)

export const RentalFeedbackModel =
  (mongoose.models.RentalFeedback as mongoose.Model<RentalFeedbackDoc>) ||
  mongoose.model<RentalFeedbackDoc>('RentalFeedback', schema)

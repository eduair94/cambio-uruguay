import mongoose, { Schema, type Model } from 'mongoose'
import type { RentalAlertKind } from '../../utils/rentalAlerts'
export type RentalAlertChannelStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'uncertain'
  | 'unavailable'
  | 'skipped'
export interface RentalAlertChannelState {
  status: RentalAlertChannelStatus
  attempts: number
  nextAttemptAt: Date | null
  reason: string | null
}
export interface RentalAlertOutboxDoc {
  _id: string
  alertId: string
  uid: string
  kind: RentalAlertKind
  revision: number
  algorithm: string
  candidateIds: string[]
  cursorAt: Date
  cursorId: string
  state: 'pending' | 'complete' | 'cancelled'
  channels: { email: RentalAlertChannelState; push: RentalAlertChannelState }
  createdAt: Date
  completedAt: Date | null
}
const channel = new Schema<RentalAlertChannelState>(
  {
    status: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: null },
    reason: { type: String, default: null },
  },
  { _id: false }
)
const schema = new Schema<RentalAlertOutboxDoc>(
  {
    _id: { type: String, required: true },
    alertId: { type: String, required: true },
    uid: { type: String, required: true },
    kind: { type: String, required: true },
    revision: { type: Number, required: true },
    algorithm: { type: String, required: true },
    candidateIds: { type: [String], required: true },
    cursorAt: { type: Date, required: true },
    cursorId: { type: String, required: true },
    state: { type: String, enum: ['pending', 'complete', 'cancelled'], default: 'pending' },
    channels: { email: { type: channel, required: true }, push: { type: channel, required: true } },
    createdAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
  },
  { versionKey: false }
)
schema.index({ alertId: 1, revision: 1, state: 1, createdAt: -1 })
schema.index({ state: 1, createdAt: 1 })
export const RentalAlertOutboxModel: Model<RentalAlertOutboxDoc> =
  (mongoose.models.RentalAlertOutbox as Model<RentalAlertOutboxDoc>) ||
  mongoose.model<RentalAlertOutboxDoc>('RentalAlertOutbox', schema, 'rentalalertoutbox')

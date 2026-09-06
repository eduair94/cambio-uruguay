import mongoose, { Schema, type Model, type Types } from 'mongoose'
import type {
  RentalAlertFilters,
  RentalAlertFrequency,
  RentalAlertKind,
} from '../../utils/rentalAlerts'

export interface RentalAlertDoc {
  _id: Types.ObjectId
  uid: string
  kind: RentalAlertKind
  name: string
  filters: RentalAlertFilters
  fingerprint: string
  channels: { push: boolean; email: boolean }
  frequency: RentalAlertFrequency
  active: boolean
  locale: 'es' | 'en' | 'pt'
  startsAt: Date
  revision: number
  emailAddress: string | null
  unsubscribeToken: string
  lastNotifiedAt: Date | null
  lastCheckedAt: Date | null
  cursorAt: Date | null
  cursorId: string
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<RentalAlertDoc>(
  {
    uid: { type: String, required: true },
    kind: { type: String, enum: ['rental-search', 'rental-opportunity'], required: true },
    name: { type: String, required: true, maxlength: 80 },
    filters: { type: Schema.Types.Mixed, required: true },
    fingerprint: { type: String, required: true },
    channels: { push: { type: Boolean, default: false }, email: { type: Boolean, default: false } },
    frequency: { type: String, enum: ['hourly', 'daily'], default: 'hourly' },
    active: { type: Boolean, default: true },
    locale: { type: String, enum: ['es', 'en', 'pt'], default: 'es' },
    startsAt: { type: Date, required: true },
    revision: { type: Number, default: 1 },
    emailAddress: { type: String, default: null, select: false },
    unsubscribeToken: { type: String, required: true, select: false },
    lastNotifiedAt: { type: Date, default: null },
    lastCheckedAt: { type: Date, default: null },
    cursorAt: { type: Date, default: null },
    cursorId: { type: String, default: '' },
  },
  { timestamps: true }
)
schema.index({ uid: 1, fingerprint: 1 }, { unique: true })
schema.index({ active: 1, _id: 1 })
schema.index({ unsubscribeToken: 1 }, { unique: true })
export const RentalAlertModel: Model<RentalAlertDoc> =
  (mongoose.models.RentalAlert as Model<RentalAlertDoc>) ||
  mongoose.model<RentalAlertDoc>('RentalAlert', schema, 'rentalalerts')

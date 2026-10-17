import mongoose, { Schema, type Model, type Types } from 'mongoose'
import {
  RENTAL_ALERT_KINDS,
  type RentalAlertFilters,
  type RentalAlertFrequency,
  type RentalAlertKind,
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
  /** Missing on subscriptions created before price drops existed: read as false. */
  priceDrops?: boolean
  /** Drops discovered at or before this frontier predate consent (set when enabled later). */
  priceDropsFrom?: Date | null
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
    kind: { type: String, enum: RENTAL_ALERT_KINDS, required: true },
    name: { type: String, required: true, maxlength: 80 },
    filters: { type: Schema.Types.Mixed, required: true },
    fingerprint: { type: String, required: true },
    channels: { push: { type: Boolean, default: false }, email: { type: Boolean, default: false } },
    frequency: { type: String, enum: ['hourly', 'daily'], default: 'hourly' },
    priceDrops: { type: Boolean, default: false },
    priceDropsFrom: { type: Date, default: null },
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
  // Without this an unfiltered alert ({}) is saved with no `filters` field at all.
  { timestamps: true, minimize: false }
)
schema.index({ uid: 1, fingerprint: 1 }, { unique: true })
schema.index({ active: 1, _id: 1 })
schema.index({ unsubscribeToken: 1 }, { unique: true })
export const RentalAlertModel: Model<RentalAlertDoc> =
  (mongoose.models.RentalAlert as Model<RentalAlertDoc>) ||
  mongoose.model<RentalAlertDoc>('RentalAlert', schema, 'rentalalerts')

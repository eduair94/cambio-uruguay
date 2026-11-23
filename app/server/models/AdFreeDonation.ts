import mongoose, { Schema, type Model } from 'mongoose'
import type { AdFreeCurrency, AdFreeProvider, DonationStatus } from '../../utils/adFree'

/**
 * One real payment, as the provider reported it the last time we asked. Keyed by the provider's
 * own payment id (`mp:<id>` / `pp:<captureId>`), not by the order: the same Mercado Pago preference
 * can be paid twice, and both are donations. `User.adFreeUntil` is recomputed from the approved
 * ones every time any of them changes (`recomputeUser`), so a repeated or late webhook cannot add
 * or remove a period twice.
 */
export interface AdFreeDonationDoc {
  _id: string
  orderId: string
  uid: string
  provider: AdFreeProvider
  amount: number
  currency: AdFreeCurrency
  status: DonationStatus
  statusDetail: string | null
  /** Set the first time the payment is seen approved, never moved afterwards. */
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const AdFreeDonationSchema = new Schema<AdFreeDonationDoc>(
  {
    _id: { type: String },
    orderId: { type: String, required: true, index: true },
    uid: { type: String, required: true, index: true },
    provider: { type: String, required: true, enum: ['mercadopago', 'paypal'] },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, enum: ['UYU', 'USD'] },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back'],
    },
    statusDetail: { type: String, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true, _id: false, collection: 'adfreedonations' }
)

export const AdFreeDonationModel: Model<AdFreeDonationDoc> =
  (mongoose.models.AdFreeDonation as Model<AdFreeDonationDoc>) ||
  mongoose.model<AdFreeDonationDoc>('AdFreeDonation', AdFreeDonationSchema)

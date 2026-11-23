import mongoose, { Schema, type Model } from 'mongoose'
import type { AdFreeCurrency, AdFreeProvider } from '../../utils/adFree'

/**
 * One click on «Aportar»: what the person asked to pay, before any provider said anything. Its
 * `_id` travels to the provider as `external_reference` (Mercado Pago) / `custom_id` (PayPal), and
 * every payment read back is checked against it (`checkAgainstOrder`). It never grants anything by
 * itself: that is `AdFreeDonation`'s job, one per real payment.
 */
export interface AdFreeOrderDoc {
  _id: string
  uid: string
  provider: AdFreeProvider
  amount: number
  currency: AdFreeCurrency
  /** Mercado Pago preference id / PayPal order id, once the provider created it. */
  providerRef: string | null
  createdAt: Date
}

const AdFreeOrderSchema = new Schema<AdFreeOrderDoc>(
  {
    _id: { type: String },
    uid: { type: String, required: true, index: true },
    provider: { type: String, required: true, enum: ['mercadopago', 'paypal'] },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, enum: ['UYU', 'USD'] },
    providerRef: { type: String, default: null, index: true, sparse: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false, collection: 'adfreeorders' }
)

export const AdFreeOrderModel: Model<AdFreeOrderDoc> =
  (mongoose.models.AdFreeOrder as Model<AdFreeOrderDoc>) ||
  mongoose.model<AdFreeOrderDoc>('AdFreeOrder', AdFreeOrderSchema)

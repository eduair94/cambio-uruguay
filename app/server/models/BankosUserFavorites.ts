// Per-user favourite discount stores for /descuentos-con-tarjeta-uruguay. Anonymous users keep
// them in localStorage; logging in merges and syncs them across devices. One doc per uid.
import mongoose, { Schema, type Model } from 'mongoose'

export interface BankosUserFavoritesDoc {
  uid: string
  /** Bankos locationIds. */
  favorites: string[]
}

const BankosUserFavoritesSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    favorites: { type: [String], default: [] },
  },
  { timestamps: true }
)

export const BankosUserFavoritesModel: Model<BankosUserFavoritesDoc> =
  (mongoose.models.BankosUserFavorites as Model<BankosUserFavoritesDoc>) ||
  mongoose.model<BankosUserFavoritesDoc>(
    'BankosUserFavorites',
    BankosUserFavoritesSchema,
    'bankosuserfavorites'
  )

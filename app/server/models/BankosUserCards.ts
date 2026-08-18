// Per-user Bankos card selection for /descuentos-con-tarjeta-uruguay. Written only when the user is
// logged in; anonymous selections live in localStorage on the client. One doc per uid.
import mongoose, { Schema, type Model } from 'mongoose'

export interface BankosUserCardsDoc {
  uid: string
  cards: string[]
}

const BankosUserCardsSchema = new Schema(
  {
    uid: { type: String, required: true, unique: true, index: true },
    cards: { type: [String], default: [] },
  },
  { timestamps: true }
)

export const BankosUserCardsModel: Model<BankosUserCardsDoc> =
  (mongoose.models.BankosUserCards as Model<BankosUserCardsDoc>) ||
  mongoose.model<BankosUserCardsDoc>('BankosUserCards', BankosUserCardsSchema, 'bankosusercards')

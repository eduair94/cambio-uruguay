import mongoose, { Schema } from 'mongoose'

// Private: one phone record per published advert, written by the backend job (sync_autos.ts). Read
// ONLY by /api/cars/contact/[key], which rebuilds the answer through server/utils/carContacts.ts.
export interface CarContactDocument {
  key: string
  source: string
  sellerType: string | null
  origin: string
  phones: Array<{ value: string; mobile: boolean }>
  sourceUrl: string
  observedAt: string
  updatedAt: string
}

export const CarContactModel =
  (mongoose.models.CarContact as mongoose.Model<CarContactDocument>) ||
  mongoose.model<CarContactDocument>(
    'CarContact',
    new Schema({ key: String }, { autoCreate: false, autoIndex: false, strict: false }),
    'carcontacts'
  )

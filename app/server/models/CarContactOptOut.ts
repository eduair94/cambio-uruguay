import mongoose, { Schema } from 'mongoose'

// Private: numbers whose owner asked us to stop showing them. `_id` is carContactHash(value), so the
// list is not a readable directory; the backend job reads it too and never republishes those numbers.
export interface CarContactOptOutDocument {
  _id: string
  createdAt: string
  key: string
}

export const CarContactOptOutModel =
  (mongoose.models.CarContactOptOut as mongoose.Model<CarContactOptOutDocument>) ||
  mongoose.model<CarContactOptOutDocument>(
    'CarContactOptOut',
    new Schema(
      { _id: String, createdAt: String, key: String },
      { autoCreate: false, autoIndex: false, versionKey: false }
    ),
    'carcontactoptouts'
  )

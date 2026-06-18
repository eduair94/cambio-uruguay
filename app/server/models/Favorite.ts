import mongoose, { Schema, type Model } from 'mongoose'

export interface FavoriteDoc {
  uid: string
  type: 'casa' | 'currency' | 'pair'
  key: string
  label: string
}

const FavoriteSchema = new Schema<FavoriteDoc>(
  {
    uid: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['casa', 'currency', 'pair'] },
    key: { type: String, required: true },
    label: { type: String, default: '' },
  },
  { timestamps: true }
)

FavoriteSchema.index({ uid: 1, type: 1, key: 1 }, { unique: true })

export const FavoriteModel: Model<FavoriteDoc> =
  (mongoose.models.Favorite as Model<FavoriteDoc>) ||
  mongoose.model<FavoriteDoc>('Favorite', FavoriteSchema)

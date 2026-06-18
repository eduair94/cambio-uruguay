import mongoose, { Schema } from 'mongoose'

const FavoriteSchema = new Schema(
  {
    uid: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['casa', 'currency', 'pair'] },
    key: { type: String, required: true },
    label: { type: String, default: '' },
  },
  { timestamps: true }
)

FavoriteSchema.index({ uid: 1, type: 1, key: 1 }, { unique: true })

export const FavoriteModel = mongoose.models.Favorite || mongoose.model('Favorite', FavoriteSchema)

import mongoose, { Schema } from 'mongoose'

const UserSchema = new Schema(
  {
    _id: { type: String }, // firebase uid
    email: { type: String, default: null },
    name: { type: String, default: null },
    photo: { type: String, default: null },
    settings: {
      locale: { type: String, default: 'es' },
      defaultDirection: { type: String, default: null },
    },
  },
  { timestamps: true, _id: false }
)

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema)

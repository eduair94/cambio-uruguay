import mongoose, { Schema, type Model } from 'mongoose'

export interface UserDoc {
  _id: string // firebase uid
  email: string | null
  name: string | null
  photo: string | null
  settings: {
    locale: string
    defaultDirection: string | null
  }
  fcmTokens: string[]
  telegramChatId: string | null
  newsletter: { email: boolean; telegram: boolean }
}

const UserSchema = new Schema<UserDoc>(
  {
    _id: { type: String }, // firebase uid
    email: { type: String, default: null },
    name: { type: String, default: null },
    photo: { type: String, default: null },
    settings: {
      locale: { type: String, default: 'es' },
      defaultDirection: { type: String, default: null },
    },
    fcmTokens: { type: [String], default: [] },
    telegramChatId: { type: String, default: null },
    newsletter: {
      email: { type: Boolean, default: false },
      telegram: { type: Boolean, default: false },
    },
  },
  { timestamps: true, _id: false }
)

export const UserModel: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>('User', UserSchema)

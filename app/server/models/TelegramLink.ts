import mongoose, { Schema, type Model } from 'mongoose'

export interface TelegramLinkDoc {
  code: string
  uid: string
  createdAt: Date
}

const TelegramLinkSchema = new Schema<TelegramLinkDoc>({
  code: { type: String, required: true, unique: true },
  uid: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})
// TTL: codes expire 10 minutes after creation.
TelegramLinkSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 })

export const TelegramLinkModel: Model<TelegramLinkDoc> =
  (mongoose.models.TelegramLink as Model<TelegramLinkDoc>) ||
  mongoose.model<TelegramLinkDoc>('TelegramLink', TelegramLinkSchema)

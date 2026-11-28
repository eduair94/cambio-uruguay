import mongoose, { Schema, type Model } from 'mongoose'

export type TopicSubscriptionStatus = 'pending' | 'confirmed' | 'unsubscribed'

/** Un aviso de un tema (server/utils/topics.ts). Separado del newsletter. */
export interface TopicSubscriptionDoc {
  email: string // lowercased
  topic: string // TopicId
  language: string // 'es' | 'en' | 'pt'
  status: TopicSubscriptionStatus
  confirmToken: string
  unsubToken: string
  confirmedAt: Date | null
  /** Estados del dato ya avisados a esta dirección ('provisorio', 'definitivo'). */
  notified: string[]
}

const TopicSubscriptionSchema = new Schema<TopicSubscriptionDoc>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    topic: { type: String, required: true },
    language: { type: String, default: 'es' },
    status: { type: String, enum: ['pending', 'confirmed', 'unsubscribed'], default: 'pending' },
    confirmToken: { type: String, default: '', index: true },
    unsubToken: { type: String, default: '', index: true },
    confirmedAt: { type: Date, default: null },
    notified: { type: [String], default: [] },
  },
  { timestamps: true }
)
TopicSubscriptionSchema.index({ email: 1, topic: 1 }, { unique: true })
TopicSubscriptionSchema.index({ topic: 1, status: 1 })

export const TopicSubscriptionModel: Model<TopicSubscriptionDoc> =
  (mongoose.models.TopicSubscription as Model<TopicSubscriptionDoc>) ||
  mongoose.model<TopicSubscriptionDoc>('TopicSubscription', TopicSubscriptionSchema)

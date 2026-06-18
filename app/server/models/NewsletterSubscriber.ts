import mongoose, { Schema, type Model } from 'mongoose'

export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed'

export interface NewsletterSubscriberDoc {
  email: string // unique, lowercased
  language: string // 'es' | 'en' | 'pt'
  status: SubscriberStatus
  confirmToken: string // used by /confirm (rotated on each subscribe)
  unsubToken: string // stable, used by one-click /unsubscribe
  confirmedAt: Date | null
}

const NewsletterSubscriberSchema = new Schema<NewsletterSubscriberDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    language: { type: String, default: 'es' },
    status: { type: String, enum: ['pending', 'confirmed', 'unsubscribed'], default: 'pending' },
    confirmToken: { type: String, default: '' },
    unsubToken: { type: String, default: '' },
    confirmedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

export const NewsletterSubscriberModel: Model<NewsletterSubscriberDoc> =
  (mongoose.models.NewsletterSubscriber as Model<NewsletterSubscriberDoc>) ||
  mongoose.model<NewsletterSubscriberDoc>('NewsletterSubscriber', NewsletterSubscriberSchema)

import mongoose, { Schema, type Model } from 'mongoose'

export interface SharedLinkDoc {
  _id: string
  targetHash: string
  path: string
  title: string
  description: string
  createdAt: Date
}

const schema = new Schema<SharedLinkDoc>(
  {
    _id: { type: String, required: true },
    targetHash: { type: String, required: true, unique: true, select: false },
    path: { type: String, required: true, maxlength: 4096 },
    title: { type: String, required: true, maxlength: 140 },
    description: { type: String, default: '', maxlength: 240 },
    createdAt: { type: Date, required: true },
  },
  { collection: 'sharedlinks', versionKey: false }
)
// Deliberately no TTL: a link already sent to someone must survive worker restarts and time.
export const SharedLinkModel: Model<SharedLinkDoc> =
  (mongoose.models.SharedLink as Model<SharedLinkDoc>) ||
  mongoose.model<SharedLinkDoc>('SharedLink', schema)

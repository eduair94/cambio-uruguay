import mongoose, { Schema, type Model } from 'mongoose'

/** Private device ownership. The token hash is the unique, atomic ownership key. */
export interface PushRegistrationDoc {
  _id: string
  token: string
  uid: string
  updatedAt: Date
  createdAt: Date
}

const schema = new Schema<PushRegistrationDoc>(
  {
    _id: { type: String },
    token: { type: String, required: true },
    uid: { type: String, required: true, index: true },
  },
  { timestamps: true, _id: false }
)

export const PushRegistrationModel: Model<PushRegistrationDoc> =
  (mongoose.models.PushRegistration as Model<PushRegistrationDoc>) ||
  mongoose.model<PushRegistrationDoc>('PushRegistration', schema)

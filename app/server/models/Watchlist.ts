import mongoose, { Schema, type Model } from 'mongoose'

/** The zone a watchlist is about — a point + radius, or a whole department. */
export interface WatchlistZoneDoc {
  mode: 'point' | 'department'
  lat?: number
  lng?: number
  radiusKm?: number
  department?: string
  label?: string
}

/** A user's personal watchlist for `/mi-lista` (one document per uid). */
export interface WatchlistDoc {
  uid: string
  zone: WatchlistZoneDoc | null
  origins: string[]
  cards: string[]
  currencies: string[]
  direction: 'buy' | 'sell'
  amountUsd: number
}

const WatchlistZoneSchema = new Schema<WatchlistZoneDoc>(
  {
    mode: { type: String, required: true, enum: ['point', 'department'] },
    lat: { type: Number },
    lng: { type: Number },
    radiusKm: { type: Number },
    department: { type: String },
    label: { type: String },
  },
  { _id: false }
)

const WatchlistSchema = new Schema<WatchlistDoc>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    zone: { type: WatchlistZoneSchema, default: null },
    origins: { type: [String], default: [] },
    cards: { type: [String], default: [] },
    currencies: { type: [String], default: ['USD'] },
    direction: { type: String, enum: ['buy', 'sell'], default: 'sell' },
    amountUsd: { type: Number, default: 100 },
  },
  { timestamps: true }
)

export const WatchlistModel: Model<WatchlistDoc> =
  (mongoose.models.Watchlist as Model<WatchlistDoc>) ||
  mongoose.model<WatchlistDoc>('Watchlist', WatchlistSchema)

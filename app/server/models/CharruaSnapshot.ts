import mongoose, { Schema, type Model } from 'mongoose'

// El tablero de /mercado-it-uruguay (key "snapshot") y el estado del job (key "state"). Lo
// escribe `currency-charruadevs`; el espejo del backend es classes/models/CharruaSnapshot.ts.
export interface CharruaSnapshotDoc {
  key: string
  generatedAt: Date
  data: unknown
}

const CharruaSnapshotSchema = new Schema<CharruaSnapshotDoc>(
  {
    key: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { versionKey: false, minimize: false, autoIndex: false }
)

export const CharruaSnapshotModel: Model<CharruaSnapshotDoc> =
  (mongoose.models.CharruaSnapshot as Model<CharruaSnapshotDoc>) ||
  mongoose.model<CharruaSnapshotDoc>('CharruaSnapshot', CharruaSnapshotSchema, 'charruadevssnapshots')

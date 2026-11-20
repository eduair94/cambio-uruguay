import mongoose, { Schema, type Model } from 'mongoose'

// El documento precalculado de /monopatines-electricos-uruguay que escribe `sync_movilidad_specs.ts`
// (ver classes/models/MovilidadSpecSnapshot.ts y classes/movilidad/specs/snapshot.ts): los
// candidatos del asesor y las medianas de cada tipo. La página sólo lo lee.
// `tests/appdb/schema_parity.test.ts` mantiene los dos lados iguales.
export interface MovilidadSpecSnapshotDoc {
  key: string
  generatedAt: string
  candidates: unknown[]
  stats: unknown
}

const MovilidadSpecSnapshotSchema = new Schema<MovilidadSpecSnapshotDoc>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    candidates: { type: [Schema.Types.Mixed], default: [] },
    stats: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

MovilidadSpecSnapshotSchema.index({ key: 1 }, { unique: true })

export const MovilidadSpecSnapshotModel: Model<MovilidadSpecSnapshotDoc> =
  (mongoose.models.MovilidadSpecSnapshot as Model<MovilidadSpecSnapshotDoc>) ||
  mongoose.model<MovilidadSpecSnapshotDoc>(
    'MovilidadSpecSnapshot',
    MovilidadSpecSnapshotSchema,
    'movilidadspecsnapshots'
  )

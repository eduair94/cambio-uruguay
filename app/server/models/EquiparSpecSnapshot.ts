import mongoose, { Schema, type Model } from 'mongoose'

// El documento precalculado del asesor "¿Qué tamaño necesitás?" de /equipar-casa-uruguay/<categoria>
// que escribe `sync_equipar_specs.ts` (ver classes/models/EquiparSpecSnapshot.ts). La página sólo lo
// lee. `tests/appdb/schema_parity.test.ts` mantiene los dos lados iguales.
export interface EquiparSpecSnapshotDoc {
  key: string
  generatedAt: string
  candidates: unknown[]
  total: number
  withFicha: number
}

const EquiparSpecSnapshotSchema = new Schema<EquiparSpecSnapshotDoc>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    candidates: { type: [Schema.Types.Mixed], default: [] },
    total: { type: Number, default: 0 },
    withFicha: { type: Number, default: 0 },
  },
  { timestamps: true }
)

EquiparSpecSnapshotSchema.index({ key: 1 }, { unique: true })

export const EquiparSpecSnapshotModel: Model<EquiparSpecSnapshotDoc> =
  (mongoose.models.EquiparSpecSnapshot as Model<EquiparSpecSnapshotDoc>) ||
  mongoose.model<EquiparSpecSnapshotDoc>(
    'EquiparSpecSnapshot',
    EquiparSpecSnapshotSchema,
    'equiparspecsnapshots'
  )

import mongoose, { Schema, type Model } from 'mongoose'

// Un documento (`key: "current"`) con los conteos y la última corrida del job de
// /emprendimientos-de-instagram-uruguay. `state` es la memoria del job (hilos de Reddit leídos,
// cola de Uruguay Emprendedor) y la API nunca la sirve. Espejo de classes/models/EmprendimientoMeta.ts.
interface EmprendimientoMetaDoc {
  key: string
  generatedAt: string
  listed: number
  byRubro: Record<string, number>
  byDepartamento: Record<string, number>
  candidates: Record<string, number>
  sources: Record<string, unknown>
  lastRun: unknown
  state: unknown
}

const EmprendimientoMetaSchema = new Schema<EmprendimientoMetaDoc>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    listed: { type: Number, default: 0 },
    byRubro: { type: Schema.Types.Mixed, default: {} },
    byDepartamento: { type: Schema.Types.Mixed, default: {} },
    candidates: { type: Schema.Types.Mixed, default: {} },
    sources: { type: Schema.Types.Mixed, default: {} },
    lastRun: { type: Schema.Types.Mixed, default: null },
    state: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

EmprendimientoMetaSchema.index({ key: 1 }, { unique: true })

export const EmprendimientoMetaModel: Model<EmprendimientoMetaDoc> =
  (mongoose.models.EmprendimientoMeta as Model<EmprendimientoMetaDoc>) ||
  mongoose.model<EmprendimientoMetaDoc>(
    'EmprendimientoMeta',
    EmprendimientoMetaSchema,
    'emprendimientometas'
  )

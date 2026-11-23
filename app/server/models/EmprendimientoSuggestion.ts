import mongoose, { Schema, type Model } from 'mongoose'

// Una cuenta que un lector sugirió en /emprendimientos-de-instagram-uruguay
// (POST /api/emprendimientos/sugerir). El job la lee primero en su próxima corrida y marca
// `processedAt`. Sin IP ni nada de quien la sugirió. Espejo de classes/models/EmprendimientoSuggestion.ts.
interface EmprendimientoSuggestionDoc {
  handle: string
  note: string | null
  at: Date
  processedAt: Date | null
}

const EmprendimientoSuggestionSchema = new Schema<EmprendimientoSuggestionDoc>(
  {
    handle: { type: String, required: true },
    note: { type: String, default: null },
    at: { type: Date, required: true },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

EmprendimientoSuggestionSchema.index({ processedAt: 1, at: 1 })

export const EmprendimientoSuggestionModel: Model<EmprendimientoSuggestionDoc> =
  (mongoose.models.EmprendimientoSuggestion as Model<EmprendimientoSuggestionDoc>) ||
  mongoose.model<EmprendimientoSuggestionDoc>(
    'EmprendimientoSuggestion',
    EmprendimientoSuggestionSchema,
    'emprendimientosuggestions'
  )

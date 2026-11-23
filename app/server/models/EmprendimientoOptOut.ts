import mongoose, { Schema, type Model } from 'mongoose'

// Una cuenta que pidió no aparecer en /emprendimientos-de-instagram-uruguay
// (POST /api/emprendimientos/baja). La API la oculta en el momento y el job no la vuelve a leer.
// Espejo de classes/models/EmprendimientoOptOut.ts.
interface EmprendimientoOptOutDoc {
  handle: string
  at: Date
}

const EmprendimientoOptOutSchema = new Schema<EmprendimientoOptOutDoc>(
  {
    handle: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { timestamps: true }
)

EmprendimientoOptOutSchema.index({ handle: 1 }, { unique: true })

export const EmprendimientoOptOutModel: Model<EmprendimientoOptOutDoc> =
  (mongoose.models.EmprendimientoOptOut as Model<EmprendimientoOptOutDoc>) ||
  mongoose.model<EmprendimientoOptOutDoc>(
    'EmprendimientoOptOut',
    EmprendimientoOptOutSchema,
    'emprendimientooptouts'
  )

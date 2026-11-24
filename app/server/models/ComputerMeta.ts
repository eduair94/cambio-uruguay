import mongoose, { Schema, type Model } from 'mongoose'
import type { ComputerPublicMetaDoc } from '../../utils/computadorasPublic'

// La corrida de `/computadoras-usadas-uruguay`. Espejo de `classes/models/ComputerMeta.ts`.
//
// La colección puede guardar más de un documento distinguido por su `key` (la corrida publicada,
// y lo que el job quiera recordar de la cosecha): este app lee SÓLO `key: "uy-computadoras"`
// (`COMPUTER_META_ID`). Una lectura que no filtre por `key` mezclaría las formas.
//
// `key` y `generatedAt` viven arriba y todo lo demás adentro de `meta`, que es `Mixed`: la página lo
// tipa como `ComputerPublicMeta` y lo recorta en `computerCoverageOf` antes de servirlo.
const ComputerMetaSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

ComputerMetaSchema.index({ key: 1 }, { unique: true })

export const ComputerMetaModel: Model<ComputerPublicMetaDoc> =
  (mongoose.models.ComputerMeta as Model<ComputerPublicMetaDoc>) ||
  mongoose.model<ComputerPublicMetaDoc>('ComputerMeta', ComputerMetaSchema, 'computermetas')

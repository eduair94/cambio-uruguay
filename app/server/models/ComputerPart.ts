import mongoose, { Schema, type Model } from 'mongoose'
import type { ComputerPublicPart } from '../../utils/computadorasPublic'

// Una fila por IDENTIDAD de pieza (`cpu:i5-12400f`, `ram:ddr4:16`…) con su precio nuevo y usado
// de hoy en Uruguay. La escribe `sync_computadoras.ts`; la leen `/precios-componentes-pc-uruguay`
// y la ficha de cada aviso (el desglose pieza por pieza). Espejo de
// `classes/models/ComputerPart.ts`, cotejado por `tests/appdb/schema_parity.test.ts`.
//
// `strict: false` y sin crear nada, por lo mismo que `ComputerCatalog`: el app sólo lee.
const ComputerPartSchema = new Schema(
  {
    slug: { type: String, required: true },
  },
  { strict: false, autoCreate: false, autoIndex: false }
)

ComputerPartSchema.index({ slug: 1 }, { unique: true })

export const ComputerPartModel: Model<ComputerPublicPart> =
  (mongoose.models.ComputerPart as Model<ComputerPublicPart>) ||
  mongoose.model<ComputerPublicPart>('ComputerPart', ComputerPartSchema, 'computerparts')

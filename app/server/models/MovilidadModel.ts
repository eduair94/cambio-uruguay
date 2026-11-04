import mongoose, { Schema, type Model } from 'mongoose'
import type { MonopatinModelDoc } from '../../utils/monopatinModelos'

// Una fila por modelo de monopatín que escribe `sync_movilidad_specs.ts` (ver
// classes/models/MovilidadModel.ts y classes/movilidad/models/build.ts). La leen
// /monopatines-electricos-uruguay/<modelo>, el comparador y la tabla de modelos del hub; el app nunca
// la escribe. `tests/appdb/schema_parity.test.ts` mantiene los dos lados iguales.
const MovilidadModelSchema = new Schema<MonopatinModelDoc>(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    brandKey: { type: String, required: true },
    brandLabel: { type: String, required: true },
    modelLabel: { type: String, required: true },
    variant: { type: String, required: true },
    image: { type: String, default: null },
    offers: { type: [Schema.Types.Mixed], default: [] },
    newBand: { type: Schema.Types.Mixed, default: null },
    usedBand: { type: Schema.Types.Mixed, default: null },
    specs: { type: Schema.Types.Mixed, default: null },
    fichas: { type: Number, default: 0 },
    listings: { type: Number, default: 0 },
    sellers: { type: Number, default: 0 },
    indexable: { type: Boolean, default: false },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
    generatedAt: { type: String, required: true },
    history: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
)

MovilidadModelSchema.index({ slug: 1 }, { unique: true })
MovilidadModelSchema.index({ lastSeen: 1 })

export const MovilidadModelModel: Model<MonopatinModelDoc> =
  (mongoose.models.MovilidadModel as Model<MonopatinModelDoc>) ||
  mongoose.model<MonopatinModelDoc>('MovilidadModel', MovilidadModelSchema, 'movilidadmodels')

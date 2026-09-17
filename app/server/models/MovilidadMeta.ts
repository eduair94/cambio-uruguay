import mongoose, { Schema, type Model } from 'mongoose'

// Companion of MovilidadItem: one document describing the last monopatines/bicicletas eléctricas
// run. Mirrors app/server/models/EquiparMeta.ts minus `baskets` — this catalogue is not part of a
// room-filling basket (classes/equipar/basket.ts only ever iterates EQUIPAR_CATEGORIES, never an
// injected registry), so there is no total to publish alongside it.
//
// `uncovered` is the honest half of this document: a category that produced nothing this run says so
// instead of silently vanishing from the page.
interface MovilidadMetaDoc {
  key: string
  generatedAt: string
  usdUyu: number
  listings: number
  items: number
  runs: unknown[]
  uncovered: string[]
}

const MovilidadMetaSchema = new Schema<MovilidadMetaDoc>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    usdUyu: { type: Number, required: true },
    listings: { type: Number, default: 0 },
    items: { type: Number, default: 0 },
    runs: { type: [Schema.Types.Mixed], default: [] },
    uncovered: { type: [String], default: [] },
  },
  { timestamps: true }
)

MovilidadMetaSchema.index({ key: 1 }, { unique: true })

export const MovilidadMetaModel: Model<MovilidadMetaDoc> =
  (mongoose.models.MovilidadMeta as Model<MovilidadMetaDoc>) ||
  mongoose.model<MovilidadMetaDoc>('MovilidadMeta', MovilidadMetaSchema, 'movilidadmeta')

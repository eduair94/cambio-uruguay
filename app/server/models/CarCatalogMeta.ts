import mongoose, { Schema } from 'mongoose'
import type { PublicCarCatalogMeta } from '../../utils/carsPublic'

interface CarCatalogMetaDocument {
  key: 'uy-cars'
  generatedAt: string
  meta: PublicCarCatalogMeta
}

const CarCatalogMetaSchema = new Schema<CarCatalogMetaDocument>(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, required: true },
  },
  { autoCreate: false, autoIndex: false }
)

export const CarCatalogMetaModel =
  (mongoose.models.CarCatalogMeta as mongoose.Model<CarCatalogMetaDocument>) ||
  mongoose.model<CarCatalogMetaDocument>('CarCatalogMeta', CarCatalogMetaSchema, 'carcatalogmetas')

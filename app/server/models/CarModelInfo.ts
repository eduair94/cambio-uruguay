import mongoose, { Schema } from 'mongoose'

// Public: one row per model, written by `currency-autos-models` (classes/autos/modelInfo/).
// Every field is revalidated on read by utils/carModelInfo.ts#validCarModelInfo.
export const CarModelInfoModel =
  (mongoose.models.CarModelInfo as mongoose.Model<Record<string, unknown>>) ||
  mongoose.model<Record<string, unknown>>(
    'CarModelInfo',
    new Schema({ marketSlug: String }, { autoCreate: false, autoIndex: false, strict: false }),
    'carmodelinfos'
  )

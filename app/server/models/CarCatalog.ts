import mongoose, { Schema } from 'mongoose'
import type { PublicCarListing } from '../../utils/carsPublic'

// Only the deliberately public collection. `carlistings` (descriptions, seller ids) is never read here.
export const CarCatalogModel =
  (mongoose.models.CarCatalog as mongoose.Model<PublicCarListing>) ||
  mongoose.model<PublicCarListing>(
    'CarCatalog',
    new Schema({ key: String }, { autoCreate: false, autoIndex: false, strict: false }),
    'carcatalog'
  )

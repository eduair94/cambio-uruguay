import mongoose, { Schema } from 'mongoose'
import type { PropertySaleListing, PropertySalesMeta } from '../../utils/propertySales'

// Only these deliberately public collections are readable here. Private analysis inputs stay private.
const options = { autoCreate: false, autoIndex: false, strict: false }
export const PropertySaleCatalogModel =
  (mongoose.models.PropertySaleCatalog as mongoose.Model<PropertySaleListing>) ||
  mongoose.model<PropertySaleListing>(
    'PropertySaleCatalog',
    new Schema({ key: String }, options),
    'propertysalecatalog'
  )
export const PropertySaleCatalogMetaModel =
  (mongoose.models.PropertySaleCatalogMeta as mongoose.Model<PropertySalesMeta>) ||
  mongoose.model<PropertySalesMeta>(
    'PropertySaleCatalogMeta',
    new Schema({ key: String }, options),
    'propertysalecatalogmetas'
  )

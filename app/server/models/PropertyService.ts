import mongoose, { Schema } from 'mongoose'

// Root sync_property_services owns all writes, indexes and atomic snapshot switching.
const options = { autoCreate: false, autoIndex: false, strict: false }
export const PropertyServicePointModel =
  mongoose.models.PropertyServicePoint ||
  mongoose.model(
    'PropertyServicePoint',
    new Schema({ snapshotId: String }, options),
    'propertyservicepoints'
  )
export const PropertyServiceMetaModel =
  mongoose.models.PropertyServiceMeta ||
  mongoose.model(
    'PropertyServiceMeta',
    new Schema({ _id: String, snapshotId: String }, options),
    'propertyservicemetas'
  )

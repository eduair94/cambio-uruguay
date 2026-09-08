import mongoose, { Schema, type Model } from 'mongoose'

// Written by the separate backend job. This app only reads the market/context IDs.
// No TTL, automatic collection creation, timestamps or indexes are owned by the app.
const PropertyZoneSnapshotSchema = new Schema(
  {
    _id: { type: String, required: true },
    version: Number,
    generatedAt: String,
    rentalDataAsOf: String,
    sampleMinimum: Number,
    buckets: [Schema.Types.Mixed],
    geometry: Schema.Types.Mixed,
    crime: Schema.Types.Mixed,
    services: Schema.Types.Mixed,
  },
  { versionKey: false, timestamps: false, autoCreate: false, autoIndex: false }
)

export const PropertyZoneSnapshotModel: Model<Record<string, unknown>> =
  (mongoose.models.PropertyZoneSnapshot as Model<Record<string, unknown>>) ||
  mongoose.model<Record<string, unknown>>(
    'PropertyZoneSnapshot',
    PropertyZoneSnapshotSchema,
    'propertyzonesnapshots'
  )

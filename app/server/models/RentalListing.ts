import mongoose, { Schema, type Model } from 'mongoose'
import type { RentalProperty } from '../../utils/rentals'

// Written by the root backend job `sync_rentals.ts` (see classes/models/RentalListing.ts).
// Keep the two schemas in step — tests/appdb/schema_parity.test.ts enforces it.
const RentalListingSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    propertyType: { type: String, default: 'otro' },
    department: { type: String, default: '' },
    neighborhood: { type: String, default: '' },
    address: { type: String, default: '' },
    addressKey: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    bedrooms: { type: Number, default: null },
    bathrooms: { type: Number, default: null },
    area: { type: Number, default: null },
    priceUyu: { type: Number, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: 'UYU' },
    offers: { type: [Schema.Types.Mixed], default: [] },
    sources: { type: [String], default: [] },
    freshAt: { type: String, default: '' },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
)

RentalListingSchema.index({ key: 1 }, { unique: true })
RentalListingSchema.index({ freshAt: -1, key: 1 })
RentalListingSchema.index({ lastSeen: -1, priceUyu: 1 })
RentalListingSchema.index({ department: 1, neighborhood: 1, priceUyu: 1 })
RentalListingSchema.index({ department: 1, propertyType: 1, bedrooms: 1, priceUyu: 1 })

export const RentalListingModel: Model<RentalProperty> =
  (mongoose.models.RentalListing as Model<RentalProperty>) ||
  mongoose.model<RentalProperty>('RentalListing', RentalListingSchema, 'rentallistings')

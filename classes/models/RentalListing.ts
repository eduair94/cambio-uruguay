import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { RentalProperty } from "../rentals/types";

// One document per PROPERTY (not per advert), in the APP database — /alquileres-uruguay reads it
// directly. One doc per row rather than a single snapshot blob because the directory is tens of
// thousands of rows: the page filters, sorts and paginates in Mongo, and a 30 MB blob would have to
// be loaded whole to answer "2 dormitorios en Pocitos hasta $30.000".
//
// Keep in step with app/server/models/RentalListing.ts — tests/appdb/schema_parity.test.ts fails
// the build if the two drift.
const RentalListingSchema = new Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    propertyType: { type: String, default: "otro" },
    department: { type: String, default: "" },
    neighborhood: { type: String, default: "" },
    address: { type: String, default: "" },
    addressKey: { type: String, default: "" },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    bedrooms: { type: Number, default: null },
    bathrooms: { type: Number, default: null },
    area: { type: Number, default: null },
    priceUyu: { type: Number, required: true },
    price: { type: Number, required: true },
    currency: { type: String, default: "UYU" },
    offers: { type: [Schema.Types.Mixed], default: [] },
    sources: { type: [String], default: [] },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
);

RentalListingSchema.index({ key: 1 }, { unique: true });
// The list's default view: fresh rows, cheapest first, filtered by where and what.
RentalListingSchema.index({ lastSeen: -1, priceUyu: 1 });
RentalListingSchema.index({ department: 1, neighborhood: 1, priceUyu: 1 });
RentalListingSchema.index({ department: 1, propertyType: 1, bedrooms: 1, priceUyu: 1 });

export const RentalListingModel = appModel<RentalProperty>("RentalListing", RentalListingSchema, "rentallistings");

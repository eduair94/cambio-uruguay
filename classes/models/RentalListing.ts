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
    /**
     * Se declara ACA o no llega a Mongo.
     *
     * El esquema es `strict` por defecto y `store.ts` escribe con `bulkWrite`, que pasa por
     * `castUpdate`: un campo no declarado se saca del `$set` EN SILENCIO. Y falla asimetrico,
     * que es lo peor: `offers` es `[Schema.Types.Mixed]`, asi que `offers[].petsAllowed` si
     * persistiria y el de la propiedad no. Compilaria limpio, los tests pasarian y el filtro no
     * devolveria nada.
     *
     * `null` = el aviso no lo dice. NUNCA `false`: ningun portal publica la negativa.
     */
    petsAllowed: { type: Boolean, default: null },
    offers: { type: [Schema.Types.Mixed], default: [] },
    sources: { type: [String], default: [] },
    freshAt: { type: String, default: "" },
    firstSeen: { type: String, required: true },
    lastSeen: { type: String, required: true },
  },
  { timestamps: true }
);

RentalListingSchema.index({ key: 1 }, { unique: true });
// The list's default view is "más recientes": newest advert first, `key` as the tiebreak so a day
// with a thousand adverts is not silently ordered by price (which put every garage on page one).
RentalListingSchema.index({ freshAt: -1, key: 1 });
RentalListingSchema.index({ lastSeen: -1, priceUyu: 1 });
RentalListingSchema.index({ department: 1, neighborhood: 1, priceUyu: 1 });
RentalListingSchema.index({ department: 1, propertyType: 1, bedrooms: 1, priceUyu: 1 });

export const RentalListingModel = appModel<RentalProperty>("RentalListing", RentalListingSchema, "rentallistings");

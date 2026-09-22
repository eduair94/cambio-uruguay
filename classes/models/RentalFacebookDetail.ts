import { Schema } from "mongoose";
import { appModel } from "../appdb";

// Private: what the item page of a Facebook Marketplace rental advert said, read once per advert
// by currency-rentals-detail. No seller name or contact is ever stored: the description is
// sanitized before it gets here. `rentallistings` takes from this only the fields it lacked.
export interface RentalFacebookDetailDocument {
  /** `facebook:<id>`, the offer's listingId. */
  listingId: string;
  id: string;
  readAt: string;
  /** False when the page carried no listing node; kept so the advert is not re-read every hour. */
  found: boolean;
  title: string | null;
  description: string;
  pinCity: string | null;
  pinPostal: string | null;
  pinLat: number | null;
  pinLng: number | null;
  isLive: boolean;
  /** Derived at read time from title, description and the card's department. */
  neighborhood: string;
  department: string;
  /** A geocoded corner or numbered address that passed the acceptance rule; else null. */
  latitude: number | null;
  longitude: number | null;
  candidates: string[];
  geocodeQuery: string | null;
  geocodeAddress: string | null;
  geocodeTried: number;
  /** Why a point was dropped ("contradice el barrio nombrado"), for the audit trail. */
  note: string | null;
}

const RentalFacebookDetailSchema = new Schema({
  listingId: { type: String, required: true },
  id: { type: String, required: true },
  readAt: { type: String, required: true },
  found: { type: Boolean, required: true },
  title: { type: String, default: null },
  description: { type: String, default: "" },
  pinCity: { type: String, default: null },
  pinPostal: { type: String, default: null },
  pinLat: { type: Number, default: null },
  pinLng: { type: Number, default: null },
  isLive: { type: Boolean, default: true },
  neighborhood: { type: String, default: "" },
  department: { type: String, default: "" },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  candidates: { type: [String], default: [] },
  geocodeQuery: { type: String, default: null },
  geocodeAddress: { type: String, default: null },
  geocodeTried: { type: Number, default: 0 },
  note: { type: String, default: null },
}, { autoCreate: false, autoIndex: false });
RentalFacebookDetailSchema.index({ listingId: 1 }, { unique: true });
RentalFacebookDetailSchema.index({ readAt: 1 });

export const RentalFacebookDetailModel = appModel<RentalFacebookDetailDocument>("RentalFacebookDetail", RentalFacebookDetailSchema, "rentalfacebookdetails");

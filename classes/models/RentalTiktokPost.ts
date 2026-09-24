import { Schema } from "mongoose";
import { appModel } from "../appdb";

// Private: every TikTok video the rental harvest read, accepted or not, with the reason. It is the
// audit trail of the caption parser ("why was this one rejected?") and the memory that keeps a
// corner from being geocoded twice. The caption is stored as read; `rentallistings` gets only the
// sanitised excerpt.
export interface RentalTiktokPostDocument {
  /** `tiktok:<id>`, the offer's listingId. */
  listingId: string;
  id: string;
  uniqueId: string;
  createTime: number;
  readAt: string;
  text: string;
  hashtags: string[];
  /** Why the parser refused it; null for a published advert. */
  rejected: string | null;
  price: number | null;
  currency: string | null;
  department: string;
  neighborhood: string;
  candidates: string[];
  geocodeQuery: string | null;
  geocodeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  /** The INE barrio of the accepted point, when the caption named none. */
  geoNeighborhood: string | null;
  note: string | null;
}

/**
 * One schema for every social network's post memory (TikTok here; Instagram and Facebook Reels in
 * RentalSocial.ts). `url`, `authorName` and `image` are what a network that is not re-read every
 * run (Instagram) needs to rebuild a post from memory.
 */
export const socialPostSchema = (): Schema => {
  const schema = new Schema({
    listingId: { type: String, required: true },
    id: { type: String, required: true },
    uniqueId: { type: String, required: true },
    createTime: { type: Number, required: true },
    readAt: { type: String, required: true },
    text: { type: String, default: "" },
    hashtags: { type: [String], default: [] },
    rejected: { type: String, default: null },
    price: { type: Number, default: null },
    currency: { type: String, default: null },
    department: { type: String, default: "" },
    neighborhood: { type: String, default: "" },
    candidates: { type: [String], default: [] },
    geocodeQuery: { type: String, default: null },
    geocodeAddress: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    geoNeighborhood: { type: String, default: null },
    note: { type: String, default: null },
    url: { type: String, default: null },
    authorName: { type: String, default: null },
    image: { type: String, default: null },
    fetchedAt: { type: String, default: null },
  }, { autoCreate: false, autoIndex: false });
  schema.index({ listingId: 1 }, { unique: true });
  schema.index({ uniqueId: 1 });
  schema.index({ readAt: 1 });
  return schema;
};

const RentalTiktokPostSchema = socialPostSchema();

export const RentalTiktokPostModel = appModel<RentalTiktokPostDocument>("RentalTiktokPost", RentalTiktokPostSchema, "rentaltiktokposts");

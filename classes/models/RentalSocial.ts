import { Schema } from "mongoose";
import { appModel } from "../appdb";
import { socialPostSchema, type RentalTiktokPostDocument } from "./RentalTiktokPost";

// Private collections of the short-video rental sources beyond TikTok (RentalTiktok*.ts):
//   * rentalinstagramposts / rentalfacebookreelsposts — what every post said, the same shape as
//     TikTok's, plus what rebuilding an Instagram post from memory needs (url, authorName, image);
//   * rentalinstagramaccounts — which accounts are read, and what was learned about each one;
//   * rentalsocialclaims — the copy guard's memory: which listing published a flat first.
// No contact, bio or follower count is ever stored.

export const RentalInstagramPostModel = appModel<RentalTiktokPostDocument>("RentalInstagramPost", socialPostSchema(), "rentalinstagramposts");
export const RentalFacebookReelPostModel = appModel<RentalTiktokPostDocument>("RentalFacebookReelPost", socialPostSchema(), "rentalfacebookreelsposts");

export interface RentalInstagramAccountDocument {
  handle: string;
  name: string;
  /** semilla (configured), activa (published an accepted advert), candidata (a TikTok handle not yet checked), no existe, descartada. */
  status: "semilla" | "activa" | "candidata" | "no existe" | "descartada";
  firstSeen: string;
  /** Last time the profile answered, either way. `no existe`/`descartada` are re-checked 30 days after it. */
  checkedAt: string | null;
  lastReadAt: string | null;
  lastPostAt: string | null;
  /** Adverts accepted from this account in the last run. */
  published: number;
  /** Posts of this account the parser has judged, ever. */
  evaluated: number;
  reads: number;
  note: string | null;
}

const RentalInstagramAccountSchema = new Schema({
  handle: { type: String, required: true },
  name: { type: String, default: "" },
  status: { type: String, required: true },
  firstSeen: { type: String, required: true },
  checkedAt: { type: String, default: null },
  lastReadAt: { type: String, default: null },
  lastPostAt: { type: String, default: null },
  published: { type: Number, default: 0 },
  evaluated: { type: Number, default: 0 },
  reads: { type: Number, default: 0 },
  note: { type: String, default: null },
}, { autoCreate: false, autoIndex: false });
RentalInstagramAccountSchema.index({ handle: 1 }, { unique: true });
export const RentalInstagramAccountModel = appModel<RentalInstagramAccountDocument>("RentalInstagramAccount", RentalInstagramAccountSchema, "rentalinstagramaccounts");

export interface RentalSocialClaimDocument {
  key: string;
  listingId: string;
  source: string;
  firstPublishedAt: string;
  lastSeenAt: string;
}

const RentalSocialClaimSchema = new Schema({
  key: { type: String, required: true },
  listingId: { type: String, required: true },
  source: { type: String, required: true },
  firstPublishedAt: { type: String, required: true },
  lastSeenAt: { type: String, required: true },
}, { autoCreate: false, autoIndex: false });
RentalSocialClaimSchema.index({ key: 1 }, { unique: true });
RentalSocialClaimSchema.index({ lastSeenAt: 1 });
export const RentalSocialClaimModel = appModel<RentalSocialClaimDocument>("RentalSocialClaim", RentalSocialClaimSchema, "rentalsocialclaims");

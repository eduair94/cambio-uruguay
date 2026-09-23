import { Schema } from "mongoose";
import { appModel } from "../appdb";

// Private: the TikTok accounts the rental harvest reads, and when. An account enters the registry
// by seed (`RENTALS_TIKTOK_ACCOUNTS`) or by publishing a rental advert the parser accepted; it is
// re-read oldest-first within the run's budget. Only the public handle and display name are kept.
export interface RentalTiktokAccountDocument {
  uniqueId: string;
  secUid: string;
  nickname: string;
  firstSeen: string;
  lastReadAt: string | null;
  /** ISO time of the newest post seen in the last read. */
  lastPostAt: string | null;
  /** Adverts published from this account in the last run. */
  published: number;
  reads: number;
  note: string | null;
}

const RentalTiktokAccountSchema = new Schema({
  uniqueId: { type: String, required: true },
  secUid: { type: String, default: "" },
  nickname: { type: String, default: "" },
  firstSeen: { type: String, required: true },
  lastReadAt: { type: String, default: null },
  lastPostAt: { type: String, default: null },
  published: { type: Number, default: 0 },
  reads: { type: Number, default: 0 },
  note: { type: String, default: null },
}, { autoCreate: false, autoIndex: false });
RentalTiktokAccountSchema.index({ uniqueId: 1 }, { unique: true });

export const RentalTiktokAccountModel = appModel<RentalTiktokAccountDocument>("RentalTiktokAccount", RentalTiktokAccountSchema, "rentaltiktokaccounts");

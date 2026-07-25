import { Schema } from "mongoose";
import { appModel } from "../appdb";

// One row per product photo we asked a model to read, accepted or not.
//
// It is a cache first — the same MercadoLibre photo must not be paid for again tomorrow — and an
// audit trail second: every chair identified from an image can be traced back to the photo, the
// raw guess and the confidence that produced it.
const ChairVisionGuessSchema = new Schema(
  {
    imageKey: { type: String, required: true },
    // Hash of the image BYTES. Facebook re-signs its CDN URLs on every scrape (`oh`, `oe`,
    // `_nc_ohc` all rotate), so the URL is a different string every night for the same photo and a
    // URL-keyed cache would pay for that photo again every run. The bytes do not move, and this
    // also collapses the one manufacturer photo that four storefronts each republish.
    contentHash: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    listingId: { type: String, default: "" },
    title: { type: String, default: "" },
    brand: { type: String, default: "" },
    model: { type: String, default: "" },
    kind: { type: String, default: "" },
    confidence: { type: Number, default: 0 },
    raw: { type: String, default: "" },
    accepted: { type: Boolean, default: false },
    guessedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ChairVisionGuessSchema.index({ imageKey: 1 }, { unique: true });
// Not unique: the same photo legitimately appears under several URLs and listings, and each of
// those gets its own row so the next run can short-circuit before downloading anything.
ChairVisionGuessSchema.index({ contentHash: 1 });
ChairVisionGuessSchema.index({ listingId: 1 });

export const ChairVisionGuessModel = appModel<{
  imageKey: string;
  contentHash: string;
  imageUrl: string;
  listingId: string;
  title: string;
  brand: string;
  model: string;
  kind: string;
  confidence: number;
  raw: string;
  accepted: boolean;
  guessedAt: Date | null;
}>("ChairVisionGuess", ChairVisionGuessSchema, "chairvisionguesses");

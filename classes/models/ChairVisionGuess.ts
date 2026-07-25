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
    imageUrl: { type: String, default: "" },
    listingId: { type: String, default: "" },
    title: { type: String, default: "" },
    brand: { type: String, default: "" },
    model: { type: String, default: "" },
    kind: { type: String, default: "" },
    confidence: { type: Number, default: 0 },
    accepted: { type: Boolean, default: false },
    guessedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ChairVisionGuessSchema.index({ imageKey: 1 }, { unique: true });

export const ChairVisionGuessModel = appModel<{
  imageKey: string;
  imageUrl: string;
  listingId: string;
  title: string;
  brand: string;
  model: string;
  kind: string;
  confidence: number;
  accepted: boolean;
  guessedAt: Date | null;
}>("ChairVisionGuess", ChairVisionGuessSchema, "chairvisionguesses");

// Mirror of app/server/models/PricePrediction.ts, bound to the APP's Mongo (classes/appdb.ts) —
// NOT the backend's. Field-for-field transcription guarded by tests/appdb/schema_parity.test.ts:
// a field this schema forgets is a field silently dropped from every row written from today on.
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface PricePredictionDoc {
  currency: string;
  date: string; // 'YYYY-MM-DD'
  ai: {
    lean: "up" | "down" | "flat";
    confidence: "low" | "medium" | "high";
    reasoning: string;
    basedOn: { period: "7d" | "30d" | "90d"; pctChange: number }[];
  } | null;
  externalForecasts: {
    source: string;
    link: string;
    direction: "up" | "down" | "flat" | null;
    summary: string;
  }[];
}

// No <PricePredictionDoc> generic on the Schema constructor itself: mongoose's typed-schema
// checker rejects the nested `{ type: {...}, default: null }` + `_id: false` shape for a
// sub-document field (a real TS error under this repo's stricter tsconfig, though not one the
// app's own vue-tsc build — separately broken, see memory/typecheck-broken.md — ever surfaces).
// The doc shape is still fully typed where it matters: appModel<PricePredictionDoc>() below.
const PricePredictionSchema = new Schema(
  {
    currency: { type: String, required: true },
    date: { type: String, required: true },
    ai: {
      type: {
        _id: false,
        lean: { type: String, enum: ["up", "down", "flat"] },
        confidence: { type: String, enum: ["low", "medium", "high"] },
        reasoning: String,
        basedOn: {
          type: [{ _id: false, period: String, pctChange: Number }],
          default: [],
        },
      },
      default: null,
    },
    externalForecasts: {
      type: [
        {
          _id: false,
          source: String,
          link: String,
          direction: { type: String, enum: ["up", "down", "flat", null], default: null },
          summary: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

PricePredictionSchema.index({ currency: 1, date: 1 }, { unique: true });

export const PricePredictionModel = appModel<PricePredictionDoc>(
  "PricePrediction",
  PricePredictionSchema,
  "pricepredictions"
);

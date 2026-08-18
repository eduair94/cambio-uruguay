// Mirror of app/server/models/TrendsSnapshot.ts, bound to the APP's Mongo (classes/appdb.ts) — NOT
// the backend's. `sync_trends.ts` upserts the single `key:"uy"` document; /api/trends serves it to
// /tendencias-uruguay.
//
// The arrays are Mixed on purpose: this is a cache of three public feeds, every field of which can
// be re-fetched, so there is nothing here worth pinning field by field the way the prediction
// ledger is (that one cannot be recomputed; this one can, any minute).
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { TrendsSnapshot } from "../trends/types";

const TrendsSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    capturedAt: { type: Date, required: true },
    searches: { type: [Schema.Types.Mixed], default: [] },
    reddit: { type: [Schema.Types.Mixed], default: [] },
    news: { type: [Schema.Types.Mixed], default: [] },
    sources: { type: Schema.Types.Mixed, default: {} },
    counts: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const TrendsSnapshotModel = appModel<TrendsSnapshot>(
  "TrendsSnapshot",
  TrendsSnapshotSchema,
  "trendssnapshots"
);

import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { ChairTierSnapshot } from "../chairs/types";

const ChairTierSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    asOf: { type: String, required: true },
    subreddit: { type: String, required: true },
    queries: { type: [String], default: [] },
    classifierModel: { type: String, default: "" },
    methodologyVersion: { type: Number, default: 2 },
    corpus: { type: Schema.Types.Mixed, required: true },
    tiers: { type: [Schema.Types.Mixed], default: [] },
    watchlist: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

ChairTierSnapshotSchema.index({ key: 1 }, { unique: true });

export const ChairTierSnapshotModel = appModel<ChairTierSnapshot>(
  "ChairTierSnapshot",
  ChairTierSnapshotSchema,
  "chairtiersnapshots"
);

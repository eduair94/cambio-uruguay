import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { RetailListing } from "../retail/types";

// Backend-only. The daily household harvest's store listings, in ONE document, so the hourly run —
// which skips the Fenicio stores and searches fewer terms — can publish from the full store market
// instead of rebuilding every item from a thinner one. The app never reads it; see
// classes/equipar/storeSnapshot.ts for the merge rules.
const EquiparStoreSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    listings: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

EquiparStoreSnapshotSchema.index({ key: 1 }, { unique: true });

export const EquiparStoreSnapshotModel = appModel<{ key: string; generatedAt: string; listings: RetailListing[] }>(
  "EquiparStoreSnapshot",
  EquiparStoreSnapshotSchema,
  "equiparstoresnapshots"
);

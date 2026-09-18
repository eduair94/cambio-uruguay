import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { RetailListing } from "../retail/types";

// Backend-only. The daily celulares harvest's store listings, in ONE document, so the hourly run —
// which skips the Fenicio stores and searches fewer ML terms — can publish from the full store
// market instead of rebuilding every model from a thinner one. The app never reads it; see
// classes/phones/storeSnapshot.ts for the merge rules. No app mirror and no schema_parity entry, same
// as classes/models/EquiparStoreSnapshot.ts.
const PhoneStoreSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    listings: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

PhoneStoreSnapshotSchema.index({ key: 1 }, { unique: true });

export const PhoneStoreSnapshotModel = appModel<{ key: string; generatedAt: string; listings: RetailListing[] }>(
  "PhoneStoreSnapshot",
  PhoneStoreSnapshotSchema,
  "phonestoresnapshots"
);

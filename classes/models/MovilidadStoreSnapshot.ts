import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { RetailListing } from "../retail/types";

// Backend-only, mirrors classes/models/EquiparStoreSnapshot.ts. The daily monopatines/bicicletas
// harvest's store listings, in ONE document, so the hourly `--fast` run — which runs on a smaller
// `maxStoreQueries` budget (see sync_movilidad.ts) — can publish from the fuller store market the
// daily run just read instead of rebuilding every item from a thinner one. The app never reads it;
// see classes/equipar/storeSnapshot.ts (reused as-is; only the key and the model differ here) for the
// merge rules.
const MovilidadStoreSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    generatedAt: { type: String, required: true },
    listings: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

MovilidadStoreSnapshotSchema.index({ key: 1 }, { unique: true });

export const MovilidadStoreSnapshotModel = appModel<{ key: string; generatedAt: string; listings: RetailListing[] }>(
  "MovilidadStoreSnapshot",
  MovilidadStoreSnapshotSchema,
  "movilidadstoresnapshots"
);

// Mirror of app/server/models/BankosSnapshot.ts, bound to the APP's Mongo (classes/appdb.ts) — NOT
// the backend's. `sync_bankos.ts` upserts the single `key:"latest"` doc; the app reads it as the
// outage fallback for /api/bankos/discounts. `data` is the raw markers-and-brands payload (Mixed):
// it is a cache, not an archive, so it is not field-pinned the way the prediction ledger is.
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface BankosSnapshotDoc {
  key: string; // always "latest" — one row, upserted
  generatedAt: Date;
  banks: string[];
  counts: { brands: number; locations: number; banksWithDiscounts: number };
  data: unknown; // { brands, locations, bankBrands, brandLocations }
}

const BankosSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    generatedAt: { type: Date, required: true },
    banks: { type: [String], default: [] },
    counts: { type: Schema.Types.Mixed, default: {} },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const BankosSnapshotModel = appModel<BankosSnapshotDoc>(
  "BankosSnapshot",
  BankosSnapshotSchema,
  "bankossnapshots"
);

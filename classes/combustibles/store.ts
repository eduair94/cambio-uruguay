// classes/combustibles/store.ts
import { Schema } from "mongoose";
import { MongooseServer } from "../database";
import type { FuelRow } from "./parse";

const rowSchema = new Schema(
  {
    from: { type: String, required: true },
    super95: { type: Number, default: null },
    premium97: { type: Number, default: null },
    gasoil50s: { type: Number, default: null },
    gasoil10s: { type: Number, default: null },
    queroseno: { type: Number, default: null },
    supergas: { type: Number, default: null },
    source: { type: String, required: true },
  },
  { strict: true }
);
rowSchema.index({ from: 1 }, { unique: true });

const META_KEY = "combustibles";
const metaSchema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });

const rowsDb = () => MongooseServer.getInstance("combustibles_history", rowSchema);
const metaDb = () => MongooseServer.getInstance("combustibles_meta", metaSchema);

export interface FuelMeta {
  asOf: string;
  rows: number;
  latestFrom: string;
  sourceUrl: string;
}

export async function saveFuelRows(rows: FuelRow[], source: string): Promise<number> {
  if (!rows.length) return 0;
  await rowsDb().bulkUpsert(rows.map((row) => ({ filter: { from: row.from }, update: { ...row, source } })));
  return rows.length;
}

/** Ascendente, para que el gráfico se dibuje sin invertir. */
export async function loadFuelRows(limit = 1000): Promise<FuelRow[]> {
  const rows = await rowsDb().aggregate([
    { $sort: { from: -1 } },
    { $limit: Math.min(Math.max(limit, 1), 5000) },
    { $project: { _id: 0, source: 0, __v: 0 } },
    { $sort: { from: 1 } },
  ]);
  return rows as FuelRow[];
}

export async function loadFuelMeta(): Promise<FuelMeta | null> {
  const rows = await metaDb().aggregate([{ $match: { key: META_KEY } }, { $limit: 1 }]);
  return (rows[0]?.doc as FuelMeta | undefined) ?? null;
}

export async function saveFuelMeta(doc: FuelMeta): Promise<void> {
  await metaDb().updateOne({ key: META_KEY }, { key: META_KEY, doc });
}

// One Mongo document (`costs_data`), mirroring classes/aduana/store.ts's single-document shape.
// Small, always read whole, always written whole by the daily job.
import { MongooseServer, Schema } from "../database";
import type { LiveCosts } from "./refresh";

const KEY = "costs_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("costs_data", schema);

export async function loadCosts(): Promise<LiveCosts | null> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  return (rows[0]?.doc as LiveCosts | undefined) ?? null;
}

export async function saveCosts(doc: LiveCosts): Promise<void> {
  // `updateOne` upserts (findOneAndUpdate-style options) and strips the filter's keys from the
  // update object before sending it — Mongoose then implicitly wraps the remaining fields in
  // `$set` (see classes/database.ts). `updateOneRaw` does not exist — do not call it.
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}

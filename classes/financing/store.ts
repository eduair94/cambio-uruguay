// One Mongo document (`financing_data`), mirroring classes/costs/store.ts's single-document shape.
// Small, always read whole, always written whole by the weekly job.
import { MongooseServer, Schema } from "../database";
import type { LiveFinancing } from "./refresh";

const KEY = "financing_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("financing_data", schema);

export async function loadFinancing(): Promise<LiveFinancing | null> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  return (rows[0]?.doc as LiveFinancing | undefined) ?? null;
}

export async function saveFinancing(doc: LiveFinancing): Promise<void> {
  // updateOne upserts and implicitly wraps the non-filter fields in $set (see classes/database.ts).
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}

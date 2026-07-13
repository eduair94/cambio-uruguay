// One Mongo document (`uy_figures_data`), mirroring classes/aduana/store.ts's single-document
// shape. Small, always read whole, always written whole by the daily job.
import { MongooseServer, Schema } from "../database";
import type { UyFigures } from "./bands";

const KEY = "uy_figures_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("uy_figures_data", schema);

export async function loadFigures(): Promise<UyFigures | null> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  return (rows[0]?.doc as UyFigures | undefined) ?? null;
}

export async function saveFigures(doc: UyFigures): Promise<void> {
  // `updateOne` upserts (findOneAndUpdate-style options) and strips the filter's keys from the
  // update object before sending it — Mongoose then implicitly wraps the remaining fields in
  // `$set` (see classes/database.ts). `updateOneRaw` does not exist — do not call it.
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}

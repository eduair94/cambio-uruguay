// One Mongo document (`debt_relief_data`), mirroring classes/aduana/store.ts's single-document
// shape. Small, always read whole, always written whole by the monthly job.
import { MongooseServer, Schema } from "../database";
import type { LiveDebtRelief } from "./refresh";

const KEY = "debt_relief_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("debt_relief_data", schema);

export async function loadDebtRelief(): Promise<LiveDebtRelief | null> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  return (rows[0]?.doc as LiveDebtRelief | undefined) ?? null;
}

export async function saveDebtRelief(doc: LiveDebtRelief): Promise<void> {
  // `updateOne` upserts (findOneAndUpdate-style options) and strips the filter's keys from the
  // update object before sending it — Mongoose then implicitly wraps the remaining fields in
  // `$set` (see classes/database.ts). `updateOneRaw` does not exist — do not call it.
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}

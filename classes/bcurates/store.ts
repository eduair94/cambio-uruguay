// One Mongo document (`bcu_rates_data`), mirroring classes/debt/store.ts's single-document shape.
// Small, always read whole, always written whole by the daily job.
import { MongooseServer, Schema } from "../database";
import type { BcuRateTable } from "./table";

const KEY = "bcu_rates_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("bcu_rates_data", schema);

export async function loadBcuRates(): Promise<BcuRateTable | null> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  return (rows[0]?.doc as BcuRateTable | undefined) ?? null;
}

export async function saveBcuRates(doc: BcuRateTable): Promise<void> {
  // `updateOne` upserts and implicitly wraps the remaining fields in `$set` (see
  // classes/database.ts). `updateOneRaw` does not exist — do not call it.
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}

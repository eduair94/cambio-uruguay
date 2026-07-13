// One Mongo document (`aduana_data`) holding the whole public payload. Small, always read whole,
// always written whole by the weekly job — the same single-document shape used elsewhere in
// classes/ (e.g. classes/bcu_details.ts, keyed by a single filter field instead of many rows).
import { MongooseServer, Schema } from "../database";
import { BASELINE } from "./baseline";
import type { AduanaDoc } from "./types";

const KEY = "aduana_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("aduana_data", schema);

/** What every reader falls back to before the first sync has run: the verified baseline. */
export function emptyAduanaDoc(): AduanaDoc {
  return JSON.parse(JSON.stringify(BASELINE)) as AduanaDoc;
}

export async function loadAduanaDoc(): Promise<AduanaDoc> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  const doc = rows[0]?.doc as Partial<AduanaDoc> | undefined;
  return { ...emptyAduanaDoc(), ...(doc ?? {}) };
}

export async function saveAduanaDoc(doc: AduanaDoc): Promise<void> {
  // `updateOne` upserts (findOneAndUpdate-style options) and strips the filter's keys from the
  // update object before sending it — Mongoose then implicitly wraps the remaining fields in
  // `$set` (see classes/database.ts). On upsert, Mongo copies the equality filter's `key` field
  // into the newly created document, so the saved doc still ends up `{ key: KEY, doc }`.
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}

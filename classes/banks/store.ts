// One Mongo document PER LANGUAGE (`banks_news_data`), mirroring classes/aduana/store.ts's
// single-document shape. Small, always read whole, always written whole by the daily job.
import { MongooseServer, Schema } from "../database";
import type { BanksBriefing, Lang } from "./news";

const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("banks_news_data", schema);

const KEY = (lang: Lang) => `banks_news:${lang}`;

export async function loadBriefing(lang: Lang): Promise<BanksBriefing | null> {
  const rows = await server().aggregate([{ $match: { key: KEY(lang) } }, { $limit: 1 }]);
  return (rows[0]?.doc as BanksBriefing | undefined) ?? null;
}

export async function saveBriefing(lang: Lang, doc: BanksBriefing): Promise<void> {
  // `updateOne` upserts (findOneAndUpdate-style options) and strips the filter's keys from the
  // update object before sending it — Mongoose then implicitly wraps the remaining fields in
  // `$set` (see classes/database.ts). `updateOneRaw` does not exist — do not call it.
  await server().updateOne({ key: KEY(lang) }, { key: KEY(lang), doc });
}

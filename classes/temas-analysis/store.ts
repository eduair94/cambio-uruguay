// One Mongo document (`temas_analysis_data`), mirroring classes/costs/store.ts's single-document
// shape. Small, always read whole, always written whole by the quarterly job.
import { MongooseServer, Schema } from "../database";
import type { TemasAnalysis } from "./refresh";

const KEY = "temas_analysis_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("temas_analysis_data", schema);

export async function loadTemasAnalysis(): Promise<TemasAnalysis | null> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  return (rows[0]?.doc as TemasAnalysis | undefined) ?? null;
}

export async function saveTemasAnalysis(doc: TemasAnalysis): Promise<void> {
  // `updateOne` upserts and wraps the remaining fields in `$set` (see classes/costs/store.ts).
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}

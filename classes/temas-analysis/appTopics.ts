// Reads the current Reddit money-topic ranking from the NUXT APP's database (collection
// `reddittopics`, written daily by the app's reddit:sentiment task) via the cross-DB bridge in
// classes/appdb.ts. The backend never writes this collection — it only reads the latest snapshot to
// feed the quarterly Gemini analysis. Refuses to resolve a connection without APP_MONGO_URI
// (appConnection() throws); callers gate on appDbConfigured() first.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { AnalysisTopicInput } from "./refresh";

interface AppTopicDoc {
  topicId: string;
  label: string;
  total: number;
  recent: number;
  sample: Array<{ title: string }>;
}

// A minimal read-only schema matching app/server/models/RedditTopics.ts. The collection name is
// pinned to `reddittopics` (Mongoose's default pluralization of the app's `RedditTopic` model),
// so the model NAME here is irrelevant to which collection is read.
const schema = new Schema<AppTopicDoc>(
  {
    topicId: String,
    label: String,
    total: Number,
    recent: Number,
    sample: [new Schema({ title: String }, { _id: false, strict: false })],
  },
  { strict: false }
);

const AppRedditTopic = appModel<AppTopicDoc>("AppRedditTopic", schema, "reddittopics");

/** The published topics with data, ranked by recent momentum then total volume. */
export async function readAppTopics(): Promise<AnalysisTopicInput[]> {
  const docs = (await AppRedditTopic.find({}).lean()) as unknown as AppTopicDoc[];
  return docs
    .filter((d) => (d.total ?? 0) > 0)
    .sort((a, b) => (b.recent ?? 0) - (a.recent ?? 0) || (b.total ?? 0) - (a.total ?? 0))
    .map((d) => ({
      id: d.topicId,
      label: d.label ?? d.topicId,
      total: d.total ?? 0,
      recent: d.recent ?? 0,
      samples: (d.sample ?? []).map((s) => s?.title ?? "").filter(Boolean),
    }));
}

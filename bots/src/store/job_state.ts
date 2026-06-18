// Daily-run dedup so a re-triggered cron doesn't double-post. No-op without Mongo
// (then dedup relies on the scheduler firing once).
import mongoose, { Schema } from "mongoose";
import { isMongoReady } from "./mongo.js";

interface JobRunDoc {
  key: string; // `${job}:${date}`
  at: Date;
}

const jobRunSchema = new Schema<JobRunDoc>({
  key: { type: String, required: true, unique: true },
  at: { type: Date, default: () => new Date() },
});

const JobRunModel = mongoose.models.BotJobRun || mongoose.model<JobRunDoc>("BotJobRun", jobRunSchema);

const today = () => new Date().toISOString().slice(0, 10);

export async function wasRunToday(job: string): Promise<boolean> {
  if (!isMongoReady()) return false;
  const doc = await JobRunModel.findOne({ key: `${job}:${today()}` }).lean();
  return Boolean(doc);
}

export async function markRanToday(job: string): Promise<void> {
  if (!isMongoReady()) return;
  await JobRunModel.updateOne({ key: `${job}:${today()}` }, { $set: { at: new Date() } }, { upsert: true });
}

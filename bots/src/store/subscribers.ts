// Per-user subscriber store for daily-report DMs. Skipped silently when Mongo is
// not connected (subscriptions simply unavailable).
import mongoose, { Schema } from "mongoose";
import { isMongoReady } from "./mongo.js";

export type Platform = "telegram" | "discord";

interface SubscriberDoc {
  platform: Platform;
  chatId: string;
  language: string;
  active: boolean;
  createdAt: Date;
}

const subscriberSchema = new Schema<SubscriberDoc>({
  platform: { type: String, required: true },
  chatId: { type: String, required: true },
  language: { type: String, default: "es" },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: () => new Date() },
});
subscriberSchema.index({ platform: 1, chatId: 1 }, { unique: true });

const SubscriberModel =
  mongoose.models.BotSubscriber || mongoose.model<SubscriberDoc>("BotSubscriber", subscriberSchema);

export interface SubscriberRef {
  chatId: string;
  language: string;
}

export async function subscribe(platform: Platform, chatId: string, language = "es"): Promise<void> {
  if (!isMongoReady()) return;
  await SubscriberModel.updateOne(
    { platform, chatId },
    { $set: { active: true, language }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
}

export async function unsubscribe(platform: Platform, chatId: string): Promise<void> {
  if (!isMongoReady()) return;
  await SubscriberModel.updateOne({ platform, chatId }, { $set: { active: false } });
}

export async function setLanguage(platform: Platform, chatId: string, language: string): Promise<void> {
  if (!isMongoReady()) return;
  await SubscriberModel.updateOne({ platform, chatId }, { $set: { language } }, { upsert: true });
}

export async function isSubscribed(platform: Platform, chatId: string): Promise<boolean> {
  if (!isMongoReady()) return false;
  const doc = await SubscriberModel.findOne({ platform, chatId, active: true }).lean();
  return Boolean(doc);
}

/** Stored language preference for a user (set via /idioma), or null. */
export async function getLanguage(platform: Platform, chatId: string): Promise<string | null> {
  if (!isMongoReady()) return null;
  const doc = await SubscriberModel.findOne({ platform, chatId }).lean<SubscriberDoc>();
  return doc?.language ?? null;
}

export async function listActive(platform: Platform): Promise<SubscriberRef[]> {
  if (!isMongoReady()) return [];
  const docs = await SubscriberModel.find({ platform, active: true }).lean<SubscriberDoc[]>();
  return docs.map((d) => ({ chatId: d.chatId, language: d.language }));
}

/** Mark chatIds inactive (e.g. after a Telegram 403). */
export async function deactivate(platform: Platform, chatIds: string[]): Promise<void> {
  if (!isMongoReady() || chatIds.length === 0) return;
  await SubscriberModel.updateMany({ platform, chatId: { $in: chatIds } }, { $set: { active: false } });
}

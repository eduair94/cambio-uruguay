// Which content promo goes out next.
//
// "Least recently posted wins" rather than an index counter, because the
// catalogue grows: an index would make every newly added page wait a full lap,
// while a timestamp puts a page that has never been posted at the front (its
// last-posted time is effectively zero).
//
// Without Mongo the job still rotates — deterministically, by day — instead of
// posting the same page forever. Same feature-gating contract as the rest of
// bots/: no credentials means degraded, never broken.
import mongoose, { Schema } from "mongoose";
import type { ContentPromo } from "../format/promos.js";
import { isMongoReady } from "./mongo.js";

interface PromoPostDoc {
  slug: string;
  lastPostedAt: Date;
  count: number;
}

const promoPostSchema = new Schema<PromoPostDoc>({
  slug: { type: String, required: true, unique: true },
  lastPostedAt: { type: Date, default: () => new Date() },
  count: { type: Number, default: 0 },
});

const PromoPostModel =
  mongoose.models.BotPromoPost || mongoose.model<PromoPostDoc>("BotPromoPost", promoPostSchema);

/** Days since the epoch — a stable rotation cursor that does not need storage. */
export function dayIndex(now: Date): number {
  return Math.floor(now.getTime() / 86_400_000);
}

/**
 * The promo to post now, or `undefined` if the catalogue is empty.
 *
 * With Mongo: the never-posted ones first, then the stalest. Ties break on slug
 * so two processes racing pick the same one and the dedup key does its job.
 */
export async function pickNextPromo(
  promos: readonly ContentPromo[],
  now: Date = new Date()
): Promise<ContentPromo | undefined> {
  if (promos.length === 0) return undefined;
  if (!isMongoReady()) {
    return promos[dayIndex(now) % promos.length];
  }
  const docs = await PromoPostModel.find({ slug: { $in: promos.map((p) => p.slug) } })
    .select({ slug: 1, lastPostedAt: 1 })
    .lean<{ slug: string; lastPostedAt: Date }[]>();
  const lastBySlug = new Map(docs.map((d) => [d.slug, new Date(d.lastPostedAt).getTime()]));
  return [...promos].sort((a, b) => {
    const at = lastBySlug.get(a.slug) ?? 0;
    const bt = lastBySlug.get(b.slug) ?? 0;
    return at - bt || a.slug.localeCompare(b.slug);
  })[0];
}

/** Records that `slug` just went out. No-op without Mongo (the day cursor covers it). */
export async function markPromoPosted(slug: string, now: Date = new Date()): Promise<void> {
  if (!isMongoReady()) return;
  await PromoPostModel.updateOne(
    { slug },
    { $set: { lastPostedAt: now }, $inc: { count: 1 } },
    { upsert: true }
  );
}

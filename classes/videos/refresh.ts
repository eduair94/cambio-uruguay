// Build one snapshot of "los videos de economía que salieron últimamente".
//
// Every channel is read independently and its failure is recorded, not thrown: a run where two
// channels 404 still publishes the rest, and the page can say which ones did not answer. That is
// the whole reason `channels` carries a per-channel status — a silently shorter list looks exactly
// like a quiet week, and the page must be able to tell the two apart.

import { VIDEO_CHANNELS } from "./channels";
import { classifyMoney } from "../trends/classify";
import { fetchChannelFeed, firstParagraph } from "./sources";
import { classifyTopics } from "./topics";
import type { RawVideo } from "./sources";
import type { VideoChannel, VideoChannelStatus, VideoItem, VideosSnapshot } from "./types";
import { VIDEOS_KEY } from "./types";

/**
 * How far back a video may be and still be published.
 *
 * 120 days, not 7. The hub sorts by score and shows the fresh ones first, but the per-topic pages
 * live or die on volume: with a one-week window, "Jubilaciones y AFAP" would be an empty page most
 * of the year, and an empty page is worse than no page. The date is printed on every card, so a
 * three-month-old video is never passed off as today's.
 */
export const MAX_AGE_DAYS = 120;

/** Ceiling on the published list. Comfortably above what the hub and every topic page render. */
const MAX_VIDEOS = 220;

/**
 * Ceiling per channel.
 *
 * A daily newscast uploads 15 economy clips a week and would otherwise be the entire page. This is
 * applied AFTER scoring, so what survives is that channel's best rows, not its most recent.
 *
 * Eight and not twelve, measured: the BCU uploads a whole conference in one afternoon, and at
 * twelve the "Economía uruguaya" page was ten consecutive sessions of the Jornadas Anuales.
 */
const MAX_PER_CHANNEL = 8;

/** How many channel feeds are in flight at once. Polite, and enough to finish in seconds. */
const CONCURRENCY = 5;

/** Run `worker` over `items` with a fixed number of workers. */
async function pool<T, R>(items: readonly T[], size: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await worker(items[i] as T);
    }
  });
  await Promise.all(runners);
  return out;
}

interface ChannelResult {
  channel: VideoChannel;
  /** The channel's own <title>, when the feed answered. Trusted over the catalogue's `name`. */
  feedName: string;
  videos: RawVideo[];
  error?: string;
}

async function readChannel(channel: VideoChannel): Promise<ChannelResult> {
  try {
    const feed = await fetchChannelFeed(channel.channelId);
    return { channel, feedName: feed.name || channel.name, videos: feed.videos };
  } catch (err) {
    const message = (err as Error).message || String(err);
    console.warn(`[videos] ${channel.id} (${channel.channelId}) falló: ${message}`);
    return { channel, feedName: channel.name, videos: [], error: message };
  }
}

/**
 * How high a video sits.
 *
 * Not a quality judgement and never presented as one — it is the order of a list, and the page says
 * so. Recency and "is it about money" dominate; views only break ties, because a channel with ten
 * times the audience would otherwise bury every Uruguayan channel on a page for Uruguayans.
 */
export function scoreVideo(
  video: Pick<VideoItem, "publishedAt" | "views" | "money" | "topics" | "channelCountry">,
  weight: number,
  now: number
): number {
  const ageDays = Math.max(0, (now - Date.parse(video.publishedAt)) / 86_400_000);
  const recency = Math.max(0, 30 - ageDays);
  const channel = weight * 12;
  const money = video.money === "money" ? 18 : video.money === "maybe" ? 6 : 0;
  const topical = Math.min(video.topics.length, 3) * 4;
  const local = video.channelCountry === "UY" ? 15 : 0;
  const views = video.views && video.views > 0 ? Math.min(10, Math.log10(video.views) * 2) : 0;
  return Math.round((recency + channel + money + topical + local + views) * 100) / 100;
}

export async function buildVideosSnapshot(now: Date = new Date()): Promise<VideosSnapshot> {
  const results = await pool(VIDEO_CHANNELS, CONCURRENCY, readChannel);
  const cutoff = now.getTime() - MAX_AGE_DAYS * 86_400_000;

  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const candidates: VideoItem[] = [];

  for (const result of results) {
    const { channel } = result;
    for (const raw of result.videos) {
      // Shorts are dropped outright. A 40-second vertical clip is not an explainer, it carries no
      // description worth classifying, and Google's video results treat it as a different product.
      if (raw.isShort) continue;

      const published = Date.parse(raw.publishedAt);
      if (!Number.isFinite(published) || published < cutoff) continue;
      if (seenIds.has(raw.videoId)) continue;

      // The same segment gets uploaded to a network's main channel and its news channel under the
      // same title. Keep the first copy the scoring order happens to reach.
      const titleKey = raw.title.trim().toLowerCase();
      if (seenTitles.has(titleKey)) continue;

      const blurb = firstParagraph(raw.description);
      const topics = classifyTopics(raw.title, blurb);
      const verdict = classifyMoney(raw.title, blurb);

      // A generalist feed (a TV newscast, a bank, a radio station) carries football, crime and its
      // own advertising in the same list. Those channels must produce a video that some TOPIC
      // claims — not merely one the money classifier likes, which was measured to be far too weak
      // here: `MONEY_KEYWORDS` contains the bank names, so "Kaizen Softworks e Itaú Empresas", an
      // ad, sailed through on the word "Itaú" alone.
      //
      // A dedicated economy channel is exempt: its whole feed is on-topic by construction, so an
      // untagged "Editorial del lunes" from one of those is still worth showing. It simply lands on
      // the hub and on no topic page, which is exactly right.
      if (channel.needsFilter && topics.length === 0) continue;

      seenIds.add(raw.videoId);
      seenTitles.add(titleKey);

      const item: VideoItem = {
        videoId: raw.videoId,
        title: raw.title,
        description: blurb,
        url: raw.url,
        embedUrl: `https://www.youtube.com/embed/${raw.videoId}`,
        thumbnail: raw.thumbnail,
        publishedAt: new Date(published).toISOString(),
        channelId: channel.channelId,
        channelKey: channel.id,
        channelName: result.feedName,
        channelHandle: channel.handle,
        channelCountry: channel.country,
        views: raw.views,
        topics,
        money: verdict.money,
        matchedOn: verdict.matchedOn,
        score: 0,
      };
      item.score = scoreVideo(item, channel.weight, now.getTime());
      candidates.push(item);
    }
  }

  candidates.sort((a, b) => b.score - a.score || Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const perChannel = new Map<string, number>();
  const videos: VideoItem[] = [];
  for (const video of candidates) {
    const used = perChannel.get(video.channelKey) ?? 0;
    if (used >= MAX_PER_CHANNEL) continue;
    perChannel.set(video.channelKey, used + 1);
    videos.push(video);
    if (videos.length >= MAX_VIDEOS) break;
  }

  const channels: VideoChannelStatus[] = results.map(result => ({
    id: result.channel.id,
    name: result.feedName,
    handle: result.channel.handle,
    country: result.channel.country,
    kind: result.channel.kind,
    blurb: result.channel.blurb,
    ok: !result.error,
    count: perChannel.get(result.channel.id) ?? 0,
    ...(result.error ? { error: result.error } : {}),
  }));

  const topicCounts: Record<string, number> = {};
  for (const video of videos) {
    for (const slug of video.topics) topicCounts[slug] = (topicCounts[slug] ?? 0) + 1;
  }

  return {
    key: VIDEOS_KEY,
    capturedAt: now,
    videos,
    channels,
    topicCounts,
    counts: {
      videos: videos.length,
      channelsOk: channels.filter(c => c.ok).length,
      channelsDown: channels.filter(c => !c.ok).length,
      uruguayan: videos.filter(v => v.channelCountry === "UY").length,
    },
  };
}

/**
 * True when a snapshot carries nothing worth publishing.
 *
 * Used to refuse the write: overwriting a usable snapshot with an empty one turns a transient
 * YouTube outage into a permanently blank page, and the page has no other source of rows.
 */
export function snapshotIsEmpty(snapshot: VideosSnapshot): boolean {
  return snapshot.videos.length === 0;
}

/**
 * True when a run came back suspiciously thin.
 *
 * The pattern that motivates it (and that the Bankos job already pays for): YouTube rate-limits or
 * the VPS loses DNS for a moment, most feeds fail, three videos survive, and the snapshot is
 * overwritten with a page that looks alive and is empty. A run that lost more than half its
 * channels is not allowed to replace a healthy one.
 */
export function snapshotIsThin(snapshot: VideosSnapshot, previousVideoCount: number): boolean {
  const total = snapshot.counts.channelsOk + snapshot.counts.channelsDown;
  if (total > 0 && snapshot.counts.channelsOk * 2 < total) return true;
  return previousVideoCount > 0 && snapshot.videos.length * 2 < previousVideoCount;
}

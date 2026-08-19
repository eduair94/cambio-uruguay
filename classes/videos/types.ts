// Shape of the "videos de economía" snapshot.
//
// Like the trends snapshot, this is a CACHE and not an archive: every row is re-derivable from a
// public YouTube RSS feed, so a failed run is allowed to leave the previous document serving rather
// than blanking the page. Nothing here is unrecomputable the way the prediction ledger is.
//
// What IS ours and not YouTube's: `topics`, `money`, `matchedOn` and `score`. Everything else is
// reproduced verbatim from the feed — we never restate a view count or a date in our own words.

import type { MoneyVerdict } from "../trends/types";

export type { MoneyVerdict };

/** One channel in the curated catalogue. */
export interface VideoChannel {
  /** Stable kebab-case key. Used in the snapshot and in the app; never rendered. */
  id: string;
  /** YouTube's `UC…` id. The RSS feed is addressed by this and nothing else. */
  channelId: string;
  /** Display name. Overwritten at read time with the feed's own <title>. */
  name: string;
  /** `@handle`, for the human-checkable link. Empty when unknown. */
  handle: string;
  /** ISO-ish country tag, or REGIONAL. Drives the "de acá / de afuera" split on the page. */
  country: string;
  kind: "medio" | "creador" | "institucion" | "broker" | "podcast";
  /**
   * True for generalist channels (a TV newscast uploads football and economy into one feed).
   * Their videos must clear the money classifier to be published; a dedicated economy channel's
   * videos are kept even when the title alone says nothing ("Editorial del lunes").
   */
  needsFilter: boolean;
  /** 3 = uruguayo de economía pura · 2 = medio uruguayo o regional excelente · 1 = complemento. */
  weight: 1 | 2 | 3;
  /** One line, in Spanish, saying what this channel adds. Rendered on the page. */
  blurb: string;
}

/** One published video, as it reaches the page. */
export interface VideoItem {
  videoId: string;
  title: string;
  /** First paragraph of the feed's <media:description>, trimmed. Never rewritten. */
  description: string;
  url: string;
  embedUrl: string;
  thumbnail: string;
  /** ISO 8601, straight from the feed's <published>. */
  publishedAt: string;
  channelId: string;
  channelKey: string;
  channelName: string;
  channelHandle: string;
  channelCountry: string;
  /** YouTube's own <media:statistics views>. Null when the feed omits it. */
  views: number | null;
  /** Our topic slugs (see `topics.ts`). Can be empty: a video need not have a topic. */
  topics: string[];
  money: MoneyVerdict;
  matchedOn: string[];
  /** Our ranking number. Recency × channel weight × topical fit. Not a quality judgement. */
  score: number;
}

/**
 * Per-channel health AND identity, so the page can both credit its sources and say "esto no se
 * pudo leer" instead of pretending.
 *
 * The catalogue fields (`country`, `kind`, `handle`, `blurb`) are copied into the snapshot rather
 * than mirrored in the app: the backend owns the catalogue, and a second hand-maintained copy in
 * `app/utils/` is a parity test waiting to fail for no benefit — the app cannot render the channel
 * list without the snapshot anyway.
 */
export interface VideoChannelStatus {
  id: string;
  /** The channel's own <title> when the feed answered, else the catalogue's name. */
  name: string;
  handle: string;
  country: string;
  kind: VideoChannel["kind"];
  blurb: string;
  ok: boolean;
  /** Videos this channel contributed to the published list (post-filter), not feed size. */
  count: number;
  error?: string;
}

export interface VideosSnapshot {
  key: string;
  capturedAt: Date;
  videos: VideoItem[];
  channels: VideoChannelStatus[];
  /** Published count per topic slug, so the app can hide empty topics without scanning. */
  topicCounts: Record<string, number>;
  counts: {
    videos: number;
    channelsOk: number;
    channelsDown: number;
    /** How many of the published videos are from Uruguayan channels. */
    uruguayan: number;
  };
}

/** The single document's key. One row, upserted. */
export const VIDEOS_KEY = "uy";

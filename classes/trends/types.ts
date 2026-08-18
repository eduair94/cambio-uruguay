// Shape of the "what is Uruguay searching right now" snapshot.
//
// The snapshot is a CACHE, not an archive: every field can be re-fetched from its source, so a
// failed run is allowed to leave the previous document serving rather than blanking the page.

/** How confident we are that a trend is about money, and why. */
export type MoneyVerdict = "money" | "maybe" | "no";

export interface TrendHeadline {
  title: string;
  source: string;
  url: string;
}

/** One row of Google Trends' daily list for Uruguay. */
export interface TrendSearch {
  /** The search term exactly as Google publishes it. */
  term: string;
  /** Google's own bucket, e.g. "2000+". Never a number we computed. */
  approxTraffic: string;
  /** 1-based position in Google's list — Google's ordering, not ours. */
  rank: number;
  money: MoneyVerdict;
  /** Which keyword fired the classifier. Empty when `money` is "no". */
  matchedOn: string[];
  headlines: TrendHeadline[];
}

/** One Reddit thread from the Uruguayan subs, as community signal. */
export interface TrendRedditPost {
  title: string;
  subreddit: string;
  score: number;
  comments: number;
  url: string;
  createdAt: string;
  money: MoneyVerdict;
  matchedOn: string[];
}

/** One economy headline from Google News' Uruguay edition. */
export interface TrendNewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

/** Per-source health, so the page can say "esto no se pudo leer" instead of pretending. */
export interface TrendSourceStatus {
  ok: boolean;
  count: number;
  error?: string;
}

export interface TrendsSnapshot {
  key: string;
  capturedAt: Date;
  searches: TrendSearch[];
  reddit: TrendRedditPost[];
  news: TrendNewsItem[];
  sources: {
    googleTrends: TrendSourceStatus;
    reddit: TrendSourceStatus;
    news: TrendSourceStatus;
  };
  counts: {
    searches: number;
    moneySearches: number;
    reddit: number;
    moneyReddit: number;
    news: number;
  };
}

/** The single document's key. One row, upserted. */
export const TRENDS_KEY = "uy";

// Build one snapshot of "what Uruguay is searching and talking about right now".
//
// Each source is read independently and its failure is recorded, not thrown: a run where Reddit is
// down still publishes the Google Trends list, and the page says which reader failed. That is the
// whole reason `sources` exists in the snapshot — a silently short list looks identical to a quiet
// day, and the page must be able to tell the two apart.

import { classifyMoney } from "./classify";
import { fetchEconomyNews, fetchGoogleTrends, fetchRedditHot } from "./sources";
import type {
  TrendNewsItem,
  TrendRedditPost,
  TrendSearch,
  TrendSourceStatus,
  TrendsSnapshot,
} from "./types";
import { TRENDS_KEY } from "./types";

/** How many rows of each kind reach the page. Google publishes ~10-20 terms a day. */
const MAX_SEARCHES = 20;
const MAX_REDDIT = 24;
const MAX_NEWS = 18;

async function attempt<T>(
  label: string,
  fn: () => Promise<T[]>
): Promise<{ rows: T[]; status: TrendSourceStatus }> {
  try {
    const rows = await fn();
    return { rows, status: { ok: true, count: rows.length } };
  } catch (err) {
    const message = (err as Error).message || String(err);
    console.warn(`[trends] ${label} failed: ${message}`);
    return { rows: [], status: { ok: false, count: 0, error: message } };
  }
}

export async function buildTrendsSnapshot(): Promise<TrendsSnapshot> {
  const [trends, reddit, news] = await Promise.all([
    attempt("google-trends", fetchGoogleTrends),
    attempt("reddit", () => fetchRedditHot()),
    attempt("news", fetchEconomyNews),
  ]);

  const searches: TrendSearch[] = trends.rows.slice(0, MAX_SEARCHES).map((row, i) => {
    // Classify on the term PLUS its headlines: a bare surname or a club name says nothing on its
    // own, and the headline Google attaches is often the only place the money angle appears.
    const verdict = classifyMoney(row.term, ...row.headlines.map(h => h.title));
    return {
      term: row.term,
      approxTraffic: row.approxTraffic,
      rank: i + 1,
      money: verdict.money,
      matchedOn: verdict.matchedOn,
      headlines: row.headlines.slice(0, 3),
    };
  });

  // Drop the megathreads before anything else. A stickied post sits at the top of `hot` forever
  // with hundreds of upvotes and no live conversation — r/uruguay's pinned shopping guide and job
  // board both classify as money and would permanently occupy the first two rows of the page.
  const seenTitles = new Set<string>();
  const redditRows: TrendRedditPost[] = reddit.rows
    .filter(post => !post.stickied)
    .filter(post => {
      // The same thread is often crossposted to two Uruguayan subs; keep the first copy seen.
      const key = post.title.trim().toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    })
    .map(post => {
      // TITLE ONLY, deliberately. Feeding the body in was measured on 2026-08-18 and classified
      // 20 of 24 hot threads as money, including one about ketamine and one about not eating
      // sweets: a 400-character body mentions "trabajo" or "precio" almost by accident, while the
      // title is what the thread is actually about.
      const verdict = classifyMoney(post.title);
      return {
        title: post.title,
        subreddit: post.sub,
        score: post.score,
        comments: post.numComments,
        url: post.permalink.startsWith("http")
          ? post.permalink
          : `https://reddit.com${post.permalink}`,
        createdAt: new Date(post.createdUtc * 1000).toISOString(),
        money: verdict.money,
        matchedOn: verdict.matchedOn,
      };
    })
    // Money first, then by how much conversation it drew. Comments, not upvotes: a thread with 80
    // comments is an unanswered question, which is the signal this site acts on; a photo of the
    // Rambla gets upvotes and asks nothing.
    .sort((a, b) => {
      const rank = (m: TrendRedditPost["money"]) => (m === "money" ? 0 : m === "maybe" ? 1 : 2);
      const byMoney = rank(a.money) - rank(b.money);
      return byMoney !== 0 ? byMoney : b.comments - a.comments;
    })
    .slice(0, MAX_REDDIT);

  const newsRows: TrendNewsItem[] = news.rows.slice(0, MAX_NEWS);

  return {
    key: TRENDS_KEY,
    capturedAt: new Date(),
    searches,
    reddit: redditRows,
    news: newsRows,
    sources: { googleTrends: trends.status, reddit: reddit.status, news: news.status },
    counts: {
      searches: searches.length,
      moneySearches: searches.filter(s => s.money === "money").length,
      reddit: redditRows.length,
      moneyReddit: redditRows.filter(r => r.money === "money").length,
      news: newsRows.length,
    },
  };
}

/**
 * True when a snapshot carries nothing worth publishing.
 *
 * Used to refuse the write: overwriting yesterday's usable snapshot with an all-empty one turns a
 * transient outage into a permanently blank page.
 */
export function snapshotIsEmpty(snapshot: TrendsSnapshot): boolean {
  return snapshot.searches.length === 0 && snapshot.reddit.length === 0 && snapshot.news.length === 0;
}

// Go back to the threads a page was written for.
//
// This is the half of "generate the page and then share it in the comment" that is easy to forget,
// and without it the whole gap pipeline is a content generator with no distribution: the site gains
// a page, and the twelve people who asked the question never hear about it.
//
// The threads are parked as `waiting_page` in the reply ledger when their page is published. Here
// they come back — but only once the page is BOTH live and in the index, because until it is
// indexed the retriever cannot score it and the bot would answer with something else, and until it
// is deployed the link would 404.
//
// Their age is deliberately not checked. A revisited thread is days old by construction: research,
// verification, deploy and the next index build all had to happen first. Answering a four-day-old
// question with the page that answers it is worth doing; that is the entire point of having written
// it.

import axios from "axios";
import { fetchPostsByIds, type RedditPostRaw } from "../reddit";
import { waitingForPage } from "./ledger";
import type { BotConfig } from "./config";

/** How long after publication a parked thread is still worth answering. */
const MAX_WAIT_DAYS = 21;

export interface RevisitCandidate {
  post: RedditPostRaw;
  /** The page written for it. The reply must link this and nothing else. */
  pagePath: string;
}

/** Is the route actually being served? Until the deploy lands, the link would 404. */
async function pageIsLive(baseUrl: string, pagePath: string): Promise<boolean> {
  try {
    const res = await axios.get(`${baseUrl}${pagePath}`, {
      timeout: 12000,
      signal: AbortSignal.timeout(14000),
      maxRedirects: 2,
      validateStatus: () => true,
      responseType: "text",
      transformResponse: (d) => d,
      headers: { "User-Agent": "CambioUruguayBot/1.0 revisit-check" },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

export interface RevisitDeps {
  /** Routes present in the loaded RAG index. A page not in here cannot be retrieved yet. */
  indexedPaths: ReadonlySet<string>;
  cfg: BotConfig;
}

/**
 * Parked threads whose page is ready, with the posts re-fetched from Reddit.
 *
 * Anything still alive but not yet answerable stays parked; anything deleted or locked simply drops
 * out, because Reddit does not return it or the normal screen rejects it.
 */
export async function revisitCandidates({ indexedPaths, cfg }: RevisitDeps): Promise<RevisitCandidate[]> {
  const parked = await waitingForPage();
  if (!parked.length) return [];

  const ready = parked.filter((row) => row.pagePath && indexedPaths.has(row.pagePath));
  if (!ready.length) {
    console.log(`[redditbot] ${parked.length} hilos esperan su página; todavía no está indexada`);
    return [];
  }

  // One liveness check per distinct route, not per thread.
  const live = new Set<string>();
  for (const pagePath of new Set(ready.map((row) => row.pagePath))) {
    if (await pageIsLive(cfg.baseUrl, pagePath)) live.add(pagePath);
    else console.warn(`[redditbot] ${pagePath} está en el índice pero no responde 200 — no se contesta todavía`);
  }

  const answerable = ready.filter((row) => live.has(row.pagePath));
  if (!answerable.length) return [];

  const posts = await fetchPostsByIds(answerable.map((row) => row.postId));
  const byId = new Map(posts.map((post) => [post.id, post]));
  const cutoff = Date.now() - MAX_WAIT_DAYS * 24 * 60 * 60 * 1000;

  const out: RevisitCandidate[] = [];
  for (const row of answerable) {
    const post = byId.get(row.postId);
    // Gone from /api/info means deleted. Locked or removed means the thread is closed to us.
    if (!post || post.locked) continue;
    if (post.createdUtc * 1000 < cutoff) continue;
    out.push({ post, pagePath: row.pagePath });
  }

  if (out.length) console.log(`[redditbot] ${out.length} hilos vuelven a la cola: su página ya está publicada`);
  return out;
}

// Search r/uruguay for everything customs-shaped, store it, and never download it twice.
//
// The query list is not intuition: it is what actually surfaces the corpus (1161 threads on the
// first sweep). Broad queries like `importar` also drag in political rants — that is fine and
// expected; the classifier is allowed to return null, and it is what filters them out. Better a
// noisy net and a strict filter than a narrow net that misses "me robaron el paquete".
//
// classes/reddit.ts's real exports are `searchPosts(sub, query, opts)` and
// `fetchComments(sub, postId, known)` — confirmed against tests/couriers/reddit.test.ts, the
// suite that ported it from the Nuxt app. `searchSubreddit` does not exist on that module.
import { fetchComments, redditConfigured, searchPosts, type RedditPostRaw } from "../reddit";
import { knownCommentIds, upsertComments, upsertPosts } from "./corpus";

export const ADUANA_QUERIES = [
  "aduana",
  "aduana paquete",
  "paquete retenido",
  "despachante",
  "DUA",
  "courier compra exterior",
  "franquicia 200",
  "importar",
  "encomienda",
  "traer del exterior",
];

const SUB = "uruguay";

export async function harvestAduana(
  opts: { window?: "year" | "all" } = {}
): Promise<{ posts: number; comments: number }> {
  if (!redditConfigured()) return { posts: 0, comments: 0 };

  // One search per query, deduped by thread id: a post surfaced by two different queries is
  // downloaded once and keeps both queries in its `queries` set (see corpus.ts's $addToSet).
  const byId = new Map<string, { post: RedditPostRaw; queries: string[] }>();
  for (const q of ADUANA_QUERIES) {
    for (const post of await searchPosts(SUB, q, { t: opts.window ?? "year", sort: "new" })) {
      const hit = byId.get(post.id);
      if (hit) hit.queries.push(q);
      else byId.set(post.id, { post, queries: [q] });
    }
  }

  const rows = [...byId.values()].map(({ post, queries }) => ({ ...post, queries }));
  const posts = await upsertPosts(rows);

  // The comment ids we already hold are fed back into fetchComments so Reddit does not even send
  // them again — that is what keeps the weekly re-crawl of an old thread cheap.
  let comments = 0;
  for (const { post } of byId.values()) {
    const known = await knownCommentIds(post.id);
    const fresh = await fetchComments(SUB, post.id, known);
    comments += await upsertComments(post.id, fresh);
  }
  return { posts, comments };
}

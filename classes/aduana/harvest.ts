// Search the Uruguayan subs for everything customs-shaped, store it, and never download it twice.
//
// The query list is not intuition: it is what actually surfaces the corpus. Broad queries like
// `importar` also drag in political rants — that is fine and expected. The classifier may return
// null, and that is what filters them out. Better a noisy net and a strict filter than a narrow
// net that misses "me robaron el paquete".
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

/**
 * Long-tail searches used by the manual historical audit.
 *
 * The scheduled job keeps the compact query set above: it runs frequently and broad searches
 * already catch most new threads. The audit command adds product-, platform- and procedure-shaped
 * wording seen in actual r/uruguay titles so a fresh/backfilled corpus does not depend on authors
 * having written the word "aduana" in exactly the same way.
 */
export const ADUANA_AUDIT_QUERIES = [
  "compras exterior",
  "impuestos compra exterior",
  "60% aduana",
  "franquicia 800",
  "franquicia tarjeta",
  "vendedor registrado aduana",
  "identidad digital franquicia",
  "Amazon aduana",
  "AliExpress aduana",
  "Temu aduana",
  "TiendaMia aduana",
  "regalo exterior aduana",
  "productos prohibidos aduana",
  "semillas aduana",
  "suplementos aduana",
  "medicamentos aduana",
  "baterias aduana",
  "juguetes sexuales aduana",
  "mudanza aduana",
  "equipaje aduana",
  "aduana extranjero",
  "importacion comercial",
  "retenido courier",
  "envio exterior perdido",
];

/**
 * r/uruguay carries the bulk of the customs corpus, but the question-shaped threads ("¿cuánto voy
 * a pagar por…?", "¿me lo van a retener?") skew to r/AskUruguayan, which the general sub's
 * "no preguntes, buscá" culture pushes away. Both are searched; dedupe is by thread id, and each
 * thread's comments are fetched from ITS OWN sub — passing a hardcoded sub to /comments returns
 * the thread anyway, but the permalinks we store would then point at the wrong subreddit.
 */
export const ADUANA_SUBS = ["uruguay", "AskUruguayan"] as const;

export async function harvestAduana(
  opts: { window?: "year" | "all"; queries?: readonly string[] } = {}
): Promise<{ posts: number; comments: number }> {
  // No-op without credentials — but NOT a silent one, same contract as gemini.ts#geminiConfigured:
  // a skipped safety/data check must say so out loud. Before this, `threads=0` in the sync
  // summary read identically for "ran the search and found nothing new" and "never even tried",
  // and only the second one is something a human needs to go fix.
  if (!redditConfigured()) {
    console.warn("[aduana] harvest: no Reddit credentials — se omite la cosecha de Reddit");
    return { posts: 0, comments: 0 };
  }

  // One search per (query × sub), deduped by thread id: a post surfaced by two different queries is
  // downloaded once and keeps both queries in its `queries` set (see corpus.ts's $addToSet).
  const byId = new Map<string, { post: RedditPostRaw; queries: string[] }>();
  for (const q of opts.queries ?? ADUANA_QUERIES) {
    for (const sub of ADUANA_SUBS) {
      for (const post of await searchPosts(sub, q, { t: opts.window ?? "year", sort: "new" })) {
        const hit = byId.get(post.id);
        if (hit) hit.queries.push(q);
        else byId.set(post.id, { post, queries: [q] });
      }
    }
  }

  const rows = [...byId.values()].map(({ post, queries }) => ({ ...post, queries }));
  const posts = await upsertPosts(rows);

  // The comment ids we already hold are fed back into fetchComments so the visible tree is filtered
  // before writing and known collapsed branches are not requested again. That keeps a re-crawl of
  // an old thread cheap.
  let comments = 0;
  for (const { post } of byId.values()) {
    const known = await knownCommentIds(post.id);
    const fresh = await fetchComments(post.sub || ADUANA_SUBS[0], post.id, known);
    comments += await upsertComments(post.id, fresh);
  }
  return { posts, comments };
}

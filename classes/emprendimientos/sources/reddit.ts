// Cuentas de Instagram que la gente comparte en los subs uruguayos. El hilo que dio origen a la
// página («Nos compartimos emprendimientos interesantes?», r/uruguay, 21/5/2026, 28 comentarios)
// dejó ocho cuentas en sus respuestas; los hilos de autobombo («Les comparto un emprendimiento
// uruguayo…») dejan una en el texto.
//
// Se usa la API de Reddit (classes/reddit.ts, la misma de las oportunidades): la búsqueda por texto
// de Arctic Shift devolvió «Timeout. Maybe slow down a bit» en toda ventana de más de unos meses
// (23/11/2026). Precisión: de un comentario se toman los enlaces a instagram.com y, sólo si el
// comentario habla de Instagram o de un emprendimiento, las @menciones — en Reddit una arroba suele
// ser una persona.
import { fetchComments, redditConfigured, searchPosts, type RedditCommentRaw, type RedditPostRaw } from "../../reddit";
import { instagramLinksIn, mentionsIn } from "../handles";
import type { SourceRef } from "../types";

export const REDDIT_SUBS = ["uruguay", "montevideo", "Uruguay_nomas", "UruguayMarketplace", "MadeInUruguay"] as const;
export const REDDIT_QUERIES = ["emprendimiento instagram", "emprendimientos", "instagram.com", "les comparto mi emprendimiento", "tienda instagram"] as const;

/** Un hilo merece leer sus comentarios si pide o comparte emprendimientos. */
const SHARING_THREAD = /emprend|compart|recomi[eé]nd|tiendas?\b|marcas? (?:uruguay|local)|hecho en uruguay|instagram|\big\b/i;
const IG_CONTEXT = /instagram|\binsta\b|\big\b|emprend|tienda|vendo|hago|pedidos|encargos/i;

export interface RedditFind {
  handle: string;
  source: SourceRef;
}

const permalinkUrl = (permalink: string): string => `https://www.reddit.com${permalink.startsWith("/") ? permalink : `/${permalink}`}`;

export function handlesFromPost(post: Pick<RedditPostRaw, "title" | "selftext" | "url">): string[] {
  const text = `${post.title}\n${post.selftext}\n${post.url}`;
  const out = instagramLinksIn(text);
  if (IG_CONTEXT.test(text)) for (const handle of mentionsIn(post.selftext)) if (!out.includes(handle)) out.push(handle);
  return out;
}

export function handlesFromComment(comment: Pick<RedditCommentRaw, "body">): string[] {
  const out = instagramLinksIn(comment.body);
  if (IG_CONTEXT.test(comment.body)) for (const handle of mentionsIn(comment.body)) if (!out.includes(handle)) out.push(handle);
  return out;
}

export interface RedditPlan {
  day: string;
  /** Hilos cuyos comentarios ya se leyeron, con la cantidad de comentarios de ese momento. */
  threadsSeen: Readonly<Record<string, number>>;
  maxThreads: number;
  /** "all" la primera vez, "month" después. */
  window: "all" | "year" | "month";
}

export interface RedditResult {
  finds: RedditFind[];
  threadsRead: Record<string, number>;
  posts: number;
  ok: boolean;
}

/** Busca hilos, toma las cuentas del texto y lee los comentarios de los hilos que comparten. */
export async function readReddit(plan: RedditPlan): Promise<RedditResult> {
  const result: RedditResult = { finds: [], threadsRead: {}, posts: 0, ok: false };
  if (!redditConfigured()) return result;
  const posts = new Map<string, RedditPostRaw>();
  for (const sub of REDDIT_SUBS) {
    for (const query of REDDIT_QUERIES) {
      try {
        for (const post of await searchPosts(sub, query, { t: plan.window, sort: "new", maxPages: plan.window === "all" ? 3 : 1 })) {
          if (!posts.has(post.id)) posts.set(post.id, post);
        }
        result.ok = true;
      } catch {
        /* una búsqueda caída no tira las otras */
      }
    }
  }
  result.posts = posts.size;
  const add = (handle: string, post: RedditPostRaw, text: string): void => {
    if (result.finds.some(find => find.handle === handle)) return;
    result.finds.push({
      handle,
      source: { kind: "reddit", day: plan.day, url: permalinkUrl(post.permalink), label: post.title.slice(0, 140), text: text.slice(0, 300) },
    });
  };
  for (const post of posts.values()) for (const handle of handlesFromPost(post)) add(handle, post, post.selftext);

  const threads = [...posts.values()]
    .filter(post => post.numComments > 0 && SHARING_THREAD.test(`${post.title} ${post.selftext}`))
    .filter(post => (plan.threadsSeen[post.id] ?? -1) < post.numComments)
    .sort((a, b) => b.numComments - a.numComments)
    .slice(0, plan.maxThreads);
  for (const post of threads) {
    try {
      const comments = await fetchComments(post.sub, post.id);
      for (const comment of comments) for (const handle of handlesFromComment(comment)) add(handle, post, comment.body);
      result.threadsRead[post.id] = post.numComments;
    } catch {
      /* el hilo se reintenta mañana */
    }
  }
  return result;
}

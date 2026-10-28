// Qué páginas del sitio podrían contestar un hilo: las que proponen las reglas de intención y las
// que encuentra el índice RAG por palabras. El juez elige UNA de éstas o ninguna; nunca otra.
//
// Sin embeddings, a propósito. El cupo de embeddings es de 1.000 por día y por proyecto (free tier,
// medido) y lo gasta el indexador nocturno; la cola juzga cientos de hilos el primer día. El brazo
// léxico solo (`rankWithVector(q, null)`) no cuesta nada, y lo que pierde en matices lo recupera el
// juez, que lee el hilo entero.
import type { RedditPostRaw } from "../reddit";
import type { RetrievedPage } from "../rag/types";
import { linkablePage } from "../redditbot/linkable";
import { moneyTopic, retrievalQuery } from "../redditbot/filter";
import { destinationOf, familyOf, intentMatches, type Family } from "./destinations";
import { opportunityText } from "./screen";
import { decodeEntities } from "./text";

export interface Candidate {
  path: string;
  title: string;
  family: Family;
  source: "intent" | "search";
  /** Lo que el juez lee de la página. */
  describe: string;
}

/** Lo único que la cola necesita del recuperador. */
export interface LexicalRetriever {
  rankWithVector(queryText: string, queryVector: Float32Array | null, limit?: number): RetrievedPage[];
}

/** Rutas que existen en el índice pero no se sugieren: los espejos de idioma y las privadas. */
const NOT_SUGGESTED = /^\/(en|pt)(\/|$)|^\/oportunidades-reddit(\/|$)/;

const MAX_INTENTS = 4;

function snippetOf(page: RetrievedPage): string {
  const chunk = page.chunks[0]?.chunk;
  if (!chunk) return page.title;
  const text = `${chunk.headingPath ? `${chunk.headingPath}: ` : ""}${chunk.text}`.replace(/\s+/g, " ").trim();
  return text.length > 240 ? `${text.slice(0, 240).trim()}…` : text;
}

/**
 * Las candidatas de un hilo, intenciones primero, sin rutas repetidas, hasta `max`.
 *
 * Devuelve [] —y el hilo no se juzga— cuando ni una regla matchea ni el hilo es de plata: el índice
 * léxico SIEMPRE devuelve algo para cualquier texto con palabras, así que sin esa condición cada
 * pregunta de r/monte_video sobre un recital le costaría una línea al juez.
 */
export function candidatesFor(post: RedditPostRaw, retriever: LexicalRetriever | null, max = 6): Candidate[] {
  const decoded: RedditPostRaw = { ...post, title: decodeEntities(post.title), selftext: decodeEntities(post.selftext) };
  const intents = intentMatches(opportunityText(decoded)).slice(0, MAX_INTENTS);
  const money = moneyTopic(decoded).length > 0;
  if (!intents.length && !money) return [];

  const out: Candidate[] = intents.map((d) => ({
    path: d.path,
    title: d.title,
    family: d.family,
    source: "intent" as const,
    describe: d.describe,
  }));
  const seen = new Set(out.map((c) => c.path));

  if (retriever) {
    for (const page of retriever.rankWithVector(retrievalQuery(decoded), null, 10)) {
      if (out.length >= max) break;
      if (seen.has(page.path) || page.tier === "stub") continue;
      if (!linkablePage(page.path) || NOT_SUGGESTED.test(page.path)) continue;
      seen.add(page.path);
      const known = destinationOf(page.path);
      out.push({
        path: page.path,
        title: known?.title ?? page.title,
        family: familyOf(page.path),
        source: "search",
        describe: known?.describe ?? snippetOf(page),
      });
    }
  }
  return out.slice(0, max);
}

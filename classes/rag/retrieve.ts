// Given a question in the wild, which page of the site answers it?
//
// Hybrid on purpose. Dense retrieval alone handles paraphrase well — "me frenaron un paquete en el
// correo" finding a page titled "Problemas con la Aduana" is exactly what embeddings are for — and
// handles proper nouns badly: BROU, Prex, OCA, Itaú, BPS, DGI, URSEC, Clearing all collapse toward
// each other in a 768-dim multilingual space, so a question about Prex fees happily retrieves the
// BROU page. Lexical retrieval is the mirror image: it nails the proper noun and misses every
// paraphrase. Neither is optional, so both run and their RANKS are fused.
//
// Fusing ranks rather than scores (Reciprocal Rank Fusion) is what makes the two comparable at all:
// a cosine of 0.71 and a BM25 of 14.3 have no common unit, but "3rd" and "1st" do.

import { cosine, embedOne } from "./embed";
import type { RagChunk, RetrievedPage, ScoredChunk } from "./types";

/** RRF's damping constant. 60 is the value from the original paper and is not worth tuning here:
 *  it only controls how sharply rank 1 outweighs rank 10, and both lists are short. */
const RRF_K = 60;
/** How many chunks each retriever contributes to the fusion. */
const CANDIDATES_PER_ARM = 40;
/**
 * A page's score is its best chunk plus a decaying share of its other matching chunks. A guide that
 * discusses the topic in four separate sections IS a better answer than one that mentions it once,
 * but not four times better — without the decay, long pages win everything.
 */
const EXTRA_CHUNK_WEIGHT = 0.35;
const EXTRA_CHUNK_DECAY = 0.5;
/**
 * A stub page (one templated line) can out-rank a real guide on a short query purely because its
 * single chunk is short and matches tightly. It is the right answer for "casa de cambio en Salto"
 * and the wrong one for "cómo funciona el IVA de importación", so it carries a handicap and only
 * wins when it wins clearly.
 */
const STUB_PENALTY = 0.82;

/** Spanish stopwords, plus the filler that Reddit questions are made of. */
const STOPWORDS = new Set(
  ("de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o este si porque esta " +
    "entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra otros " +
    "ese eso ante ellos e esto mi antes algunos qué unos yo otro otras otra él tanto esa estos mucho quienes nada " +
    "muchos cual poco ella estar estas algunas algo nosotros mi mis tu te ti tus ellas nosotras vosotros vosotras os " +
    "mio mia mios mias tuyo tuya suyo suya nuestro nuestra vuestro vuestra esos esas soy eres es somos sois son sea " +
    "ser fue era hola gracias saludos alguien sabe saben pregunta consulta ayuda favor buenas dia dias tema gente " +
    "che boludo bo tipo cosa cosas hacer hace hago voy va van quiero queria necesito puedo puede pueden")
    .split(/\s+/)
    .filter(Boolean)
);

/**
 * Normalise for the lexical arm: lowercase, strip accents, keep digits.
 *
 * Accent-stripping is not optional in this corpus — the site writes "Itaú", "línea", "crédito" and
 * Reddit writes "Itau", "linea", "credito". Matching them as different tokens throws away most of
 * the lexical arm's value in the exact cases (proper nouns) it exists to cover.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritics, left behind by NFD
    .replace(/[^a-z0-9ñ]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 2 && token.length < 30 && !STOPWORDS.has(token));
}

interface LexicalIndex {
  /** token → list of [chunk position, term frequency]. */
  postings: Map<string, Array<[number, number]>>;
  lengths: Float64Array;
  avgLength: number;
  docCount: number;
}

function buildLexical(chunks: readonly RagChunk[]): LexicalIndex {
  const postings = new Map<string, Array<[number, number]>>();
  const lengths = new Float64Array(chunks.length);
  let total = 0;

  chunks.forEach((chunk, i) => {
    // The heading path is indexed with the body: for a stub page it is nearly all the signal there
    // is, and for a deep section it carries the department / casa / topic name.
    const tokens = tokenize(`${chunk.headingPath} ${chunk.text}`);
    lengths[i] = tokens.length;
    total += tokens.length;
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    for (const [token, tf] of counts) {
      let list = postings.get(token);
      if (!list) postings.set(token, (list = []));
      list.push([i, tf]);
    }
  });

  return { postings, lengths, avgLength: chunks.length ? total / chunks.length : 0, docCount: chunks.length };
}

/** Okapi BM25. */
function bm25(index: LexicalIndex, queryTokens: readonly string[], k1 = 1.2, b = 0.75): Map<number, number> {
  const scores = new Map<number, number>();
  if (!index.docCount || !index.avgLength) return scores;

  for (const token of new Set(queryTokens)) {
    const list = index.postings.get(token);
    if (!list?.length) continue;
    const idf = Math.log(1 + (index.docCount - list.length + 0.5) / (list.length + 0.5));
    for (const [doc, tf] of list) {
      const norm = tf * (k1 + 1);
      const denom = tf + k1 * (1 - b + (b * index.lengths[doc]!) / index.avgLength);
      scores.set(doc, (scores.get(doc) ?? 0) + idf * (norm / denom));
    }
  }
  return scores;
}

/** Top-n positions of a score map, best first. */
function topN(scores: Map<number, number>, n: number): number[] {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([doc]) => doc);
}

/**
 * The loaded index, ready to answer queries.
 *
 * Built once per process. Cosine over ~5 400 chunks of 768 dims is ~4 M multiply-adds — under 10 ms
 * — so there is no approximate-nearest-neighbour structure here and there does not need to be one.
 */
export class SiteRetriever {
  private readonly lexical: LexicalIndex;

  constructor(private readonly chunks: readonly RagChunk[]) {
    this.lexical = buildLexical(chunks);
  }

  get size(): number {
    return this.chunks.length;
  }

  get pageCount(): number {
    return new Set(this.chunks.map((c) => c.path)).size;
  }

  /**
   * How many chunks can take part in the dense arm.
   *
   * Worth asking out loud, because zero is a state the rest of the pipeline cannot distinguish from
   * a quiet day: with no vectors every cosine is 0, the gate refuses everything, and the bot goes
   * silent exactly as if there were nothing to answer. That happened in production — a Buffer
   * decoded as a BSON Binary, see `bufferToVector` — and nothing anywhere said so.
   */
  get embeddedCount(): number {
    return this.chunks.reduce((n, chunk) => n + (chunk.vector.length ? 1 : 0), 0);
  }

  /**
   * Dense arm: cosine of every EMBEDDED chunk against an already-embedded query.
   *
   * Stub chunks have no vector on purpose (see sources.ts and the indexer's budget): a templated
   * one-line title is the case where dense retrieval adds least and lexical matching adds most —
   * "casa de cambio en Maldonado" is won by the word Maldonado, not by a subtle sense of meaning.
   * They still compete through BM25, so skipping them here costs recall on nothing.
   */
  private dense(queryVector: Float32Array): Map<number, number> {
    const scores = new Map<number, number>();
    this.chunks.forEach((chunk, i) => {
      if (chunk.vector.length) scores.set(i, cosine(queryVector, chunk.vector));
    });
    return scores;
  }

  /**
   * Rank pages for a question whose embedding the caller already has.
   *
   * Separated from {@link search} so a job that embeds a batch of questions in one API call (the
   * bot scores several Reddit posts per run) does not pay one round-trip per question.
   */
  rankWithVector(queryText: string, queryVector: Float32Array | null, limit = 5): RetrievedPage[] {
    if (!this.chunks.length) return [];

    const queryTokens = tokenize(queryText);
    const denseScores = queryVector ? this.dense(queryVector) : new Map<number, number>();
    const lexicalScores = bm25(this.lexical, queryTokens);

    const fused = new Map<number, number>();
    const contribute = (ranked: readonly number[]): void => {
      ranked.forEach((doc, rank) => fused.set(doc, (fused.get(doc) ?? 0) + 1 / (RRF_K + rank + 1)));
    };
    contribute(topN(denseScores, CANDIDATES_PER_ARM));
    contribute(topN(lexicalScores, CANDIDATES_PER_ARM));
    if (!fused.size) return [];

    // Chunks → pages.
    const byPage = new Map<string, ScoredChunk[]>();
    for (const [doc, score] of fused) {
      const chunk = this.chunks[doc]!;
      const scored: ScoredChunk = { chunk, score, cosine: denseScores.get(doc) ?? 0 };
      const list = byPage.get(chunk.path);
      if (list) list.push(scored);
      else byPage.set(chunk.path, [scored]);
    }

    const pages: RetrievedPage[] = [];
    for (const [path, scoredChunks] of byPage) {
      scoredChunks.sort((a, b) => b.score - a.score);
      let score = scoredChunks[0]!.score;
      for (let i = 1; i < scoredChunks.length; i++) {
        score += scoredChunks[i]!.score * EXTRA_CHUNK_WEIGHT * EXTRA_CHUNK_DECAY ** (i - 1);
      }
      const tier = scoredChunks[0]!.chunk.tier;
      if (tier === "stub") score *= STUB_PENALTY;
      pages.push({
        path,
        title: scoredChunks[0]!.chunk.title,
        tier,
        score,
        cosine: Math.max(...scoredChunks.map((c) => c.cosine)),
        chunks: scoredChunks.slice(0, 4),
      });
    }

    return pages.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /** Every page path in the index. Used to tell "not indexed yet" from "not relevant". */
  paths(): Set<string> {
    return new Set(this.chunks.map((chunk) => chunk.path));
  }

  /**
   * One specific page, scored against a query — regardless of whether it won the ranking.
   *
   * For the revisit pass: a page was written to answer this exact thread, so which page to link is
   * already decided and the only open question is which of its passages to quote. Going through the
   * ranking would risk linking a different page than the one the question caused to exist.
   */
  pageFor(path: string, queryVector: Float32Array | null, limit = 4): RetrievedPage | null {
    const chunks = this.chunks
      .map((chunk, i) => ({ chunk, i }))
      .filter((entry) => entry.chunk.path === path);
    if (!chunks.length) return null;

    const scored: ScoredChunk[] = chunks
      .map(({ chunk }) => ({
        chunk,
        score: 0,
        cosine: queryVector && chunk.vector.length ? cosine(queryVector, chunk.vector) : 0,
      }))
      .sort((a, b) => b.cosine - a.cosine);

    return {
      path,
      title: scored[0]!.chunk.title,
      tier: scored[0]!.chunk.tier,
      score: scored[0]!.cosine,
      cosine: scored[0]!.cosine,
      chunks: scored.slice(0, limit),
    };
  }

  /** Embed the question, then rank. `null` embedding degrades to the lexical arm alone. */
  async search(queryText: string, limit = 5): Promise<RetrievedPage[]> {
    const vector = await embedOne(queryText, "RETRIEVAL_QUERY");
    return this.rankWithVector(queryText, vector, limit);
  }
}

/** The retrieved text a composer/judge is allowed to use, capped so the prompt stays small. */
export function contextOf(pages: readonly RetrievedPage[], maxChars = 4500): string {
  const parts: string[] = [];
  let used = 0;
  for (const page of pages) {
    for (const scored of page.chunks) {
      const block = `[${page.path}] ${scored.chunk.headingPath}\n${scored.chunk.text}`;
      if (used + block.length > maxChars) return parts.join("\n\n---\n\n");
      parts.push(block);
      used += block.length;
    }
  }
  return parts.join("\n\n---\n\n");
}

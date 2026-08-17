// Read/write the RAG index in the app database (the Mongo on the deploy box).
//
// The write path is incremental by content hash. A daily recrawl of the whole site produces a few
// thousand chunks of which, on a normal day, single digits actually changed — re-embedding all of
// them would burn the quota and rewrite the collection for nothing. So: crawl always, embed only
// what changed, and delete only what the crawl proved is gone.

import { RagChunkModel, type RagChunkDoc } from "../models/RagChunk";
import { bufferToVector, EMBED_DIMS, EMBED_MODEL, embedTexts, vectorToBuffer } from "./embed";
import type { PageChunk } from "./chunk";
import type { RagChunk } from "./types";

/**
 * Everything in the index. One `find()`; the projection drops nothing we need.
 *
 * Two kinds of row come back: embedded chunks (`dims === EMBED_DIMS`) and lexical-only stubs
 * (`dims === 0`, empty vector). A row whose dims match NEITHER is a leftover from a previous model
 * or dimensionality setting — its vector is not comparable with today's, so it is dropped rather
 * than silently scored against a different space.
 */
export async function loadIndex(): Promise<RagChunk[]> {
  const docs = await RagChunkModel.find({ dims: { $in: [EMBED_DIMS, 0] } })
    .select({ path: 1, tier: 1, chunkIndex: 1, title: 1, headingPath: 1, text: 1, contentHash: 1, vector: 1, lastmod: 1 })
    .lean<RagChunkDoc[]>();

  const out: RagChunk[] = [];
  for (const doc of docs) {
    const vector = doc.vector ? bufferToVector(doc.vector as Buffer) : new Float32Array(0);
    if (vector.length && vector.length !== EMBED_DIMS) continue;
    out.push({
      path: doc.path,
      tier: (doc.tier as RagChunk["tier"]) ?? "full",
      chunkIndex: doc.chunkIndex ?? 0,
      title: doc.title ?? "",
      headingPath: doc.headingPath ?? "",
      text: doc.text ?? "",
      contentHash: doc.contentHash ?? "",
      vector,
      lastmod: doc.lastmod ?? "",
    });
  }
  return out;
}

/** `path` → `chunkIndex` → stored hash. Lets the indexer skip a page without loading its vectors. */
export async function loadHashes(): Promise<Map<string, Map<number, string>>> {
  const docs = await RagChunkModel.find({}).select({ path: 1, chunkIndex: 1, contentHash: 1 }).lean<RagChunkDoc[]>();
  const out = new Map<string, Map<number, string>>();
  for (const doc of docs) {
    let page = out.get(doc.path);
    if (!page) out.set(doc.path, (page = new Map()));
    page.set(doc.chunkIndex ?? 0, doc.contentHash ?? "");
  }
  return out;
}

export interface UpsertResult {
  embedded: number;
  reused: number;
  removed: number;
  failed: number;
  /** Chunks written without a vector because they are stub-tier (lexical-only by design). */
  lexicalOnly: number;
  /** Chunks left for a future run because today's embedding budget ran out. */
  deferred: number;
}

/**
 * The run's remaining embedding allowance, shared by every page.
 *
 * The Gemini embedding endpoint meters per DAY — measured on 2026-08-17 against the live API:
 * `EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier`, limit 1 000, and every item
 * inside a `batchEmbedContents` counts as one request. The whole corpus is ~3 400 embeddable
 * chunks, so a first build cannot finish in a day on the free tier no matter how it is paced.
 *
 * Rather than hammer the quota and lose the rest of the run to 429s, the indexer spends a budget
 * and stops. Everything it did not reach keeps its previous row (or stays absent) and is picked up
 * by tomorrow's run, which skips everything already hashed — so the index converges over a few
 * days and then costs almost nothing per day. Raise `RAG_EMBED_DAILY_BUDGET` once the project has
 * billing enabled for embeddings and the first build finishes in one pass.
 */
export interface EmbedBudget {
  remaining: number;
}

export interface EmbedPlan<T> {
  /** Stub-tier chunks: written now, never embedded. */
  lexicalOnly: T[];
  /** Chunks to embed in this run. */
  toEmbed: T[];
  /** Chunks the budget could not cover; they keep their old row and wait for the next run. */
  deferred: T[];
}

/**
 * Decide what this run can afford, before spending anything.
 *
 * Pure so the arithmetic is testable without a database and without an API — the failure it
 * prevents (spending the whole day's allowance on 1 900 templated stubs, leaving the guides
 * unembedded) is an off-by-a-category mistake, not a Mongo one.
 */
export function planEmbedding<T extends { tier: "full" | "stub" }>(
  stale: readonly T[],
  budget?: EmbedBudget
): EmbedPlan<T> {
  const lexicalOnly = stale.filter((chunk) => chunk.tier === "stub");
  const embeddable = stale.filter((chunk) => chunk.tier !== "stub");
  const affordable = budget ? Math.max(0, Math.min(embeddable.length, budget.remaining)) : embeddable.length;
  return {
    lexicalOnly,
    toEmbed: embeddable.slice(0, affordable),
    deferred: embeddable.slice(affordable),
  };
}

/**
 * Write one page's chunks, embedding only the ones whose hash changed.
 *
 * A chunk whose embedding call failed keeps its previous row untouched — a page half-indexed with
 * a mix of old and new slices still answers questions, whereas a page whose rows were deleted
 * before the new vectors arrived answers nothing until tomorrow.
 */
export async function upsertPageChunks(
  path: string,
  chunks: readonly PageChunk[],
  known: Map<number, string> | undefined,
  crawledAt: Date,
  budget?: EmbedBudget
): Promise<UpsertResult> {
  const result: UpsertResult = { embedded: 0, reused: 0, removed: 0, failed: 0, lexicalOnly: 0, deferred: 0 };
  const EMPTY = Buffer.alloc(0);

  const stale = chunks.filter((chunk) => known?.get(chunk.chunkIndex) !== chunk.contentHash);
  result.reused = chunks.length - stale.length;

  const write = (chunk: PageChunk, vector: Float32Array | null): any => ({
    updateOne: {
      filter: { path: chunk.path, chunkIndex: chunk.chunkIndex },
      update: {
        $set: {
          tier: chunk.tier,
          title: chunk.title,
          headingPath: chunk.headingPath,
          text: chunk.text,
          contentHash: chunk.contentHash,
          vector: vector ? vectorToBuffer(vector) : EMPTY,
          dims: vector ? vector.length : 0,
          model: vector ? EMBED_MODEL : "",
          lastmod: chunk.lastmod,
          crawledAt,
          embeddedAt: new Date(),
        },
      },
      upsert: true,
    },
  });

  // Stub chunks are stored immediately and never embedded: they are a templated title, which the
  // lexical arm matches better than the dense one anyway, and they are 40 % of the corpus.
  const plan = planEmbedding(stale, budget);
  const ops: any[] = plan.lexicalOnly.map((chunk) => write(chunk, null));
  result.lexicalOnly = plan.lexicalOnly.length;
  result.deferred = plan.deferred.length;

  if (plan.toEmbed.length) {
    if (budget) budget.remaining -= plan.toEmbed.length;
    const vectors = await embedTexts(
      plan.toEmbed.map((chunk) => chunk.embedInput),
      "RETRIEVAL_DOCUMENT"
    );
    plan.toEmbed.forEach((chunk, i) => {
      const vector = vectors[i];
      if (!vector) {
        result.failed++;
        return;
      }
      result.embedded++;
      ops.push(write(chunk, vector));
    });
  }

  if (ops.length) await RagChunkModel.bulkWrite(ops, { ordered: false });

  // The page got shorter: drop the tail rows that no longer exist. Only ever within this page, and
  // only after a successful crawl — a failed crawl never reaches here, so a temporarily unreachable
  // page keeps its whole index rather than being emptied.
  const del = await RagChunkModel.deleteMany({ path, chunkIndex: { $gte: chunks.length } });
  result.removed = del?.deletedCount ?? 0;

  // Touch the untouched rows so `crawledAt` reflects reality even when nothing changed. One update,
  // no vectors moved.
  if (result.reused) {
    await RagChunkModel.updateMany(
      { path, chunkIndex: { $lt: chunks.length } },
      { $set: { crawledAt, lastmod: chunks[0]?.lastmod ?? "" } }
    );
  }

  return result;
}

/**
 * Delete the index rows of pages the sitemap no longer lists.
 *
 * Guarded on purpose: if the sitemap fetch returned a suspiciously small list (a deploy mid-flight,
 * a 502 behind a 200), obeying it would wipe the index. Anything that would delete more than a
 * quarter of the known pages is refused and reported instead.
 */
export async function pruneMissing(livePaths: ReadonlySet<string>): Promise<{ removed: number; refused: boolean }> {
  const known: string[] = await RagChunkModel.distinct("path");
  const dead = known.filter((path) => !livePaths.has(path));
  if (!dead.length) return { removed: 0, refused: false };
  if (known.length && dead.length / known.length > 0.25) {
    console.warn(
      `[rag/store] refusing to prune ${dead.length} of ${known.length} pages — that is more than a quarter ` +
        `of the index and looks like a bad sitemap fetch, not a site that lost a quarter of its pages`
    );
    return { removed: 0, refused: true };
  }
  const del = await RagChunkModel.deleteMany({ path: { $in: dead } });
  return { removed: del?.deletedCount ?? 0, refused: false };
}

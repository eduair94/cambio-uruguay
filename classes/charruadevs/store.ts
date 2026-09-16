// Lecturas y escrituras del corpus en la base del APP.
import { CharruaSnapshotModel } from "../models/CharruaSnapshot";
import { CharruaTextModel } from "../models/CharruaText";
import type { LiveInfo } from "../reddit";
import type { AnalyzeRow, CharruaSnapshot } from "./analyze";
import type { FredPoint } from "./fred";
import type { CharruaText, HarvestState } from "./types";

const CHUNK = 1000;

export async function ensureIndexes(): Promise<void> {
  await CharruaTextModel.createIndexes();
  await CharruaSnapshotModel.createIndexes();
}

export async function upsertTexts(docs: CharruaText[]): Promise<number> {
  let n = 0;
  for (let i = 0; i < docs.length; i += CHUNK) {
    // El cast es por los tipos de mongoose 6, que no aceptan un `$set` con el documento entero
    // tipado; la forma es la de siempre (updateOne + upsert por clave única).
    const ops = docs.slice(i, i + CHUNK).map((d) => ({
      updateOne: { filter: { rid: d.rid }, update: { $set: d }, upsert: true },
    })) as unknown as Parameters<typeof CharruaTextModel.bulkWrite>[0];
    const res = await CharruaTextModel.bulkWrite(ops, { ordered: false });
    n += (res.upsertedCount || 0) + (res.modifiedCount || 0);
  }
  return n;
}

/**
 * Backfill de autores sobre textos ya guardados (`--authors`). El corpus se sembro sin autor y el
 * ranking lo necesita hacia atras; de aca en adelante lo escribe `upsertTexts`.
 */
export async function backfillAuthors(pairs: Array<{ rid: string; author: string }>): Promise<number> {
  let n = 0;
  for (let i = 0; i < pairs.length; i += CHUNK) {
    const ops = pairs.slice(i, i + CHUNK).map((p) => ({
      updateOne: { filter: { rid: p.rid }, update: { $set: { author: p.author } } },
    }));
    const res = await CharruaTextModel.bulkWrite(ops, { ordered: false });
    n += res.modifiedCount || 0;
  }
  return n;
}

export async function knownRids(rids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < rids.length; i += 5000) {
    const found = await CharruaTextModel.find({ rid: { $in: rids.slice(i, i + 5000) } }, { rid: 1, _id: 0 }).lean<
      Array<{ rid: string }>
    >();
    for (const f of found) out.add(f.rid);
  }
  return out;
}

export interface StoredThread {
  title: string;
  body: string;
  month: string;
  flair: string | null;
}

export async function threadInfo(threadIds: string[]): Promise<Map<string, StoredThread>> {
  const out = new Map<string, StoredThread>();
  for (let i = 0; i < threadIds.length; i += 5000) {
    const rids = threadIds.slice(i, i + 5000).map((t) => `t3_${t}`);
    const docs = await CharruaTextModel.find(
      { rid: { $in: rids } },
      { thread: 1, title: 1, body: 1, month: 1, flair: 1, _id: 0 }
    ).lean<Array<StoredThread & { thread: string }>>();
    for (const d of docs) out.set(d.thread, { title: d.title, body: d.body, month: d.month, flair: d.flair });
  }
  return out;
}

export async function recentRids(since: Date): Promise<string[]> {
  const docs = await CharruaTextModel.find({ createdAt: { $gte: since } }, { rid: 1, _id: 0 }).lean<Array<{ rid: string }>>();
  return docs.map((d) => d.rid);
}

export async function applyLive(live: Map<string, LiveInfo>): Promise<number> {
  const entries = [...live.entries()];
  let n = 0;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const ops = entries.slice(i, i + CHUNK).map(([rid, v]) => ({
      updateOne: {
        filter: { rid },
        update: { $set: { score: v.score, gone: v.gone, ...(v.numComments != null ? { comments: v.numComments } : {}) } },
      },
    }));
    const res = await CharruaTextModel.bulkWrite(ops, { ordered: false });
    n += res.modifiedCount || 0;
  }
  return n;
}

/** Todo el corpus sin los cuerpos: ~150k filas livianas para el análisis. */
export async function loadAnalyzeRows(): Promise<AnalyzeRow[]> {
  return CharruaTextModel.find({}, { body: 0, _id: 0, thread: 0, model: 0 }).lean<AnalyzeRow[]>();
}

export async function loadQuotePool(since: Date, limit = 600): Promise<CharruaText[]> {
  return CharruaTextModel.find(
    { kind: "comment", rel: true, gone: false, createdAt: { $gte: since }, stance: { $in: [-2, -1, 1, 2] } },
    { _id: 0 }
  )
    .sort({ score: -1 })
    .limit(limit)
    .lean<CharruaText[]>();
}

export async function storedTextCount(): Promise<number> {
  return CharruaTextModel.estimatedDocumentCount();
}

export async function loadState(): Promise<HarvestState | null> {
  const doc = await CharruaSnapshotModel.findOne({ key: "state" }).lean<{ data?: HarvestState }>();
  return doc?.data ?? null;
}

export async function saveState(state: HarvestState): Promise<void> {
  await CharruaSnapshotModel.updateOne(
    { key: "state" },
    { $set: { key: "state", generatedAt: new Date(), data: state } },
    { upsert: true }
  );
}

export async function storedSnapshotTexts(): Promise<number> {
  const doc = await CharruaSnapshotModel.findOne({ key: "snapshot" }, { "data.corpus.texts": 1 }).lean<{
    data?: { corpus?: { texts?: number } };
  }>();
  return doc?.data?.corpus?.texts ?? 0;
}

export async function loadStoredFred(): Promise<FredPoint[]> {
  const doc = await CharruaSnapshotModel.findOne({ key: "snapshot" }, { "data.fred": 1 }).lean<{
    data?: { fred?: FredPoint[] };
  }>();
  return doc?.data?.fred ?? [];
}

export async function saveSnapshot(snapshot: CharruaSnapshot): Promise<void> {
  await CharruaSnapshotModel.updateOne(
    { key: "snapshot" },
    { $set: { key: "snapshot", generatedAt: new Date(snapshot.generatedAt), data: snapshot } },
    { upsert: true }
  );
}

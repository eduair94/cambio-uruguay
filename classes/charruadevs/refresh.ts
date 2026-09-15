// Una corrida del termómetro. Modo diario: baja los DOS últimos meses completos de Arctic Shift,
// clasifica lo que no está en la base, recalcula esas filas mensuales, refresca votos y borrados de
// lo de los últimos 30 días y rehace el snapshot. Modo semilla (--seed <dir>): importa de una vez el
// corpus clasificado (texts.jsonl + state.json) y rehace el snapshot.
import fs from "fs";
import path from "path";
import { buildSnapshot } from "./analyze";
import { classifyComments, classifyPosts, CLASSIFIER_MODEL } from "./classify";
import { isCandidateComment, isGone, isMarketThread } from "./filter";
import { fetchFred } from "./fred";
import { fetchRange } from "./harvest";
import { lexCounts } from "./lexicon";
import { fetchInfoLive } from "../reddit";
import * as store from "./store";
import type { ThreadInfo } from "./rubric";
import type { ArcticComment, ArcticPost, CharruaText, HarvestState, Label, MonthRow } from "./types";
import { VALIDATION } from "./validation";

export interface RefreshReport {
  mode: "seed" | "daily";
  newPosts: number;
  newComments: number;
  classified: number;
  failed: number;
  live: number;
  texts: number;
  wrote: boolean;
  reason?: string;
}

const DAY = 86400000;
const ym = (t: number) => new Date(t * 1000).toISOString().slice(0, 7);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const threadOf = (c: { link_id?: string }) => (c.link_id || "").replace("t3_", "");

/** Un snapshot con 10 % menos de textos que el guardado es una corrida rota, no una noticia. */
export function isThin(texts: number, previous: number): boolean {
  return previous > 0 && texts < previous * 0.9;
}

function monthBounds(now: Date): { from: number; to: number; months: string[] } {
  const from = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1) / 1000;
  const to = Math.floor(now.getTime() / 1000) + 1;
  return { from, to, months: [ym(from), now.toISOString().slice(0, 7)] };
}

function postDoc(p: ArcticPost, k: Label): CharruaText {
  return {
    rid: `t3_${p.id}`,
    kind: "post",
    thread: p.id,
    title: p.title || "",
    body: isGone(p.selftext) ? "" : clip(p.selftext || "", 1500),
    createdAt: new Date(p.created_utc * 1000),
    month: ym(p.created_utc),
    score: p.score ?? 0,
    comments: p.num_comments ?? 0,
    flair: p.link_flair_text ?? null,
    rel: k.rel,
    stance: k.stance,
    themes: k.themes,
    ai: k.ai,
    event: k.event,
    persona: k.persona,
    gone: !!p.removed_by_category || p.title === "[deleted by user]",
    url: `https://www.reddit.com${p.permalink || `/r/CharruaDevs/comments/${p.id}/`}`,
    model: CLASSIFIER_MODEL,
  };
}

function commentDoc(c: ArcticComment, k: Label, threadTitle: string): CharruaText {
  const pid = threadOf(c);
  return {
    rid: `t1_${c.id}`,
    kind: "comment",
    thread: pid,
    title: threadTitle,
    body: clip((c.body || "").trim(), 1500),
    createdAt: new Date(c.created_utc * 1000),
    month: ym(c.created_utc),
    score: c.score ?? 0,
    rel: k.rel,
    stance: k.stance,
    themes: k.themes,
    ai: k.ai,
    event: k.event,
    gone: false,
    url: `https://www.reddit.com/r/CharruaDevs/comments/${pid}/_/${c.id}/`,
    model: CLASSIFIER_MODEL,
  };
}

async function importSeed(dir: string): Promise<{ texts: number; state: HarvestState }> {
  const state = JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8")) as HarvestState;
  const lines = fs.readFileSync(path.join(dir, "texts.jsonl"), "utf8").split("\n").filter(Boolean);
  let batch: CharruaText[] = [];
  let n = 0;
  for (const line of lines) {
    const d = JSON.parse(line) as Omit<CharruaText, "createdAt"> & { createdAt: string };
    batch.push({ ...d, createdAt: new Date(d.createdAt) });
    if (batch.length >= 5000) {
      n += await store.upsertTexts(batch);
      batch = [];
    }
  }
  if (batch.length) n += await store.upsertTexts(batch);
  return { texts: n, state: { months: state.months } };
}

async function daily(state: HarvestState, now: Date, report: RefreshReport): Promise<HarvestState> {
  const { from, to, months } = monthBounds(now);
  const posts = await fetchRange<ArcticPost>("posts", from, to);
  const comments = await fetchRange<ArcticComment>("comments", from, to);

  const known = await store.knownRids([...posts.map((p) => `t3_${p.id}`), ...comments.map((c) => `t1_${c.id}`)]);
  const newPosts = posts.filter((p) => !known.has(`t3_${p.id}`) && !(p.title === "[deleted by user]" && isGone(p.selftext)));
  report.newPosts = newPosts.length;
  const postLabels = newPosts.length ? await classifyPosts(newPosts) : new Map<string, Label>();

  // Hilos: los del período vienen en la cosecha; los viejos, de la base.
  const threads = new Map<string, ThreadInfo & { market: boolean }>();
  for (const p of posts) {
    threads.set(p.id, { title: p.title, month: ym(p.created_utc), flair: p.link_flair_text, market: isMarketThread(p.title, p.selftext) });
  }
  const missing = [...new Set(comments.map(threadOf))].filter((t) => !threads.has(t));
  const stored = missing.length ? await store.threadInfo(missing) : new Map();
  for (const [id, t] of stored) threads.set(id, { title: t.title, month: t.month, flair: t.flair, market: isMarketThread(t.title, t.body) });

  const candidates = comments.filter((c) => isCandidateComment({ body: c.body, author: c.author }, !!threads.get(threadOf(c))?.market));
  const newComments = candidates.filter((c) => !known.has(`t1_${c.id}`));
  report.newComments = newComments.length;
  const parents = new Map(comments.map((c) => [c.id, c.body]));
  const commentLabels = newComments.length ? await classifyComments(newComments, threads, parents) : new Map<string, Label>();

  const docs: CharruaText[] = [];
  for (const p of newPosts) {
    const k = postLabels.get(p.id);
    if (k) docs.push(postDoc(p, k));
  }
  for (const c of newComments) {
    const k = commentLabels.get(c.id);
    if (k) docs.push(commentDoc(c, k, threads.get(threadOf(c))?.title || ""));
  }
  report.classified = docs.length;
  report.failed = newPosts.length + newComments.length - docs.length;
  if (docs.length) await store.upsertTexts(docs);

  // Filas mensuales de los dos meses cosechados, recalculadas desde el mes completo. Un mes que
  // Arctic Shift devolvió vacío no pisa lo guardado: vacío es "no contestó", no "nadie escribió".
  const classifiedIds = new Set([...known, ...docs.map((d) => d.rid)]);
  const merged = new Map(state.months.map((r) => [r.m, r]));
  for (const m of months) {
    const mp = posts.filter((p) => ym(p.created_utc) === m);
    const mc = comments.filter((c) => ym(c.created_utc) === m);
    if (!mp.length && !mc.length && merged.has(m)) continue;
    const lex = lexCounts(mc.map((c) => c.body));
    const cand = candidates.filter((c) => ym(c.created_utc) === m);
    const row: MonthRow = {
      m,
      posts: mp.length,
      comments: mc.length,
      candidates: cand.length,
      classified: cand.filter((c) => classifiedIds.has(`t1_${c.id}`)).length,
      lex: lex.counts,
      lexN: lex.n,
    };
    merged.set(m, row);
  }

  // Votos y borrados de lo reciente: lo borrado hoy en Reddit deja de mostrarse.
  const recent = await store.recentRids(new Date(now.getTime() - 30 * DAY));
  const live = recent.length ? await fetchInfoLive(recent) : null;
  if (live) report.live = await store.applyLive(live);

  return { months: [...merged.values()].sort((a, b) => (a.m < b.m ? -1 : 1)), seededAt: state.seededAt, lastRunAt: now.toISOString() };
}

export async function runRefresh(opts: { seedDir?: string; now?: Date; dryRun?: boolean } = {}): Promise<RefreshReport> {
  const now = opts.now ?? new Date();
  const report: RefreshReport = {
    mode: opts.seedDir ? "seed" : "daily",
    newPosts: 0,
    newComments: 0,
    classified: 0,
    failed: 0,
    live: 0,
    texts: 0,
    wrote: false,
  };
  await store.ensureIndexes();

  let state: HarvestState;
  if (opts.seedDir) {
    const seeded = await importSeed(opts.seedDir);
    state = { ...seeded.state, seededAt: now.toISOString() };
    report.classified = seeded.texts;
  } else {
    const stored = await store.loadState();
    if (!stored) throw new Error("sin estado en charruadevssnapshots: sembrar primero con --seed <dir>");
    state = await daily(stored, now, report);
  }

  const [rows, quotePool, previous, freshFred] = await Promise.all([
    store.loadAnalyzeRows(),
    store.loadQuotePool(new Date(now.getTime() - 365 * DAY)),
    store.storedSnapshotTexts(),
    fetchFred(),
  ]);
  const fred = freshFred ?? (await store.loadStoredFred());
  const snapshot = buildSnapshot({ rows, months: state.months, quotePool, fred, validation: VALIDATION, now, model: CLASSIFIER_MODEL });
  report.texts = snapshot.corpus.texts;

  if (opts.dryRun) {
    report.reason = "dry-run";
    return report;
  }
  await store.saveState(state);
  if (isThin(snapshot.corpus.texts, previous)) {
    report.reason = `corrida flaca: ${snapshot.corpus.texts} textos contra ${previous} guardados`;
    return report;
  }
  await store.saveSnapshot(snapshot);
  report.wrote = true;
  return report;
}

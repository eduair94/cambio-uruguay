// Una corrida de la cola de /oportunidades-reddit (pm2 `currency-reddit-opportunities`, diario).
//
// En orden, y cada paso barato antes que el caro:
//   1. leer `/new` de cada sub hasta 30 días atrás;
//   2. refrescar votos, comentarios, cerrado y borrado de lo que ya está en la base, y preguntar por
//      `/api/info` por los recomendados que el listado no trajo (borrados, o fuera del tope de 1000);
//   3. filtrar y armar candidatas de los hilos NUEVOS (sin red);
//   4. juzgar lo nuevo de a lotes, lo más reciente primero, hasta el presupuesto;
//   5. leer los comentarios de los recomendados para saber si alguien ya enlazó el sitio;
//   6. releer, con el token anónimo, los comentarios que una persona marcó como respuesta;
//   7. reordenar, podar lo de más de 35 días y guardar la meta.
//
// Todo lo que sale a la red entra por `deps`, así el test corre la corrida entera sin Reddit, sin
// Gemini y sin Mongo.
import type { RedditPostRaw } from "../reddit";
import type { OppsSubStat } from "../models/RedditOpportunityMeta";
import { candidatesFor, type LexicalRetriever } from "./candidates";
import { JUDGE_BATCH, MIN_CONFIDENCE, type JudgeItem, type Verdict } from "./judge";
import { screenForOpportunity } from "./screen";
import type { OppsStore, SaveRow } from "./store";
import { OPPS_PRUNE_DAYS, OPPS_WINDOW_DAYS } from "./subs";
import { decodeEntities } from "./text";

const DAY_MS = 86_400_000;
const SITE_LINK = /cambio-?uruguay\.com|cambio-uruguay/i;

export interface OppsDeps {
  subs: readonly string[];
  fetchSub(sub: string, sinceUtcSeconds: number): Promise<RedditPostRaw[]>;
  /** `null` cuando la API no contestó: no es lo mismo que "se borraron todos". */
  fetchByIds(ids: readonly string[]): Promise<RedditPostRaw[] | null>;
  fetchCommentBodies(sub: string, postId: string): Promise<string[]>;
  /** fullname `t1_…` → visible; `null` cuando la API no contestó. */
  fetchCommentsVisible(fullnames: readonly string[]): Promise<Map<string, boolean> | null>;
  judge(items: readonly JudgeItem[]): Promise<Map<string, Verdict> | null>;
  retriever: LexicalRetriever | null;
  store: OppsStore;
  model: string;
}

export interface OppsRunOptions {
  now?: number;
  /** Hilos nuevos que se juzgan por corrida. El primer día son cientos; después, decenas. */
  judgeMax?: number;
  linkCheckMax?: number;
  answerCheckMax?: number;
  dryRun?: boolean;
}

export interface OppsNewItem {
  sub: string;
  title: string;
  path: string;
  confidence: number;
  reason: string;
}

export interface OppsRunSummary {
  fetched: number;
  perSub: OppsSubStat[];
  screened: number;
  candidates: number;
  judged: number;
  recommended: number;
  judgeFailures: number;
  linkChecked: number;
  answersChecked: number;
  markedRemoved: number;
  pruned: number;
  pending: number;
  notes: string[];
  newRecommended: OppsNewItem[];
  aborted: boolean;
  /** Había hilos para juzgar y no salió ningún veredicto: el juez está caído. */
  judgeDown: boolean;
}

/** El id de comentario de un enlace a un comentario de Reddit, o `null`. */
export function commentIdOf(url: string): string | null {
  // `/comments/<hilo>/<slug>/<comentario>/` o `/comments/<hilo>/comment/<comentario>/`. El enlace
  // al hilo solo (`/comments/<hilo>/<slug>/`) no es un comentario y no tiene que parecerlo.
  const m = /reddit\.com\/r\/[^/]+\/comments\/[a-z0-9]+\/(?:comment\/|[^/]+\/)([a-z0-9]{4,12})\/?(?:[?#]|$)/i.exec(url.trim());
  return m ? m[1]!.toLowerCase() : null;
}

function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export async function refreshRedditOpportunities(deps: OppsDeps, opts: OppsRunOptions = {}): Promise<OppsRunSummary> {
  const now = opts.now ?? Date.now();
  const nowDate = new Date(now);
  const dryRun = Boolean(opts.dryRun);
  const judgeMax = opts.judgeMax ?? 600;
  const linkCheckMax = opts.linkCheckMax ?? 200;
  const answerCheckMax = opts.answerCheckMax ?? 50;
  const windowStart = new Date(now - OPPS_WINDOW_DAYS * DAY_MS);
  const store = deps.store;

  const summary: OppsRunSummary = {
    fetched: 0,
    perSub: [],
    screened: 0,
    candidates: 0,
    judged: 0,
    recommended: 0,
    judgeFailures: 0,
    linkChecked: 0,
    answersChecked: 0,
    markedRemoved: 0,
    pruned: 0,
    pending: 0,
    notes: [],
    newRecommended: [],
    aborted: false,
    judgeDown: false,
  };

  // 1. Leer.
  const byId = new Map<string, RedditPostRaw>();
  const statOf = new Map<string, OppsSubStat>();
  for (const sub of deps.subs) {
    const posts = await deps.fetchSub(sub, Math.floor(windowStart.getTime() / 1000));
    const stat: OppsSubStat = { sub, fetched: posts.length, candidates: 0, judged: 0, recommended: 0 };
    summary.perSub.push(stat);
    statOf.set(sub.toLowerCase(), stat);
    if (!posts.length) summary.notes.push(`r/${sub} no devolvió hilos`);
    for (const p of posts) byId.set(p.id, p);
  }
  const all = [...byId.values()];
  summary.fetched = all.length;
  // Reddit caído o sin credenciales: no hay nada que decidir, y podar o pisar la meta con ceros
  // haría que la página diga "no hay oportunidades" cuando lo que no hay es Reddit.
  if (!all.length) {
    summary.aborted = true;
    summary.notes.push("ningún sub devolvió hilos: Reddit caído o sin credenciales");
    return summary;
  }
  const stat = (sub: string): OppsSubStat | undefined => statOf.get(sub.toLowerCase());

  // 2. Refrescar lo conocido.
  const known = await store.knownIds(all.map((p) => p.id));
  if (!dryRun) await store.refreshLive(all.filter((p) => known.has(p.id)), nowDate);
  const unseen = (await store.openRecommendedIds(windowStart)).filter((id) => !byId.has(id));
  if (unseen.length) {
    const live = await deps.fetchByIds(unseen);
    if (live) {
      if (!dryRun) await store.refreshLive(live, nowDate);
      const back = new Set(live.map((p) => p.id));
      const gone = unseen.filter((id) => !back.has(id));
      if (!dryRun) summary.markedRemoved = await store.markRemoved(gone);
    } else {
      summary.notes.push("/api/info no contestó: los recomendados fuera del listado quedan como estaban");
    }
  }

  // 3. Filtrar y armar candidatas.
  const queue: JudgeItem[] = [];
  for (const post of all) {
    if (known.has(post.id)) continue;
    if (!screenForOpportunity(post).ok) continue;
    summary.screened++;
    const candidates = candidatesFor(post, deps.retriever);
    if (!candidates.length) continue;
    queue.push({ post, candidates });
    const s = stat(post.sub);
    if (s) s.candidates++;
  }
  summary.candidates = queue.length;
  if (!deps.retriever) summary.notes.push("índice RAG no disponible: candidatas sólo por reglas de intención");

  // 4. Juzgar, lo más nuevo primero: si el presupuesto corta, que corte lo viejo.
  queue.sort((a, b) => b.post.createdUtc - a.post.createdUtc);
  const toJudge = queue.slice(0, judgeMax);
  if (queue.length > toJudge.length) {
    summary.notes.push(`${queue.length - toJudge.length} hilos quedaron para la próxima corrida (tope del juez)`);
  }
  for (const batch of chunk(toJudge, JUDGE_BATCH)) {
    const verdicts = await deps.judge(batch);
    if (!verdicts) {
      summary.judgeFailures++;
      continue;
    }
    const rows: SaveRow[] = [];
    for (const item of batch) {
      const verdict = verdicts.get(item.post.id);
      if (!verdict) continue;
      rows.push({ post: item.post, verdict, candidate: item.candidates.find((c) => c.path === verdict.path) ?? null });
      const s = stat(item.post.sub);
      if (s) s.judged++;
      if (verdict.recommend && verdict.confidence >= MIN_CONFIDENCE) {
        summary.recommended++;
        if (s) s.recommended++;
        summary.newRecommended.push({
          sub: item.post.sub,
          title: decodeEntities(item.post.title),
          path: verdict.path ?? "",
          confidence: verdict.confidence,
          reason: verdict.reason,
        });
      }
    }
    summary.judged += rows.length;
    if (!dryRun) await store.saveVerdicts(rows, deps.model, nowDate);
  }
  if (summary.judgeFailures) summary.notes.push(`${summary.judgeFailures} lotes del juez fallaron; se reintentan mañana`);
  // Todos los lotes fallaron: sin clave, sin cuota o un modelo que ya no existe. La cola deja de
  // crecer sin que la página lo note, así que la corrida termina como fallida (ver el entrypoint).
  summary.judgeDown = summary.judgeFailures > 0 && summary.judged === 0;

  if (dryRun) return summary;

  // 5. ¿Alguien ya enlazó el sitio en los comentarios?
  for (const item of await store.linkCheckQueue(linkCheckMax)) {
    const bodies = await deps.fetchCommentBodies(item.sub, item.postId);
    // Cero comentarios leídos en un hilo que dice tener comentarios no es un "no": o la API no
    // contestó, o están todos borrados (Reddit los cuenta igual). Se anota "no se pudo saber" con
    // la cantidad, así se vuelve a mirar sólo si el hilo gana comentarios.
    const linked = !bodies.length && item.numComments > 0 ? null : bodies.some((b) => SITE_LINK.test(b));
    await store.markLinkChecked(item.postId, linked, item.numComments, nowDate);
    summary.linkChecked++;
  }

  // 6. ¿Se ve la respuesta que alguien marcó? Con el token anónimo, que es lo que ve cualquiera.
  const answers = await store.answerCheckQueue(answerCheckMax, nowDate);
  const withId = answers.map((a) => ({ ...a, id: commentIdOf(a.answerUrl) }));
  for (const a of withId.filter((x) => !x.id)) await store.markAnswerChecked(a.postId, a.answerUrl, null, nowDate);
  const readable = withId.filter((x) => x.id);
  if (readable.length) {
    const visible = await deps.fetchCommentsVisible(readable.map((x) => `t1_${x.id}`));
    if (visible) {
      for (const a of readable) {
        await store.markAnswerChecked(a.postId, a.answerUrl, visible.get(`t1_${a.id}`) ?? false, nowDate);
        summary.answersChecked++;
      }
    }
  }

  // 7. Orden, poda y meta.
  await store.rerank(now);
  summary.pruned = await store.prune(new Date(now - OPPS_PRUNE_DAYS * DAY_MS));
  summary.pending = await store.countPending(windowStart);
  await store.saveMeta({
    asOf: nowDate,
    windowDays: OPPS_WINDOW_DAYS,
    subs: summary.perSub,
    judged: summary.judged,
    judgeFailures: summary.judgeFailures,
    recommendedTotal: summary.pending,
    notes: summary.notes,
  });
  return summary;
}

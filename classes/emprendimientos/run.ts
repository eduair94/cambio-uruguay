// Una corrida de `currency-emprendimientos`: descubrir → leer → clasificar → decidir → bola de
// nieve → fichas públicas → meta. Todo lo que habla con afuera entra por `RunDeps`, así la corrida
// entera se prueba sin red (tests/emprendimientos/run.test.ts).
import { classifyAccounts, needsClassification, type ClassifyInput } from "./classify";
import { decide, schedule } from "./decide";
import { mentionsIn } from "./handles";
import type { ProfileReader, ReadResults } from "./instagram";
import { LISTING_MAX_AGE_DAYS, publicListing, signedUrlExpiry } from "./listing";
import { SEEDS } from "./seeds";
import type { RedditPlan, RedditResult } from "./sources/reddit";
import { parseUeDetail, type UeCard, type UeFetcher, UE_BASE } from "./sources/uruguayEmprendedor";
import type { CandidateRow, EmprendimientoStore } from "./store";
import type { Candidate, Classification, EmprendimientoListing, EmprendimientoMeta, MetaState, ProfileRead, RunSummary, SourceRef, SourceStatus } from "./types";
import { uruguayEvidence } from "./uruguay";

const DAY = 86_400_000;

export interface RunOptions {
  maxReads: number;
  gapMs: number;
  readBudgetMs: number;
  /** Cuántas fichas de Uruguay Emprendedor se leen por corrida (de la cola del último listado). */
  ueDetailsPerRun: number;
  /** Cuántas cuentas nuevas puede sumar la bola de nieve por corrida. */
  maxSnowball: number;
  /** Cuántas cuentas sin clasificar de corridas anteriores se reintentan. */
  classifyBacklog: number;
  redditEveryHours: number;
  ueListEveryDays: number;
  /** Pausa entre fichas de Uruguay Emprendedor (HTTP plano). */
  ueGapMs: number;
  /** Cuántas búsquedas web (Gemini) por corrida. */
  webQueriesPerRun: number;
  /** Cuántos textos de posts de curadoras se leen por corrida, después de los perfiles. */
  maxPostReads: number;
  proxy: string | null;
}

// 50 lecturas de perfil por corrida, cada dos horas (~25 por hora, ~500 por día). El límite de
// Instagram para una IP sin sesión, medido el 23/11/2026: 45 lecturas de producción, una prueba de
// 125 una hora después y, en la corrida siguiente, a las 29 lecturas el perfil empezó a volver al
// login con `is_from_rle` — unas 200 en hora y media. 119 seguidas en una ráfaga sí entraron: el
// tope es por ventana, no por ráfaga. Los posts siguieron leyéndose con la IP limitada.
export const DEFAULT_OPTIONS: RunOptions = {
  maxReads: 50,
  gapMs: 4_000,
  readBudgetMs: 10 * 60_000,
  ueDetailsPerRun: 80,
  maxSnowball: 300,
  classifyBacklog: 60,
  redditEveryHours: 20,
  ueListEveryDays: 7,
  ueGapMs: 1_500,
  webQueriesPerRun: 12,
  // Poco: en las curadoras medidas el 23/11/2026 un post nombra 0,3 cuentas en promedio (las
  // tiendas colectivas no etiquetan a sus marcas); las ferias que listan expositores rinden más.
  maxPostReads: 10,
  proxy: null,
};

export interface RunDeps {
  now: Date;
  store: EmprendimientoStore;
  readProfiles: ProfileReader;
  classify?: (inputs: readonly ClassifyInput[]) => Promise<Map<string, Classification>>;
  reddit?: ((plan: RedditPlan) => Promise<RedditResult>) | null;
  ueListings?: (() => Promise<{ cards: UeCard[]; pages: number; failed: number }>) | null;
  ueFetch?: UeFetcher | null;
  /** Búsquedas web desde `cursor` (sources/web.ts). */
  web?: ((cursor: number, count: number, day: string) => Promise<{ finds: { handle: string; source: SourceRef }[]; cursor: number; asked: number; answered: number }>) | null;
  options?: Partial<RunOptions>;
  log?: (line: string) => void;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Los posts de curadoras cuyo texto todavía no se leyó, repartidos entre ellas (uno de cada una por
 * vuelta) hasta `limit`: así una feria con 12 posts no se lleva todas las lecturas de la corrida.
 */
export function postsToMine(curators: readonly CandidateRow[], limit: number): { code: string; owner: string }[] {
  const queues = curators.map(row => {
    const mined = new Set(row.minedCodes ?? []);
    const profile = row.profile;
    return profile ? profile.posts.filter(post => post.owner === profile.handle && !mined.has(post.code)).map(post => ({ code: post.code, owner: profile.handle })) : [];
  });
  const out: { code: string; owner: string }[] = [];
  for (let round = 0; out.length < limit && queues.some(queue => queue.length > round); round++) {
    for (const queue of queues) {
      if (out.length >= limit) break;
      if (queue[round]) out.push(queue[round]!);
    }
  }
  return out;
}

export interface RunResult {
  summary: RunSummary;
  /** true si Instagram no devolvió perfiles: el job sale con 1. */
  instagramClosed: boolean;
  listings: EmprendimientoListing[];
  touched: CandidateRow[];
}

/** El día de Montevideo (UTC−3, sin horario de verano desde 2015). */
export const uyDay = (date: Date): string => new Date(date.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);

const emptyState = (): MetaState => ({ redditThreads: {}, ueRead: {}, ueQueue: [] });

function sameSource(a: SourceRef, b: SourceRef): boolean {
  return a.kind === b.kind && (a.url ?? "") === (b.url ?? "") && (a.via ?? "") === (b.via ?? "");
}

/** Una cuenta nueva, todavía sin leer. */
export function newCandidate(handle: string, source: SourceRef, now: Date): CandidateRow {
  const row: CandidateRow = {
    handle,
    state: "pendiente",
    reason: "todavía sin leer",
    sources: [source],
    firstSeenAt: now.toISOString(),
    profile: null,
    lastReadAt: null,
    lastReadStatus: null,
    unreadableStreak: 0,
    goneStreak: 0,
    classification: null,
    listedAt: null,
    dueAt: now,
    priority: 9,
  };
  return { ...row, ...schedule(row, null, now) };
}

/** Las fotos firmadas de la última lectura buena: la primera que vence. */
export function profileExpiry(profile: ProfileRead | null): number | null {
  if (!profile) return null;
  const urls = [profile.profilePic, ...profile.posts.filter(post => post.owner === profile.handle).map(post => post.image)];
  const ms = urls.map(signedUrlExpiry).filter((value): value is number => value !== null);
  return ms.length ? Math.min(...ms) : null;
}

/**
 * Suma lo descubierto: crea las cuentas nuevas y agrega la fuente a las que ya estaban. Devuelve
 * las filas cambiadas y cuántas son nuevas. Una cuenta que pidió la baja no vuelve a entrar.
 */
export async function mergeFinds(store: EmprendimientoStore, finds: readonly { handle: string; source: SourceRef }[], optOuts: ReadonlySet<string>, now: Date, limitNew = Infinity): Promise<{ rows: CandidateRow[]; created: number }> {
  const byHandle = new Map<string, SourceRef[]>();
  for (const find of finds) {
    if (optOuts.has(find.handle)) continue;
    const list = byHandle.get(find.handle) ?? [];
    if (!list.some(source => sameSource(source, find.source))) list.push(find.source);
    byHandle.set(find.handle, list);
  }
  if (!byHandle.size) return { rows: [], created: 0 };
  const existing = await store.loadCandidates([...byHandle.keys()]);
  const rows: CandidateRow[] = [];
  let created = 0;
  for (const [handle, sources] of byHandle) {
    const row = existing.get(handle);
    if (!row) {
      if (created >= limitNew) continue;
      const fresh = newCandidate(handle, sources[0]!, now);
      for (const source of sources.slice(1)) fresh.sources.push(source);
      Object.assign(fresh, schedule(fresh, null, now));
      rows.push(fresh);
      created++;
      continue;
    }
    const added = sources.filter(source => !row.sources.some(old => sameSource(old, source)));
    if (!added.length) continue;
    row.sources = [...row.sources, ...added].slice(0, 12);
    // Una fuente mejor adelanta a una cuenta que todavía no se leyó.
    if (!row.lastReadAt) Object.assign(row, schedule(row, null, now));
    rows.push(row);
  }
  await store.saveCandidates(rows);
  return { rows, created };
}

/** Las cuentas que una lectura nombra: dueños de colaboraciones y @menciones de la bio. */
export function snowballHandles(profile: ProfileRead): { handle: string; kind: "colaboracion" | "mencion" }[] {
  const out: { handle: string; kind: "colaboracion" | "mencion" }[] = [];
  for (const post of profile.posts) if (post.owner !== profile.handle && !out.some(o => o.handle === post.owner)) out.push({ handle: post.owner, kind: "colaboracion" });
  for (const handle of mentionsIn(profile.biography)) if (handle !== profile.handle && !out.some(o => o.handle === handle)) out.push({ handle, kind: "mencion" });
  return out;
}

export async function runOnce(deps: RunDeps): Promise<RunResult> {
  const options = { ...DEFAULT_OPTIONS, ...(deps.options ?? {}) };
  const { now, store } = deps;
  const pause = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const log = deps.log ?? (() => undefined);
  const day = uyDay(now);
  const previous = await store.loadMeta();
  const state: MetaState = { ...emptyState(), ...(previous?.state ?? {}) };
  const sources: Record<string, SourceStatus> = { ...(previous?.sources ?? {}) };
  const optOuts = await store.loadOptOuts();
  const notes: string[] = [];
  let discovered = 0;

  // --- 1. Descubrir ---------------------------------------------------------------------------
  const seedFinds = SEEDS.map(seed => ({ handle: seed.handle, source: { ...seed.source, day } as SourceRef }));
  discovered += (await mergeFinds(store, seedFinds, optOuts, now)).created;

  const suggestions = await store.pendingSuggestions(50);
  if (suggestions.length) {
    const merged = await mergeFinds(store, suggestions.map(s => ({ handle: s.handle, source: { kind: "sugerencia", day } as SourceRef })), optOuts, now);
    discovered += merged.created;
    await store.markSuggestions(suggestions.map(s => s.id), now);
    log(`sugerencias: ${suggestions.length} (${merged.created} nuevas)`);
  }

  const redditAt = sources.reddit?.at ? Date.parse(sources.reddit.at) : 0;
  if (deps.reddit && now.getTime() - redditAt >= options.redditEveryHours * 3_600_000) {
    const reddit = await deps.reddit({ day, threadsSeen: state.redditThreads, maxThreads: 15, window: redditAt ? "month" : "all" });
    if (reddit.ok) {
      state.redditThreads = { ...state.redditThreads, ...reddit.threadsRead };
      const merged = await mergeFinds(store, reddit.finds, optOuts, now);
      discovered += merged.created;
      sources.reddit = { at: now.toISOString(), found: reddit.finds.length, note: `${reddit.posts} hilos, ${Object.keys(reddit.threadsRead).length} leídos` };
      log(`reddit: ${reddit.posts} hilos, ${reddit.finds.length} cuentas (${merged.created} nuevas)`);
    } else {
      sources.reddit = { ...(sources.reddit ?? { at: null, found: 0 }), note: "Reddit no contestó" };
      notes.push("reddit no contestó");
    }
  }

  const ueListAt = sources["uruguay-emprendedor"]?.at ? Date.parse(sources["uruguay-emprendedor"].at) : 0;
  if (deps.ueListings && now.getTime() - ueListAt >= options.ueListEveryDays * DAY) {
    const list = await deps.ueListings();
    if (list.cards.length && list.failed * 2 < list.pages) {
      state.ueQueue = list.cards.filter(card => !state.ueRead[card.slug]).map(card => ({ slug: card.slug, departamento: card.departamento, name: card.name }));
      sources["uruguay-emprendedor"] = { at: now.toISOString(), found: list.cards.length, note: `${list.pages} páginas, ${state.ueQueue.length} fichas por leer` };
      log(`uruguay emprendedor: ${list.cards.length} fichas en ${list.pages} páginas`);
    } else {
      notes.push(`uruguay emprendedor: ${list.failed} de ${list.pages} páginas fallaron`);
    }
  }
  if (deps.ueFetch && state.ueQueue.length) {
    const batch = state.ueQueue.slice(0, options.ueDetailsPerRun);
    const finds: { handle: string; source: SourceRef }[] = [];
    const done: string[] = [];
    for (const [index, card] of batch.entries()) {
      if (index) await pause(options.ueGapMs);
      const url = `${UE_BASE}/emprendimiento/${card.slug}/`;
      const html = await deps.ueFetch(url);
      if (!html) continue;
      done.push(card.slug);
      state.ueRead[card.slug] = day;
      const detail = parseUeDetail(html, card.slug);
      if (detail.handle) {
        finds.push({ handle: detail.handle, source: { kind: "uruguay-emprendedor", day, url, label: detail.name || card.name, departamentoHint: card.departamento || null, text: detail.text || null } });
      }
    }
    state.ueQueue = state.ueQueue.filter(card => !done.includes(card.slug));
    const merged = await mergeFinds(store, finds, optOuts, now);
    discovered += merged.created;
    log(`uruguay emprendedor: ${done.length} fichas leídas, ${finds.length} con Instagram (${merged.created} nuevas)`);
  }

  if (deps.web && options.webQueriesPerRun > 0) {
    const web = await deps.web(state.webCursor ?? 0, options.webQueriesPerRun, day);
    state.webCursor = web.cursor;
    if (web.answered) {
      const merged = await mergeFinds(store, web.finds, optOuts, now);
      discovered += merged.created;
      sources.web = { at: now.toISOString(), found: web.finds.length, note: `${web.answered} de ${web.asked} búsquedas contestaron` };
      log(`web: ${web.answered} de ${web.asked} búsquedas, ${web.finds.length} cuentas (${merged.created} nuevas)`);
    } else {
      sources.web = { ...(sources.web ?? { at: null, found: 0 }), note: "las búsquedas no contestaron" };
      notes.push("búsqueda web no contestó");
    }
  }

  // --- 2. Leer --------------------------------------------------------------------------------
  // Perfiles primero; después, en el mismo Chrome, el texto de posts de curadoras (ferias, tiendas
  // colectivas, redes): cada uno etiqueta a varias marcas, y es la bola de nieve que más rinde.
  const due = (await store.dueCandidates(now, options.maxReads)).filter(row => !optOuts.has(row.handle));
  const curators = options.maxPostReads > 0 ? await store.curators(40) : [];
  const mining = postsToMine(curators, options.maxPostReads);
  const reads: ReadResults =
    due.length || mining.length
      ? await deps.readProfiles({
          handles: due.map(row => row.handle),
          gapMs: options.gapMs,
          budgetMs: options.readBudgetMs,
          proxy: options.proxy,
          stopAfterBlankStart: 5,
          postCodes: mining.map(post => post.code),
        })
      : { reads: new Map(), launched: false, closed: false, note: null };
  if (reads.note) notes.push(reads.note);
  const attempted = reads.reads.size;
  const okCount = [...reads.reads.values()].filter(read => read.status === "ok").length;
  const answered = [...reads.reads.values()].filter(read => read.status !== "unreadable").length;
  // Una racha de "no se pudo leer" sólo cuenta en corridas donde Instagram contestó a la mayoría y
  // no empezó a limitar: las lecturas del final de una corrida limitada no dicen nada de la cuenta.
  const healthy = attempted > 0 && answered * 2 >= attempted && !reads.limited;
  log(`instagram: ${attempted} lecturas, ${okCount} perfiles${reads.closed ? " — CERRADO" : reads.limited ? " — LIMITADO" : ""}`);

  const touched = new Map<string, CandidateRow>();
  for (const row of due) {
    const read = reads.reads.get(row.handle);
    if (!read) continue;
    row.lastReadAt = read.readAt;
    row.lastReadStatus = read.status;
    if (read.status === "ok") {
      row.profile = read;
      row.unreadableStreak = 0;
      row.goneStreak = 0;
    } else if (read.status === "missing" || read.status === "private") {
      row.goneStreak += 1;
      row.unreadableStreak = 0;
    } else if (healthy) {
      row.unreadableStreak += 1;
    }
    touched.set(row.handle, row);
  }

  // --- 3. Clasificar --------------------------------------------------------------------------
  const backlog = await store.unclassified(options.classifyBacklog);
  for (const row of backlog) if (!touched.has(row.handle) && !optOuts.has(row.handle)) touched.set(row.handle, row);
  const toClassify = [...touched.values()].filter(row => row.profile?.status === "ok" && (reads.reads.get(row.handle)?.status === "ok" || !row.classification) && needsClassification(row.classification, row.profile, now));
  const classify = deps.classify ?? (inputs => classifyAccounts(inputs));
  const classified = toClassify.length ? await classify(toClassify.map(row => ({ profile: row.profile!, sources: row.sources }))) : new Map<string, Classification>();
  for (const [handle, classification] of classified) {
    const row = touched.get(handle);
    if (row) row.classification = classification;
  }
  if (toClassify.length && !classified.size) notes.push(`la clasificación no contestó (${toClassify.length} cuentas esperan)`);
  log(`clasificación: ${classified.size} de ${toClassify.length}`);

  // --- 4. Decidir y agendar --------------------------------------------------------------------
  const evidenceOf = new Map<string, ReturnType<typeof uruguayEvidence>>();
  let listedNow = 0;
  let unlistedNow = 0;
  for (const row of touched.values()) {
    if (optOuts.has(row.handle)) row.state = "baja";
    const before = row.state;
    const decision = decide(row, row.lastReadStatus === "ok" || !row.lastReadStatus ? row.profile : { ...(row.profile ?? ({} as ProfileRead)), status: row.lastReadStatus }, row.classification, now);
    // Una publicada que lleva diez lecturas sin perfil deja de mostrarse (sus fotos ya vencieron).
    if (decision.state === "publicada" || before === "publicada") {
      if (row.unreadableStreak >= 10) {
        decision.state = "pendiente";
        decision.reason = "diez lecturas seguidas sin perfil";
      }
    }
    row.state = decision.state;
    row.reason = decision.reason;
    if (decision.evidence) evidenceOf.set(row.handle, decision.evidence);
    if (row.state === "publicada" && !row.listedAt) row.listedAt = now.toISOString();
    if (row.state === "publicada" && before !== "publicada") listedNow++;
    if (before === "publicada" && row.state !== "publicada") unlistedNow++;
    Object.assign(row, schedule(row, profileExpiry(row.profile), now));
  }
  await store.saveCandidates([...touched.values()]);

  // --- 5. Bola de nieve -------------------------------------------------------------------------
  const snow: { handle: string; source: SourceRef }[] = [];
  for (const row of touched.values()) {
    if ((row.state !== "publicada" && row.state !== "curadora") || reads.reads.get(row.handle)?.status !== "ok" || !row.profile) continue;
    for (const found of snowballHandles(row.profile)) snow.push({ handle: found.handle, source: { kind: found.kind, day, via: row.handle } });
  }
  // Los textos de los posts de curadoras: cada @mención es una cuenta candidata.
  const captions = reads.captions ?? [];
  const minedBy = new Map<string, string[]>();
  for (const caption of captions) {
    const curator = mining.find(post => post.code === caption.code)?.owner ?? caption.owner;
    minedBy.set(curator, [...(minedBy.get(curator) ?? []), caption.code]);
    for (const handle of mentionsIn(caption.text)) {
      if (handle !== curator) snow.push({ handle, source: { kind: "mencion", day, via: curator } });
    }
  }
  if (minedBy.size) {
    const updated: CandidateRow[] = [];
    for (const [handle, codes] of minedBy) {
      const row = touched.get(handle) ?? curators.find(c => c.handle === handle);
      if (!row) continue;
      row.minedCodes = [...new Set([...(row.minedCodes ?? []), ...codes])].slice(-60);
      updated.push(row);
    }
    await store.saveCandidates(updated);
    log(`posts de curadoras: ${captions.length} de ${mining.length} leídos`);
  }
  const snowMerged = await mergeFinds(store, snow, optOuts, now, options.maxSnowball);
  discovered += snowMerged.created;
  if (snow.length) log(`bola de nieve: ${snow.length} menciones, ${snowMerged.created} cuentas nuevas`);

  // --- 6. Fichas públicas -----------------------------------------------------------------------
  const listings: EmprendimientoListing[] = [];
  const unlist: string[] = [...optOuts];
  for (const row of touched.values()) {
    const listing = publicListing(row, evidenceOf.get(row.handle) ?? (row.profile?.status === "ok" ? uruguayEvidence(row.profile) : null), now);
    if (listing) listings.push(listing);
    else unlist.push(row.handle);
  }
  await store.upsertListings(listings);
  await store.deleteListings(unlist);
  const pruned = await store.pruneListings(new Date(now.getTime() - LISTING_MAX_AGE_DAYS * DAY));
  if (pruned) notes.push(`${pruned} fichas sin lectura en ${LISTING_MAX_AGE_DAYS} días se retiraron`);

  // --- 7. Meta ------------------------------------------------------------------------------------
  sources.instagram = reads.launched
    ? { at: okCount ? now.toISOString() : (sources.instagram?.at ?? null), found: okCount, note: reads.note }
    : { ...(sources.instagram ?? { at: null, found: 0 }), note: reads.note ?? (due.length ? "no se leyó" : "nada para leer") };
  const counts = await store.listingCounts();
  const summary: RunSummary = {
    at: now.toISOString(),
    reads: attempted,
    ok: okCount,
    classified: classified.size,
    listed: listedNow,
    unlisted: unlistedNow,
    discovered,
    note: notes.length ? notes.join(" · ") : null,
  };
  const meta: EmprendimientoMeta = {
    key: "current",
    generatedAt: now.toISOString(),
    listed: counts.listed,
    byRubro: counts.byRubro,
    byDepartamento: counts.byDepartamento,
    candidates: await store.candidateCounts(),
    sources,
    lastRun: summary,
    state,
  };
  await store.saveMeta(meta);
  return { summary, instagramClosed: reads.closed, listings, touched: [...touched.values()] };
}

export type { Candidate };

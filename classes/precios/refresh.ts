// La corrida completa: catálogo, 215 barridos, tres guardas, seis escrituras.
//
// El orden importa. La banda de plausibilidad se calcula POR ARTÍCULO sobre las
// filas de ese artículo, no sobre todo el barrido: mezclar un aceite de $109
// con un shampoo de $395 borraría uno de los dos enteros. Y la auditoría de
// góndola va al final, porque necesita la mediana nacional de cada artículo,
// que sólo existe cuando terminó todo.
import { auditShelves, type PrecioScoredRow, type ShelfVerdict } from "./audit";
import { BASKET_ITEMS, BASKET_PINNED_AT, BASKET_VERSION, groupBaskets, indexDecision, storeBasket } from "./basket";
import { chainKey, fetchCatalog } from "./catalog";
import { articleBand, percentile, priceVerdict } from "./plausibility";
import { freshnessOf } from "./staleness";
import {
  detectPriceChanges,
  loadBasketDaily,
  loadCurrentState,
  publishDecision,
  saveArticles,
  saveBasketDaily,
  saveChanges,
  saveCurrent,
  saveDailyStats,
  saveStores,
  type PrecioDailyStat,
} from "./store";
import { observationsFor, storeIndex, sweepArticle } from "./sweep";
import type { PrecioObservation, PrecioStore } from "./types";

export interface PreciosRunReport {
  day: string;
  articles: number;
  observations: number;
  rejected: number;
  changes: number;
  qualifiedStores: number;
  nationalRatio: number;
  indexReason: string;
  failures: number[];
  published: boolean;
}

/** Cada observación con su veredicto y su frescura. La banda es por artículo. */
export function scoreObservations(observations: PrecioObservation[], today: string): PrecioScoredRow[] {
  const byArticle = new Map<number, PrecioObservation[]>();
  for (const observation of observations) {
    const list = byArticle.get(observation.articleId) || [];
    list.push(observation);
    byArticle.set(observation.articleId, list);
  }

  const scored: PrecioScoredRow[] = [];
  for (const [, list] of byArticle) {
    const band = articleBand(list.map((observation) => observation.price));
    for (const observation of list) {
      scored.push({
        ...observation,
        verdict: priceVerdict(observation.price, band),
        freshness: freshnessOf(observation.sourceDay, today),
      });
    }
  }
  return scored;
}

const statFor = (day: string, articleId: number, scope: string, prices: number[]): PrecioDailyStat => {
  const sorted = prices.sort((a, b) => a - b);
  return {
    day,
    articleId,
    scope,
    n: sorted.length,
    min: sorted[0],
    p10: percentile(sorted, 0.1),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    max: sorted[sorted.length - 1],
  };
};

/**
 * Agregados del día por artículo, en tres ámbitos.
 *
 * La cadena se agrupa por `chainKey` y no por el nombre publicado: el catálogo
 * escribe la misma cadena de dos maneras (Farmashop 123 veces, FARMASHOP otras
 * 29) y agrupar por el nombre la partiría en dos.
 */
export function dailyStatsFor(
  day: string,
  rows: PrecioScoredRow[],
  stores: Map<number, PrecioStore>
): PrecioDailyStat[] {
  const buckets = new Map<string, { articleId: number; scope: string; prices: number[] }>();
  const push = (articleId: number, scope: string, price: number) => {
    const key = `${articleId}|${scope}`;
    const bucket = buckets.get(key) || { articleId, scope, prices: [] };
    bucket.prices.push(price);
    buckets.set(key, bucket);
  };

  for (const row of rows) {
    if (row.verdict === "reject") continue;
    push(row.articleId, "nacional", row.price);
    const store = row.storeId === null ? undefined : stores.get(row.storeId);
    if (store?.department) push(row.articleId, `dept:${store.department}`, row.price);
    const chain = chainKey(store?.chain);
    if (chain) push(row.articleId, `chain:${chain}`, row.price);
  }

  return [...buckets.values()].map((bucket) => statFor(day, bucket.articleId, bucket.scope, bucket.prices));
}

const yesterdayOf = (day: string): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

export async function refreshPrecios(options: { limit?: number; day?: string } = {}): Promise<PreciosRunReport> {
  const day = options.day || new Date().toISOString().slice(0, 10);
  const { articles, stores } = await fetchCatalog();
  if (!articles.length || !stores.length) {
    return {
      day,
      articles: 0,
      observations: 0,
      rejected: 0,
      changes: 0,
      qualifiedStores: 0,
      nationalRatio: 0,
      indexReason: "el catálogo del origen vino vacío — no se escribe nada",
      failures: [],
      published: false,
    };
  }

  await Promise.all([
    saveArticles(articles),
    saveStores(stores.map((store) => ({ ...store, chainKey: chainKey(store.chain) }))),
  ]);

  const index = storeIndex(stores);
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const target = options.limit ? articles.slice(0, options.limit) : articles;

  const observations: PrecioObservation[] = [];
  const failures: number[] = [];
  let rejected = 0;

  for (const article of target) {
    const rows = await sweepArticle(article.id);
    if (rows === null) {
      failures.push(article.id);
      continue;
    }
    const result = observationsFor(article.id, rows, index);
    observations.push(...result.observations);
    rejected += result.rejected.length;
    for (const note of result.rejected.slice(0, 2)) console.log(`[precios] descartada ${article.name} :: ${note}`);
  }

  const scored = scoreObservations(observations, day);
  const previous = await loadCurrentState();
  const decision = publishDecision(scored.length, previous.size);
  console.log(`[precios] ${decision.reason}`);
  if (!decision.saved) {
    return {
      day,
      articles: target.length,
      observations: scored.length,
      rejected,
      changes: 0,
      qualifiedStores: 0,
      nationalRatio: 0,
      indexReason: decision.reason,
      failures,
      published: false,
    };
  }

  const changes = detectPriceChanges(scored, previous, day);
  await saveChanges(changes);
  await saveCurrent(scored, day);
  const stats = dailyStatsFor(day, scored, storeById);
  await saveDailyStats(day, stats);

  // La canasta y la auditoría, ahora que existe la mediana nacional por artículo.
  const nationalMedians = new Map(
    stats.filter((stat) => stat.scope === "nacional").map((stat) => [stat.articleId, stat.p50])
  );
  const shelfVerdicts: ShelfVerdict[] = auditShelves(scored, nationalMedians);
  for (const verdict of shelfVerdicts.filter((entry) => entry.severity !== "ok").slice(0, 10)) {
    console.log(`[precios] góndola ${verdict.severity}: ${verdict.storeName} :: ${verdict.note}`);
  }

  const byStore = new Map<number, PrecioScoredRow[]>();
  for (const row of scored) {
    if (row.storeId === null) continue;
    const list = byStore.get(row.storeId) || [];
    list.push(row);
    byStore.set(row.storeId, list);
  }

  const storeBaskets = [...byStore.entries()].map(([storeId, rows]) => ({
    storeId,
    store: storeById.get(storeId),
    ...storeBasket(rows, nationalMedians),
  }));
  const qualified = storeBaskets.filter((entry) => entry.qualified && entry.ratio !== null);
  const ratios = qualified.map((entry) => entry.ratio as number).sort((a, b) => a - b);
  const nationalRatio = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 0;

  const previousBasket = await loadBasketDaily(yesterdayOf(day));
  const indexVerdict = indexDecision(
    { version: BASKET_VERSION, qualifiedStores: qualified.length },
    previousBasket ? { version: previousBasket.basketVersion, qualifiedStores: previousBasket.qualifiedStores } : null
  );

  await saveBasketDaily({
    day,
    basketVersion: BASKET_VERSION,
    basketPinnedAt: BASKET_PINNED_AT,
    basketItems: BASKET_ITEMS.length,
    qualifiedStores: qualified.length,
    nationalRatio,
    indexPublished: indexVerdict.publish,
    indexReason: indexVerdict.reason,
    scopes: [
      ...groupBaskets(
        qualified.map((entry) => ({ scope: `dept:${entry.store?.department || ""}`, ratio: entry.ratio, qualified: true }))
      ),
      ...groupBaskets(
        qualified.map((entry) => ({
          scope: `chain:${chainKey(entry.store?.chain)}`,
          ratio: entry.ratio,
          qualified: true,
        }))
      ),
    ],
    // Ordenado por RATIO, nunca por total: el total baja por faltarle artículos
    // al local, no por ser barato (ver `basket.ts`).
    cheapestStores: [...qualified]
      .sort((a, b) => (a.ratio as number) - (b.ratio as number))
      .slice(0, 25)
      .map((entry) => ({
        storeId: entry.storeId,
        storeName: entry.store?.name || "",
        department: entry.store?.department || "",
        ratio: entry.ratio as number,
        cost: entry.cost,
        coverage: entry.coverage,
      })),
    shelfVerdicts: shelfVerdicts
      .filter((entry) => entry.severity !== "ok")
      .map(({ storeId, storeName, ratio, severity, note }) => ({ storeId, storeName, ratio, severity, note })),
  });

  return {
    day,
    articles: target.length,
    observations: scored.length,
    rejected,
    changes: changes.length,
    qualifiedStores: qualified.length,
    nationalRatio,
    indexReason: indexVerdict.reason,
    failures,
    published: true,
  };
}

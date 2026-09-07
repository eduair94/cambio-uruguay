// Seis colecciones en la Mongo del BACKEND (`cambio-uy`, la que lee la API
// pública), nunca la del app: la de estado es la colección más grande del
// proyecto (~75.600 documentos) y el patrón de `regional` —snapshot + diario +
// ledger, servidos por la API del root y consumidos por la página Nuxt— ya está
// probado con esta forma.
//
// `MongooseServer.getInstance` recibe el nombre del MODELO y mongoose pluraliza
// la colección, así que los nombres de acá están elegidos para que la colección
// resultante se lea bien (mismo detalle que `regional_data` -> `regional_datas`):
//
//   modelo                colección real        qué guarda
//   precios_article       precios_articles      215, upsert
//   precios_store         precios_stores        749, upsert
//   precios_price         precios_prices        estado por (artículo, local), upsert
//   precios_change        precios_changes       UNA fila por cambio, sin umbral
//   precios_stat          precios_stats         agregados por (día, artículo, ámbito)
//   precios_basket_day    precios_basket_days   canasta e índice por día
//
// El ledger es lo único irreconstruible: la fila diaria se sobrescribe, así que
// lo que pasó entre corridas sólo existe si se escribió cuando pasó.
import { MongooseServer, Schema } from "../database";
import type { PrecioScoredRow } from "./audit";
import type { PrecioArticle, PrecioStore } from "./types";

export const COLLECTIONS = Object.freeze({
  articles: "precios_articles",
  stores: "precios_stores",
  prices: "precios_prices",
  changes: "precios_changes",
  stats: "precios_stats",
  basketDays: "precios_basket_days",
});

export interface PrecioChange {
  key: string;
  articleId: number;
  storeId: number;
  from: number;
  to: number;
  changePct: number;
  day: string;
  observedAt: Date;
}

export interface PrecioDailyStat {
  day: string;
  articleId: number;
  /** `nacional`, `dept:Montevideo`, `chain:TA - TA`. */
  scope: string;
  n: number;
  min: number;
  p10: number;
  p50: number;
  p90: number;
  max: number;
}

export interface PrecioBasketDaily {
  day: string;
  basketVersion: number;
  basketPinnedAt: string;
  basketItems: number;
  qualifiedStores: number;
  /** Mediana nacional de la canasta emparejada. 1 = el nivel de precios medio. */
  nationalRatio: number;
  indexPublished: boolean;
  indexReason: string;
  scopes: Array<{ scope: string; median: number; stores: number; qualified: boolean; note: string }>;
  cheapestStores: Array<{
    storeId: number;
    storeName: string;
    department: string;
    ratio: number;
    cost: number;
    coverage: number;
  }>;
  shelfVerdicts: Array<{ storeId: number; storeName: string; ratio: number; severity: string; note: string }>;
}

export const stateKey = (articleId: number, storeId: number): string => `${articleId}:${storeId}`;

const articleSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: String,
    group: String,
    variant: String,
    unitRaw: String,
    qty: { type: Number, default: null },
    unit: { type: String, default: null },
    image: { type: String, default: null },
  },
  { strict: true }
);

const storeSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: String,
    chain: String,
    chainKey: String,
    branch: String,
    address: String,
    lat: { type: Number, default: null },
    lon: { type: Number, default: null },
    locality: String,
    department: String,
    phone: String,
    web: String,
  },
  { strict: true }
);
storeSchema.index({ department: 1 });
storeSchema.index({ chainKey: 1 });

const priceSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    articleId: { type: Number, required: true },
    storeId: { type: Number, required: true },
    price: { type: Number, required: true },
    sourceDay: { type: String, required: true },
    promo: { type: Boolean, default: false },
    freshness: { type: String, required: true },
    verdict: { type: String, required: true },
    seenDay: { type: String, required: true },
  },
  { strict: true }
);
priceSchema.index({ articleId: 1, price: 1 });
priceSchema.index({ storeId: 1 });

const changeSchema = new Schema(
  {
    key: { type: String, required: true },
    articleId: { type: Number, required: true },
    storeId: { type: Number, required: true },
    from: { type: Number, required: true },
    to: { type: Number, required: true },
    changePct: { type: Number, required: true },
    day: { type: String, required: true },
    observedAt: { type: Date, required: true },
  },
  { strict: true }
);
changeSchema.index({ key: 1, day: 1 }, { unique: true });
changeSchema.index({ articleId: 1, day: -1 });
changeSchema.index({ day: -1 });

const statSchema = new Schema(
  {
    day: { type: String, required: true },
    articleId: { type: Number, required: true },
    scope: { type: String, required: true },
    n: Number,
    min: Number,
    p10: Number,
    p50: Number,
    p90: Number,
    max: Number,
  },
  { strict: true }
);
statSchema.index({ day: 1, articleId: 1, scope: 1 }, { unique: true });
statSchema.index({ articleId: 1, scope: 1, day: -1 });

const basketSchema = new Schema(
  { day: { type: String, required: true, unique: true }, doc: Schema.Types.Mixed },
  { strict: false }
);

const articlesDb = (): MongooseServer => MongooseServer.getInstance("precios_article", articleSchema);
const storesDb = (): MongooseServer => MongooseServer.getInstance("precios_store", storeSchema);
const pricesDb = (): MongooseServer => MongooseServer.getInstance("precios_price", priceSchema);
const changesDb = (): MongooseServer => MongooseServer.getInstance("precios_change", changeSchema);
const statsDb = (): MongooseServer => MongooseServer.getInstance("precios_stat", statSchema);
const basketDb = (): MongooseServer => MongooseServer.getInstance("precios_basket_day", basketSchema);

/**
 * Una corrida que trae una fracción de lo guardado es una caída del origen, no
 * un país que dejó de publicar precios. Misma lección que enseñaron los jobs de
 * videos y bankos.
 */
export const COLLAPSE_RATIO = Number(process.env.PRECIOS_COLLAPSE_RATIO || 0.5);

export function publishDecision(nextCount: number, previousCount: number): { saved: boolean; reason: string } {
  if (nextCount <= 0) {
    return { saved: false, reason: "la corrida no trajo ninguna observación — se conserva la anterior" };
  }
  if (previousCount > 1000 && nextCount < previousCount * COLLAPSE_RATIO) {
    return {
      saved: false,
      reason: `la corrida trajo ${nextCount} observaciones contra ${previousCount} guardadas (< ${Math.round(
        COLLAPSE_RATIO * 100
      )} %) — se conserva la anterior`,
    };
  }
  return { saved: true, reason: `${nextCount} observaciones publicadas` };
}

/** Cada diferencia contra la última lectura, sin umbral mínimo. */
export function detectPriceChanges(
  rows: PrecioScoredRow[],
  previous: Map<string, { price: number; sourceDay: string }>,
  day: string
): PrecioChange[] {
  const observedAt = new Date();
  const changes: PrecioChange[] = [];
  for (const row of rows) {
    if (row.storeId === null || row.verdict === "reject") continue;
    const key = stateKey(row.articleId, row.storeId);
    const before = previous.get(key);
    if (!before || before.price === row.price) continue;
    changes.push({
      key,
      articleId: row.articleId,
      storeId: row.storeId,
      from: before.price,
      to: row.price,
      changePct: ((row.price - before.price) / before.price) * 100,
      day,
      observedAt,
    });
  }
  return changes;
}

// `bulkUpsert` y no un upsert por documento: una corrida escribe ~75.600 filas
// de estado, y `findOneAndUpdate` de a una son 75.600 idas y vueltas.
const CHUNK = 1000;

async function upsertAll(
  db: MongooseServer,
  operations: { filter: Record<string, any>; update: Record<string, any> }[]
): Promise<number> {
  for (let i = 0; i < operations.length; i += CHUNK) {
    await db.bulkUpsert(operations.slice(i, i + CHUNK));
  }
  return operations.length;
}

export async function saveArticles(articles: PrecioArticle[]): Promise<number> {
  return upsertAll(
    articlesDb(),
    articles.map((article) => ({ filter: { id: article.id }, update: article }))
  );
}

export async function saveStores(stores: Array<PrecioStore & { chainKey?: string }>): Promise<number> {
  return upsertAll(
    storesDb(),
    stores.map((store) => ({ filter: { id: store.id }, update: store }))
  );
}

export async function loadCurrentState(): Promise<Map<string, { price: number; sourceDay: string }>> {
  const rows = await pricesDb().aggregate([{ $project: { _id: 0, key: 1, price: 1, sourceDay: 1 } }]);
  return new Map(rows.map((row: any) => [row.key, { price: row.price, sourceDay: row.sourceDay }]));
}

export async function saveCurrent(rows: PrecioScoredRow[], day: string): Promise<number> {
  const operations = rows
    .filter((row) => row.storeId !== null && row.verdict !== "reject")
    .map((row) => {
      const key = stateKey(row.articleId, row.storeId as number);
      return {
        filter: { key },
        update: {
          key,
          articleId: row.articleId,
          storeId: row.storeId,
          price: row.price,
          sourceDay: row.sourceDay,
          promo: row.promo,
          freshness: row.freshness,
          verdict: row.verdict,
          seenDay: day,
        },
      };
    });
  return upsertAll(pricesDb(), operations);
}

export async function saveChanges(changes: PrecioChange[]): Promise<number> {
  return upsertAll(
    changesDb(),
    changes.map((change) => ({ filter: { key: change.key, day: change.day }, update: change }))
  );
}

export async function saveDailyStats(day: string, stats: PrecioDailyStat[]): Promise<number> {
  return upsertAll(
    statsDb(),
    stats.map((stat) => ({ filter: { day, articleId: stat.articleId, scope: stat.scope }, update: stat }))
  );
}

export async function saveBasketDaily(doc: PrecioBasketDaily): Promise<boolean> {
  await basketDb().updateOne({ day: doc.day }, { day: doc.day, doc });
  return true;
}

export async function loadBasketDaily(day: string): Promise<PrecioBasketDaily | null> {
  const rows = await basketDb().aggregate([{ $match: { day } }, { $limit: 1 }]);
  return (rows[0]?.doc as PrecioBasketDaily | undefined) ?? null;
}

/** El último día con canasta guardada, para que la API no dependa de "hoy". */
export async function loadLatestBasketDaily(): Promise<PrecioBasketDaily | null> {
  const rows = await basketDb().aggregate([{ $sort: { day: -1 } }, { $limit: 1 }]);
  return (rows[0]?.doc as PrecioBasketDaily | undefined) ?? null;
}

export async function countPrices(): Promise<number> {
  const rows = await pricesDb().aggregate([{ $count: "n" }]);
  return rows[0]?.n ?? 0;
}

export async function countChanges(): Promise<number> {
  const rows = await changesDb().aggregate([{ $count: "n" }]);
  return rows[0]?.n ?? 0;
}

// ---------------------------------------------------------------------------
// Lecturas para la API pública.
//
// El `from` de cada `$lookup` es el nombre REAL de la colección (pluralizado
// por mongoose), no el del modelo: por eso existe `COLLECTIONS`.
// ---------------------------------------------------------------------------

/** El catálogo con las estadísticas nacionales del día pedido. */
export async function loadArticlesWithStats(day: string): Promise<any[]> {
  return statsDb().aggregate([
    { $match: { day, scope: "nacional" } },
    { $lookup: { from: COLLECTIONS.articles, localField: "articleId", foreignField: "id", as: "article" } },
    { $unwind: "$article" },
    {
      $project: {
        _id: 0,
        articleId: 1,
        n: 1,
        min: 1,
        p10: 1,
        p50: 1,
        p90: 1,
        max: 1,
        name: "$article.name",
        group: "$article.group",
        variant: "$article.variant",
        unitRaw: "$article.unitRaw",
        qty: "$article.qty",
        unit: "$article.unit",
        image: "$article.image",
      },
    },
    { $sort: { name: 1 } },
  ]);
}

/** El último día con agregados guardados, para que la API no dependa de "hoy". */
export async function loadLatestStatDay(): Promise<string | null> {
  const rows = await statsDb().aggregate([{ $sort: { day: -1 } }, { $limit: 1 }, { $project: { _id: 0, day: 1 } }]);
  return rows[0]?.day ?? null;
}

export async function loadArticleDetail(articleId: number, day: string): Promise<any> {
  const [rows, stats, series, article] = await Promise.all([
    pricesDb().aggregate([
      { $match: { articleId } },
      { $lookup: { from: COLLECTIONS.stores, localField: "storeId", foreignField: "id", as: "store" } },
      { $unwind: "$store" },
      {
        $project: {
          _id: 0,
          storeId: 1,
          price: 1,
          sourceDay: 1,
          promo: 1,
          freshness: 1,
          verdict: 1,
          storeName: "$store.name",
          chain: "$store.chain",
          department: "$store.department",
          address: "$store.address",
          lat: "$store.lat",
          lon: "$store.lon",
        },
      },
      { $sort: { price: 1 } },
    ]),
    statsDb().aggregate([{ $match: { day, articleId, scope: "nacional" } }, { $limit: 1 }, { $project: { _id: 0 } }]),
    statsDb().aggregate([
      { $match: { articleId, scope: "nacional" } },
      { $sort: { day: -1 } },
      { $limit: 180 },
      { $project: { _id: 0, day: 1, min: 1, p50: 1, max: 1, n: 1 } },
    ]),
    articlesDb().aggregate([{ $match: { id: articleId } }, { $limit: 1 }, { $project: { _id: 0 } }]),
  ]);
  return { article: article[0] || null, rows, stats: stats[0] || null, series: series.reverse() };
}

/** Locales dentro de un radio. Los 18 sin coordenada no pueden entrar. */
export async function loadStoresNear(lat: number, lon: number, km: number): Promise<any[]> {
  const { haversineKm } = await import("./geo");
  const stores = await storesDb().aggregate([
    { $match: { lat: { $ne: null }, lon: { $ne: null } } },
    { $project: { _id: 0 } },
  ]);
  return stores
    .map((store: any) => ({ ...store, km: haversineKm({ lat, lon }, { lat: store.lat, lon: store.lon }) }))
    .filter((store: any) => store.km <= km)
    .sort((a: any, b: any) => a.km - b.km);
}

export async function loadChanges(filter: {
  articleId?: number;
  storeId?: number;
  day?: string;
  limit: number;
}): Promise<any[]> {
  const match: Record<string, unknown> = {};
  if (filter.articleId !== undefined) match.articleId = filter.articleId;
  if (filter.storeId !== undefined) match.storeId = filter.storeId;
  if (filter.day) match.day = filter.day;
  return changesDb().aggregate([
    { $match: match },
    { $sort: { observedAt: -1 } },
    { $limit: filter.limit },
    { $project: { _id: 0 } },
  ]);
}

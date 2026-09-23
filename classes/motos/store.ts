// El límite con la APP DB del job de motos. Primero las reglas PURAS (que se prueban sin Mongo) y
// después la entrada/salida. El job nunca toca un modelo directo: pasa por acá, que es lo que los
// tests mockean.
import { appConnection } from "../appdb";
import { MotoCatalogMetaModel } from "../models/MotoCatalogMeta";
import { MotoCatalogModel } from "../models/MotoCatalog";
import { MotoListingModel } from "../models/MotoListing";
import { MotoMarketSnapshotModel } from "../models/MotoMarketSnapshot";
import { motoKey } from "./enrich";
import type {
  MotoFacetEvidence,
  MotoHarvestResult,
  MotoPricePoint,
  PublicMotoCatalogMeta,
  PublicMotoListing,
  PublicMotoModel,
  PublicMotoReportSnapshot,
  RawMotoListing,
  StoredMoto,
} from "./types";

/** La `key` reservada del informe dentro de `motomarketsnapshots` (ver el modelo). */
export const MOTO_REPORT_KEY = "_informe";
export const MOTO_META_KEY = "uy-motos";
export const MOTO_HARVEST_META_KEY = "uy-motos-harvest";
/**
 * La negativa a publicar va en su PROPIO documento y no en un campo de "uy-motos": guardar la meta
 * de la corrida reescribe ese documento entero, así que una negativa anotada ahí se borraría sola.
 * Es el defecto que autos ya pagó (`uy-cars-publish`).
 */
export const MOTO_PUBLISH_REFUSAL_KEY = "uy-motos-publish";

const CHUNK = 300;

/** Un punto nuevo sólo si el precio o la moneda cambiaron. Últimos 20, como autos. */
export function nextPriceHistory(history: readonly MotoPricePoint[], listing: RawMotoListing): MotoPricePoint[] {
  const last = history[history.length - 1];
  if (last && last.price === listing.price && last.currency === listing.currency) return [...history];
  return [...history, { price: listing.price, currency: listing.currency, observedAt: listing.observedAt }].slice(-20);
}

/**
 * Un aviso que no apareció en un barrido COMPLETO suma una ausencia; con dos, se retira. Nunca con
 * una sola: un barrido puede perder una página sin que nadie se entere, y retirar por una ausencia
 * convierte un hueco de lectura en un "se vendió".
 */
export function sweepUpdate(
  doc: { missedFullSweeps?: number | null; retiredAt?: string | null },
  now: string
): { missedFullSweeps: number; retiredAt: string | null } {
  const missed = (doc.missedFullSweeps ?? 0) + 1;
  return { missedFullSweeps: missed, retiredAt: doc.retiredAt ?? (missed >= 2 ? now : null) };
}

/** Una corrida que trae menos de esta fracción de lo publicado es una caída, no un mercado. */
export const MOTO_THIN_RUN_FLOOR = 0.4;

/**
 * Debajo de esta cantidad de filas publicadas, una fracción no prueba nada: con diez avisos, que
 * hoy haya tres es movimiento normal del mercado y no una caída. Autos usa 100 sobre ~19.000
 * avisos; acá el catálogo medido es catorce veces más chico (1.391 el 2026-09-22), así que el piso
 * baja en la misma proporción y queda en 40 — que una corrida completa supera desde el primer día.
 */
export const MOTO_COLLAPSE_MIN_PREVIOUS = 40;

/**
 * Una corrida flaca NO pisa un catálogo que ayer estaba bien. Devuelve el motivo, o null si puede
 * publicar. Es una función pura a propósito: la decisión se prueba sin base.
 */
export function collapseRefusal(previous: number | null | undefined, next: number, label: string): string | null {
  if (previous && previous > MOTO_COLLAPSE_MIN_PREVIOUS && next < previous * MOTO_THIN_RUN_FLOOR) {
    return `${label}: ${next} avisos contra ${previous} guardados en la corrida anterior (caída de más de 60 %); se conserva lo publicado`;
  }
  return null;
}

const listingsCollection = () => appConnection().collection(MotoListingModel.collection.name);

/**
 * La colección NATIVA de mongoose no encola nada: llamarla antes de que la conexión abra tira
 * "Collection method find is synchronous". Los modelos sí encolan, así que un job que arranca con
 * una consulta nativa se cae en su primera corrida en el VPS si no se espera acá. Está escrito
 * contra la FORMA y no contra el tipo porque los tests cambian `appConnection` por un doble que sólo
 * tiene `collection`.
 */
async function nativeReady(): Promise<void> {
  const connection = appConnection() as { readyState?: number; asPromise?: () => Promise<unknown> };
  if (connection.readyState !== 1 && typeof connection.asPromise === "function") await connection.asPromise();
}

export async function loadStoredMotos(now: Date, days = 21): Promise<StoredMoto[]> {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  await nativeReady();
  const rows = await listingsCollection()
    .find({ lastSeen: { $gte: cutoff }, retiredAt: null }, { projection: { _id: 0 } })
    .toArray();
  return rows as unknown as StoredMoto[];
}

/**
 * Cuántas filas tiene AHORA el catálogo público. Es el denominador honesto de la guarda de corrida
 * flaca: lo que esta corrida está por pisar es exactamente esto, y no el ledger privado, que
 * arrastra avisos viejos que ninguna marca completa llegó a retirar.
 */
export async function countPublishedMotos(): Promise<number> {
  await nativeReady();
  return appConnection().collection(MotoCatalogModel.collection.name).countDocuments({});
}

/**
 * Lo que las facetas declararon en ESTA corrida, por aviso. Sólo entra al `$set` lo que la corrida
 * de verdad midió: una corrida que no barrió las facetas no puede borrar lo que midió la anterior.
 */
export function facetEvidenceOf(harvest: MotoHarvestResult): Map<string, MotoFacetEvidence> {
  const evidence = new Map<string, MotoFacetEvidence>();
  for (const entry of harvest.types) {
    evidence.set(entry.id, { type: entry.type, displacementBand: null, readAt: harvest.finishedAt });
  }
  for (const entry of harvest.displacements) {
    const before = evidence.get(entry.id);
    evidence.set(entry.id, {
      type: before?.type ?? null,
      displacementBand: entry.band,
      readAt: harvest.finishedAt,
    });
  }
  return evidence;
}

async function upsertListings(
  listings: readonly RawMotoListing[],
  facets: ReadonlyMap<string, MotoFacetEvidence> = new Map()
): Promise<number> {
  await nativeReady();
  const collection = listingsCollection();
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ lastSeen: 1 });
  let upserted = 0;
  for (let index = 0; index < listings.length; index += CHUNK) {
    const chunk = listings.slice(index, index + CHUNK);
    const existing = new Map(
      (
        await collection
          .find({ key: { $in: chunk.map(listing => motoKey(listing.id, listing.source)) } }, { projection: { key: 1, priceHistory: 1 } })
          .toArray()
      ).map(doc => [String(doc.key), doc])
    );
    const operations = chunk.map(listing => {
      const key = motoKey(listing.id, listing.source);
      const history = nextPriceHistory((existing.get(key)?.priceHistory as MotoPricePoint[] | undefined) ?? [], listing);
      const evidence = facets.get(listing.id);
      return {
        updateOne: {
          filter: { key },
          update: {
            $set: {
              listing,
              lastSeen: listing.observedAt,
              priceHistory: history,
              missedFullSweeps: 0,
              retiredAt: null,
              // Sólo si esta corrida barrió las facetas: si no, se conserva lo que midió la diaria.
              ...(evidence ? { facets: evidence } : {}),
            },
            $setOnInsert: { key, firstSeen: listing.observedAt },
          },
          upsert: true,
        },
      };
    });
    const result = await collection.bulkWrite(operations, { ordered: false });
    upserted += result.upsertedCount + result.modifiedCount;
  }
  return upserted;
}

async function countMisses(filter: Record<string, unknown>, finishedAt: string): Promise<number> {
  const collection = listingsCollection();
  const missing = await collection.find(filter, { projection: { key: 1, missedFullSweeps: 1, retiredAt: 1 } }).toArray();
  let retired = 0;
  const operations = missing.map(doc => {
    const update = sweepUpdate(doc as { missedFullSweeps?: number; retiredAt?: string | null }, finishedAt);
    if (update.retiredAt) retired++;
    return { updateOne: { filter: { key: doc.key }, update: { $set: update } } };
  });
  for (let index = 0; index < operations.length; index += CHUNK) {
    await collection.bulkWrite(operations.slice(index, index + CHUNK), { ordered: false });
  }
  return retired;
}

export async function saveMotoHarvest(harvest: MotoHarvestResult): Promise<{ upserted: number; retired: number }> {
  const upserted = await upsertListings(harvest.listings, facetEvidenceOf(harvest));
  let retired = 0;
  // Sólo un barrido COMPLETO puede contar una ausencia, y sólo dentro de las marcas cuyas páginas
  // respondieron todas. La corrida horaria (`--fast`) nunca retira nada: lee las novedades del día y
  // no ver un aviso ahí no dice absolutamente nada sobre ese aviso.
  if (harvest.mode === "full" && harvest.completeBrands.length) {
    const missSince = new Date(Date.parse(harvest.startedAt) - 21 * 86_400_000).toISOString();
    retired = await countMisses(
      {
        "listing.source": "mercadolibre",
        "listing.brandId": { $in: harvest.completeBrands },
        key: { $nin: harvest.listings.map(listing => motoKey(listing.id, listing.source)) },
        lastSeen: { $lt: harvest.startedAt, $gte: missSince },
        retiredAt: null,
      },
      harvest.finishedAt
    );
  }
  return { upserted, retired };
}

export interface MotoHarvestMetaRecord {
  mode: "full" | "fast";
  startedAt: string;
  finishedAt: string;
  listings: number;
  requests: number;
  pages: number;
  failedPages: number;
  rejectedCards: number;
  cooldowns: number;
  completeBrands: number;
  gaps: MotoHarvestResult["gaps"];
  reportedTotal: number | null;
  note: string | null;
  ok: boolean;
  lastOkAt: string | null;
  failingSince: string | null;
}

export function motoHarvestMetaRecord(
  harvest: MotoHarvestResult,
  previous: { lastOkAt?: string | null; failingSince?: string | null } | null
): MotoHarvestMetaRecord {
  // Una corrida rápida (`since=today`) puede volver legítimamente con cero avisos de madrugada, así
  // que sólo a la completa se le exige haber traído al menos uno para llamarla "ok".
  const ok = harvest.failedPages === 0 && !harvest.note && (harvest.mode === "fast" || harvest.listings.length > 0);
  return {
    mode: harvest.mode,
    startedAt: harvest.startedAt,
    finishedAt: harvest.finishedAt,
    listings: harvest.listings.length,
    requests: harvest.requests,
    pages: harvest.pages,
    failedPages: harvest.failedPages,
    rejectedCards: harvest.rejectedCards,
    cooldowns: harvest.cooldowns,
    completeBrands: harvest.completeBrands.length,
    gaps: harvest.gaps.slice(0, 50),
    reportedTotal: harvest.reportedTotal,
    note: harvest.note,
    ok,
    lastOkAt: ok ? harvest.finishedAt : previous?.lastOkAt ?? null,
    failingSince: ok ? null : previous?.failingSince ?? harvest.finishedAt,
  };
}

export async function loadHarvestMeta(): Promise<MotoHarvestMetaRecord | null> {
  const doc = await MotoCatalogMetaModel.findOne({ key: MOTO_HARVEST_META_KEY }).lean();
  return ((doc as any)?.meta as MotoHarvestMetaRecord | undefined) ?? null;
}

export async function saveHarvestMeta(record: MotoHarvestMetaRecord): Promise<void> {
  await MotoCatalogMetaModel.updateOne(
    { key: MOTO_HARVEST_META_KEY },
    { $set: { generatedAt: record.finishedAt, meta: record } },
    { upsert: true }
  );
}

export async function loadCatalogMeta(): Promise<PublicMotoCatalogMeta | null> {
  const doc = await MotoCatalogMetaModel.findOne({ key: MOTO_META_KEY }).lean();
  return ((doc as any)?.meta as PublicMotoCatalogMeta | undefined) ?? null;
}

export async function saveRefusal(reason: string | null, at: string): Promise<void> {
  await MotoCatalogMetaModel.updateOne(
    { key: MOTO_PUBLISH_REFUSAL_KEY },
    { $set: { generatedAt: at, meta: { reason, at } } },
    { upsert: true }
  );
}

export async function publishMotoCatalog(rows: readonly PublicMotoListing[], meta: PublicMotoCatalogMeta): Promise<void> {
  if (!rows.length) throw new Error("[motos] refusing to publish an empty catalog");
  await nativeReady();
  const collection = appConnection().collection(MotoCatalogModel.collection.name);
  await collection.createIndex({ key: 1 }, { unique: true });
  await collection.createIndex({ marketSlug: 1, year: -1 });
  await collection.createIndex({ brandSlug: 1, lastSeen: -1 });
  await collection.createIndex({ lastSeen: -1, firstSeen: -1 });
  await collection.createIndex({ priceUsd: 1 });
  // El filtro que este directorio tiene y el de autos no: la cilindrada, cruzada con el precio.
  await collection.createIndex({ displacement: 1, priceUsd: 1 });
  for (let index = 0; index < rows.length; index += CHUNK) {
    await collection.bulkWrite(
      rows.slice(index, index + CHUNK).map(row => ({
        replaceOne: { filter: { key: row.key }, replacement: row, upsert: true },
      })),
      { ordered: false }
    );
  }
  await collection.deleteMany({ key: { $nin: rows.map(row => row.key) } });
  await MotoCatalogMetaModel.updateOne(
    { key: MOTO_META_KEY },
    { $set: { generatedAt: meta.generatedAt, meta } },
    { upsert: true }
  );
}

/**
 * Las fichas de modelo y el informe, en una sola pasada: se escriben todas y después se borra lo que
 * no está en esta lista, así nunca queda publicada la ficha de un modelo que el informe de al lado
 * ya no cuenta. El informe viaja con la `key` reservada y por eso sobrevive a la poda.
 */
export async function publishMotoModels(
  models: readonly PublicMotoModel[],
  report: PublicMotoReportSnapshot
): Promise<void> {
  await nativeReady();
  const collection = appConnection().collection(MotoMarketSnapshotModel.collection.name);
  await collection.createIndex({ key: 1 }, { unique: true });
  const docs = [
    ...models.map(model => ({ key: model.slug, generatedAt: model.generatedAt, snapshot: model })),
    { key: MOTO_REPORT_KEY, generatedAt: report.generatedAt, snapshot: report },
  ];
  for (let index = 0; index < docs.length; index += CHUNK) {
    await collection.bulkWrite(
      docs.slice(index, index + CHUNK).map(doc => ({
        replaceOne: { filter: { key: doc.key }, replacement: doc, upsert: true },
      })),
      { ordered: false }
    );
  }
  await collection.deleteMany({ key: { $nin: docs.map(doc => doc.key) } });
}

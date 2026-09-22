// El job de /cambios-de-precio-uruguay: recorre las tres colecciones de historial que el sitio ya
// escribe, cuenta lo que se movió en la ventana y publica una foto. NO escribe historial: leer es
// todo lo que hace acá (ver classes/pricewatch/record.ts, classes/marketseries/log.ts y
// classes/autos/store.ts, que son los que escriben).
//
// La vertical "autos" sale de `carlistings` y NO de `marketpricelogs`, aunque las dos la tengan:
// carlistings se actualiza cada hora y marketpricelogs una vez por día, así que publicar las dos
// contaría el mismo cambio dos veces con distinta resolución.
import { appConnection } from "../appdb";
import { PricewatchOfferModel } from "../models/PricewatchOffer";
import { seriesFromCarListing, seriesFromMarketLog, seriesFromPricewatch } from "./normalize";
import {
  changeFromSeries,
  PRICE_CHANGE_PER_SELLER,
  PRICE_CHANGE_PER_VERTICAL,
  PRICE_CHANGE_WINDOW_DAYS,
  rankChanges,
} from "./scan";
import { publishedChangeCount, pruneSnapshots, writeSnapshot } from "./store";
import type {
  PriceChange,
  PriceChangeSnapshot,
  PriceChangeVerticalSummary,
  PriceHistorySeries,
  PriceHistoryVertical,
} from "./types";

export const PRICE_CHANGE_SNAPSHOT_RETENTION_DAYS = 400;
/** Cuántos avisos por vertical se guardan como candidatos antes de rankear: 20 veces el tope de la
 * tabla, para que el recorte por vendedor tenga de dónde elegir sin juntar la base entera. */
const CANDIDATE_CAP = PRICE_CHANGE_PER_VERTICAL * 20;
const BATCH = 500;
const LOOKUP_CHUNK = 200;

const shiftDay = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Una corrida que trae mucho menos que lo publicado no pisa la foto buena — la misma guarda que
 * `sync_price_events.ts`. Con menos de 20 cambios publicados no hay nada que proteger, y la primera
 * corrida (`previous === null`) siempre escribe, aunque traiga cero.
 */
export function refusesThinRun(previous: number | null, next: number): boolean {
  if (previous === null || previous < 20) return false;
  return next < previous * 0.4;
}

/** Los documentos de archivo más viejos que `days`. `key` es "day:YYYY-MM-DD", así que un `$lt` de
 * strings compara fechas bien. */
export function snapshotPruneFilter(today: string, days = PRICE_CHANGE_SNAPSHOT_RETENTION_DAYS): Record<string, unknown> {
  return { key: { $regex: "^day:", $lt: `day:${shiftDay(today, -days)}` } };
}

export function composeSnapshot(input: {
  key: string;
  day: string;
  generatedAt: string;
  windowDays: number;
  verticals: PriceChangeVerticalSummary[];
  changes: PriceChange[];
}): PriceChangeSnapshot {
  return {
    key: input.key,
    day: input.day,
    generatedAt: input.generatedAt,
    windowDays: input.windowDays,
    verticals: input.verticals,
    changes: input.changes,
  };
}

/** Acumula, por vertical, lo que hay que contar mientras se recorre cada colección una sola vez. */
class VerticalTally {
  private readonly rows = new Map<PriceHistoryVertical, PriceChangeVerticalSummary>();
  readonly candidates = new Map<PriceHistoryVertical, PriceHistorySeries[]>();

  constructor(private readonly today: string, private readonly windowDays: number) {}

  private row(vertical: PriceHistoryVertical): PriceChangeVerticalSummary {
    const existing = this.rows.get(vertical);
    if (existing) return existing;
    const fresh: PriceChangeVerticalSummary = { vertical, tracked: 0, withHistory: 0, drops: 0, rises: 0, trackingSince: null };
    this.rows.set(vertical, fresh);
    return fresh;
  }

  add(series: PriceHistorySeries | null): void {
    if (!series) return;
    const row = this.row(series.vertical);
    row.tracked += 1;
    if (series.points.length > 1) row.withHistory += 1;
    if (series.firstSeen && (!row.trackingSince || series.firstSeen < row.trackingSince)) row.trackingSince = series.firstSeen;
    const change = series.lastChange;
    if (!change) return;
    if (change.at > this.today || change.at < shiftDay(this.today, -this.windowDays)) return;
    if (change.to < change.from) row.drops += 1;
    else if (change.to > change.from) row.rises += 1;
    const bucket = this.candidates.get(series.vertical) ?? [];
    bucket.push(series);
    // Se guarda el candidato más grande: `push` y, pasado el tope, se tira el de menor magnitud.
    if (bucket.length > CANDIDATE_CAP) {
      bucket.sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0));
      bucket.length = CANDIDATE_CAP;
    }
    this.candidates.set(series.vertical, bucket);
  }

  summaries(): PriceChangeVerticalSummary[] {
    return [...this.rows.values()].sort((a, b) => a.vertical.localeCompare(b.vertical));
  }
}

async function scanPricewatch(tally: VerticalTally): Promise<void> {
  const cursor = PricewatchOfferModel.find({})
    .select({
      _id: 0,
      listingId: 1,
      vertical: 1,
      title: 1,
      url: 1,
      sellerKey: 1,
      sellerName: 1,
      currency: 1,
      firstSeen: 1,
      lastSeen: 1,
      history: 1,
    })
    .lean()
    .cursor({ batchSize: BATCH });
  for await (const doc of cursor) tally.add(seriesFromPricewatch(doc as Record<string, any>));
}

async function scanCarListings(tally: VerticalTally): Promise<void> {
  // `retiredAt` marca el aviso que ya no está publicado: no se anuncia un cambio de precio de algo que
  // el lector no puede ir a ver.
  const cursor = appConnection()
    .collection("carlistings")
    .find(
      { retiredAt: null },
      {
        projection: { _id: 0, key: 1, firstSeen: 1, lastSeen: 1, priceHistory: 1, "listing.currency": 1 },
        batchSize: BATCH,
      }
    );
  for await (const doc of cursor) tally.add(seriesFromCarListing(doc as Record<string, any>));
}

async function scanMarketLogs(tally: VerticalTally): Promise<void> {
  const cursor = appConnection()
    .collection("marketpricelogs")
    .find(
      { vertical: { $in: ["alquiler", "venta"] } },
      { projection: { _id: 0, vertical: 1, advertId: 1, firstSeen: 1, lastSeen: 1, points: 1 }, batchSize: BATCH }
    );
  for await (const doc of cursor) tally.add(seriesFromMarketLog(doc as Record<string, any>));
}

const chunks = <T>(values: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
};

/**
 * Autos: el título y el enlace salen del catálogo PÚBLICO, no del documento privado. Un aviso que el
 * catálogo no publica (precio implausible retirado, bandera, cosecha vieja) se queda sin fila.
 */
async function resolveAutos(series: readonly PriceHistorySeries[]): Promise<PriceHistorySeries[]> {
  const byKey = new Map(series.map((row) => [row.id, row]));
  const resolved: PriceHistorySeries[] = [];
  for (const chunk of chunks([...byKey.keys()], LOOKUP_CHUNK)) {
    const rows = await appConnection()
      .collection("carcatalog")
      .find({ key: { $in: chunk } }, { projection: { _id: 0, key: 1, title: 1, sellerName: 1 } })
      .toArray();
    for (const row of rows) {
      const found = byKey.get(String(row.key));
      if (!found || typeof row.title !== "string") continue;
      resolved.push({
        ...found,
        title: row.title,
        url: `/autos-usados-uruguay/${row.key}`,
        sellerName: typeof row.sellerName === "string" ? row.sellerName : found.sellerName,
      });
    }
  }
  return resolved;
}

async function resolveVenta(series: readonly PriceHistorySeries[]): Promise<PriceHistorySeries[]> {
  const byKey = new Map(series.map((row) => [row.id, row]));
  const resolved: PriceHistorySeries[] = [];
  for (const chunk of chunks([...byKey.keys()], LOOKUP_CHUNK)) {
    const rows = await appConnection()
      .collection("propertysalecatalog")
      .find({ key: { $in: chunk } }, { projection: { _id: 0, key: 1, title: 1, sellerName: 1 } })
      .toArray();
    for (const row of rows) {
      const found = byKey.get(String(row.key));
      if (!found || typeof row.title !== "string") continue;
      resolved.push({
        ...found,
        title: row.title,
        url: `/venta-viviendas-uruguay/${row.key}`,
        sellerName: typeof row.sellerName === "string" ? row.sellerName : found.sellerName,
      });
    }
  }
  return resolved;
}

/**
 * Alquiler: el log guarda el id del AVISO y la página publica la VIVIENDA, así que hay que volver del
 * aviso a su propiedad (`offers.listingId`, que tiene índice propio). Una vivienda cuyo aviso ya no
 * está en el catálogo no se publica.
 */
async function resolveAlquiler(series: readonly PriceHistorySeries[]): Promise<PriceHistorySeries[]> {
  const byAdvert = new Map(series.map((row) => [row.id, row]));
  const resolved: PriceHistorySeries[] = [];
  for (const chunk of chunks([...byAdvert.keys()], LOOKUP_CHUNK)) {
    const rows = await appConnection()
      .collection("rentallistings")
      .find(
        { "offers.listingId": { $in: chunk } },
        { projection: { _id: 0, key: 1, title: 1, "offers.listingId": 1, "offers.title": 1, "offers.sellerName": 1 } }
      )
      .toArray();
    for (const row of rows) {
      for (const offer of Array.isArray(row.offers) ? row.offers : []) {
        const found = byAdvert.get(String(offer?.listingId));
        if (!found) continue;
        const title = typeof offer?.title === "string" ? offer.title : typeof row.title === "string" ? row.title : null;
        if (!title) continue;
        resolved.push({
          ...found,
          title,
          url: `/alquileres/${row.key}`,
          sellerName: typeof offer?.sellerName === "string" ? offer.sellerName : found.sellerName,
        });
      }
    }
  }
  return resolved;
}

export interface PriceChangeRunResult {
  written: boolean;
  reason: string | null;
  snapshot: PriceChangeSnapshot;
  pruned: number;
}

export async function runPriceChanges(options: { today?: string; windowDays?: number; dryRun?: boolean } = {}): Promise<PriceChangeRunResult> {
  const now = new Date();
  const today = options.today ?? now.toISOString().slice(0, 10);
  const windowDays = options.windowDays ?? PRICE_CHANGE_WINDOW_DAYS;
  const tally = new VerticalTally(today, windowDays);

  await scanPricewatch(tally);
  await scanCarListings(tally);
  await scanMarketLogs(tally);

  const changes: PriceChange[] = [];
  for (const [vertical, candidates] of tally.candidates) {
    const resolved =
      vertical === "autos"
        ? await resolveAutos(candidates)
        : vertical === "venta"
          ? await resolveVenta(candidates)
          : vertical === "alquiler"
            ? await resolveAlquiler(candidates)
            : candidates;
    const rows = resolved
      .map((series) => changeFromSeries(series, today, windowDays))
      .filter((row): row is PriceChange => row !== null);
    changes.push(...rankChanges(rows, { perSeller: PRICE_CHANGE_PER_SELLER, perVertical: PRICE_CHANGE_PER_VERTICAL }));
  }

  const snapshot = composeSnapshot({
    key: "current",
    day: today,
    generatedAt: now.toISOString(),
    windowDays,
    verticals: tally.summaries(),
    changes: changes.sort(
      (a, b) => a.vertical.localeCompare(b.vertical) || Math.abs(b.pct) - Math.abs(a.pct) || (a.id < b.id ? -1 : 1)
    ),
  });

  if (options.dryRun) return { written: false, reason: "dry-run", snapshot, pruned: 0 };

  const previous = await publishedChangeCount();
  if (refusesThinRun(previous, changes.length)) {
    return { written: false, reason: `corrida flaca: ${changes.length} cambios contra ${previous} publicados`, snapshot, pruned: 0 };
  }
  await writeSnapshot(snapshot);
  const pruned = await pruneSnapshots(snapshotPruneFilter(today));
  return { written: true, reason: null, snapshot, pruned };
}

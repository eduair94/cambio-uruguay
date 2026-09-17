// Plan D — CyberLunes/Black Friday: la única capa de este feature que toca Mongo. Todo lo que decide
// algo (`analyze.ts`, `aggregate.ts`, `calendar.ts`) es puro a propósito; esto es sólo lectura y
// escritura, para que `refresh.ts` se pueda probar con esta capa mockeada (mismo criterio que
// `classes/propertyzones/refresh.test.ts` mockea `classes/propertyzones/store.ts`).
import { PricewatchOfferModel } from "../models/PricewatchOffer";
import { PriceEventSnapshotModel } from "../models/PriceEventSnapshot";
import type { PriceEventSnapshot } from "./aggregate";
import { PRICE_EVENT_LOOKBACK_DAYS, type PricewatchOfferLike } from "./types";

/** Los campos que {@link PricewatchOfferLike} lee, más `source` — no el documento entero (que además
 * trae `lastSeen`, que este feature no necesita una vez que ya filtró por él). `source` no lo usa
 * `analyzeOfferOutcome` (no forma parte de `PricewatchOfferLike`): lo lee `refresh.ts` aparte, sólo
 * para el conteo `bySource` del snapshot (final review M5, "qué fracción del día es MercadoLibre"). */
const OFFER_FIELDS = ["listingId", "vertical", "category", "productKey", "sellerKey", "sellerName", "title", "url", "currency", "firstSeen", "source"];

/**
 * Final review M7: `history` guarda hasta 120 puntos (`classes/pricewatch/record.ts`), pero
 * `analyzeOfferOutcome` sólo mira hoy más los `PRICE_EVENT_LOOKBACK_DAYS` (60) días previos — un doc
 * con 120 puntos manda por la red el DOBLE de lo que este job puede llegar a usar, todos los días,
 * por cada oferta. `$slice: -N` es una proyección de Mongo (recorta ANTES de que el documento cruce
 * la red, no un `.slice()` de JS después de traerlo entero); como `applyHistory` siempre reemplaza el
 * punto del día en su lugar y agrega los nuevos al final, el arreglo queda en orden cronológico
 * ascendente, así que los últimos `N` elementos SON los `N` días más recientes. `+1` es por HOY mismo
 * (60 previos + hoy = 61) — de sobra para el filtro de moneda/edad de `analyzeOfferOutcome`, que igual
 * descarta lo que quede fuera de la ventana.
 */
const HISTORY_PROJECTION_POINTS = PRICE_EVENT_LOOKBACK_DAYS + 1;

/** Toda vertical que hoy escribe en `pricewatchoffers` (equipar, sillas, la que se sume después) —
 * leído de los datos mismos, así que una vertical nueva no necesita tocar este archivo. Ordenado:
 * Mongo no promete ningún orden particular para `distinct()`, y sin ordenar acá el orden en que
 * `refresh.ts` recorre las verticales (y por lo tanto en que sus ofertas entran a `analyses`) podría
 * cambiar de una corrida a la otra — la misma razón por la que `aggregate.ts` desempata su propio
 * orden en vez de confiar en el orden de llegada. */
export async function loadVerticals(): Promise<string[]> {
  return (await PricewatchOfferModel.distinct("vertical")).sort();
}

/**
 * El `firstSeen` más viejo de toda la colección — desde cuándo existe el historial, sin importar la
 * vertical. Una consulta ordenada con `limit(1)` sobre el índice `{ firstSeen: 1 }`
 * (`classes/models/PricewatchOffer.ts`), nunca un escaneo para calcular un mínimo que Mongo ya sabe
 * resolver con un índice.
 */
export async function loadTrackingSince(): Promise<string | null> {
  // Sin generic en `.lean()`: los tipos de mongoose de esta base no siempre reproducen ese genérico
  // limpio contra `tsc -p tsconfig.production.json` (ver el mismo comentario en
  // `classes/rentals/store.ts`); se castea al leer en vez de pelear con el tipo acá.
  const rows = await PricewatchOfferModel.find({}, { firstSeen: 1, _id: 0 }).sort({ firstSeen: 1 }).limit(1).lean();
  const oldest = rows[0] as unknown as { firstSeen?: string } | undefined;
  return oldest?.firstSeen ?? null;
}

/**
 * Las ofertas de UNA vertical vistas HOY, como cursor — nunca carga la vertical entera en memoria.
 * El filtro `{ vertical, lastSeen: today }` calza con el índice compuesto existente `{ vertical: 1,
 * lastSeen: 1 }` (no hace falta uno nuevo), y `.select()` recorta a los campos que
 * {@link PricewatchOfferLike} necesita antes de que el documento cruce la red.
 */
export function offersSeenTodayByVertical(vertical: string, today: string) {
  const projection: Record<string, unknown> = { history: { $slice: -HISTORY_PROJECTION_POINTS } };
  for (const field of OFFER_FIELDS) projection[field] = 1;
  return PricewatchOfferModel.find({ vertical, lastSeen: today }).select(projection).lean().cursor();
}

/** Sólo el `eligible` del snapshot `current` publicado — lo único que necesita la guarda de corrida
 * flaca, sin hidratar `topDrops`/`sellers`. `null` cuando todavía no se publicó ningún snapshot. */
export async function loadCurrentEligible(): Promise<number | null> {
  const current = await PriceEventSnapshotModel.findOne({ key: "current" }, { eligible: 1, _id: 0 }).lean();
  const row = current as unknown as { eligible?: number } | null;
  return row ? (row.eligible ?? 0) : null;
}

/**
 * Publica el día: el documento archivo (`key: "day:YYYY-MM-DD"`, nunca se vuelve a tocar salvo por
 * la poda) y el puntero `current` que lee la API — dos `updateOne` en paralelo, mismo patrón que
 * `ChairCatalogMetaModel.updateOne(..., { $set: meta }, ...)` en `classes/chairs/store.ts` (un
 * `bulkWrite` tipado rechaza un `$set` de documento completo: sus overloads exigen rutas con punto).
 * `current` es una copia con `key` reemplazado, no una referencia al mismo objeto: cada documento de
 * Mongo necesita su propio `key`.
 *
 * Las dos escrituras NO son atómicas entre sí (sin transacción multi-documento) — mismo trade-off ya
 * aceptado en `classes/chairs/store.ts` para su propio par catálogo/meta; si el proceso muere entre
 * medio, la próxima corrida vuelve a poner ambas de acuerdo.
 */
export async function saveSnapshot(snapshot: PriceEventSnapshot): Promise<void> {
  await Promise.all([
    PriceEventSnapshotModel.updateOne({ key: snapshot.key }, { $set: snapshot }, { upsert: true }),
    PriceEventSnapshotModel.updateOne({ key: "current" }, { $set: { ...snapshot, key: "current" } }, { upsert: true }),
  ]);
}

/** Borra las filas `day:` de más de `days` días — nunca toca `current` (su `key` no empieza con
 * `day:`). `today` es un `YYYY-MM-DD`, así que el corte también es un string comparable. */
export async function pruneOldDaySnapshots(today: string, days: number): Promise<number> {
  const cutoff = new Date(Date.parse(`${today}T00:00:00.000Z`) - days * 86_400_000).toISOString().slice(0, 10);
  const { deletedCount } = await PriceEventSnapshotModel.deleteMany({
    key: { $regex: /^day:/ },
    day: { $lt: cutoff },
  });
  return deletedCount ?? 0;
}

// Registro de precio por AVISO de alquiler, escrito por la propia cosecha (`sync_rentals.ts`, diaria
// y horaria) en la misma colección `marketpricelogs` que ya escribe `currency-market-series`.
//
// Por qué existe, si market-series ya la escribe: ese job corre UNA vez por día (13:03 UTC), así que
// un precio que cambia a las 15 y vuelve a cambiar a las 20 queda como un solo punto, y uno que sube
// y baja dentro del mismo día no queda. La cosecha de alquileres corre cada hora, ve los mismos
// avisos y puede fechar el cambio con esa resolución. Ver docs/app/PRICE_CHANGES.md.
//
// La escritura es ATÓMICA por aviso (un pipeline de update, sin leer antes) a propósito: los dos
// escritores tocan las mismas filas y una lectura-modificación-escritura desde acá perdería los
// puntos que el otro acabara de agregar. Con el pipeline, cada corrida sólo agrega su propio punto.
import { appConnection } from "../appdb";
import { MARKET_LOG_COLLECTION } from "../marketseries/store";
import type { MarketPricePoint, MarketVertical } from "../marketseries/types";

/** El mismo tope que `classes/marketseries/log.ts`: la serie de un aviso no crece sin límite. */
export const MARKET_LOG_MAX_POINTS = 40;

/** Las fuentes que el seguimiento de alquileres reconoce (espejo de `classes/propertyzones/project.ts`). */
const RENTAL_SOURCES = new Set(["mercadolibre", "infocasas", "facebook", "casasweb", "elpais", "tiktok"]);

const NATIVE_ID = /^[\w-]{1,120}$/;
const RESERVED = new Set(["constructor", "prototype", "__proto__"]);

const lit = (value: unknown): { $literal: unknown } => ({ $literal: value });

/**
 * El id con el que `marketpricelogs` conoce a un aviso: `<fuente>:<id nativo>`, con el prefijo de la
 * fuente sacado si el `listingId` ya lo traía. Es la regla de `projectZoneObservations`, que es quien
 * escribió estas filas hasta hoy: si las dos partes no la calculan igual, el mismo aviso termina con
 * dos historias.
 */
export function marketAdvertId(source: unknown, listingId: unknown): string | null {
  if (typeof source !== "string" || typeof listingId !== "string") return null;
  if (!RENTAL_SOURCES.has(source)) return null;
  const native = listingId.startsWith(`${source}:`) ? listingId.slice(source.length + 1) : listingId;
  if (!NATIVE_ID.test(native) || RESERVED.has(native)) return null;
  return `${source}:${native}`;
}

/**
 * El gemelo en JS del pipeline de {@link marketLogOperation}, para poder fijar las reglas sin base de
 * datos: mismo precio y misma moneda que el último punto no agrega nada; un cambio dentro del mismo
 * día reemplaza el punto de ese día; y la serie se recorta al tope.
 */
export function applyMarketPoints(
  points: readonly MarketPricePoint[] | undefined,
  point: MarketPricePoint,
  maxPoints = MARKET_LOG_MAX_POINTS
): MarketPricePoint[] {
  const previous = points ?? [];
  const last = previous[previous.length - 1];
  if (last && last.p === point.p && last.c === point.c) return [...previous];
  const base = last && last.d === point.d ? previous.slice(0, -1) : previous;
  return [...base, point].slice(-maxPoints);
}

export interface MarketLogUpdateOp {
  updateOne: {
    filter: { key: string };
    update: object[];
    upsert: true;
  };
}

/**
 * El upsert de un aviso, como pipeline de update. Todo literal va envuelto en `$literal`: en un
 * pipeline, `$set` lee cualquier string que empiece con "$" como ruta de campo y escribiría
 * `undefined` en silencio (la trampa documentada en `docs/app/PRICEWATCH.md`).
 */
export function marketLogOperation(
  vertical: MarketVertical,
  advertId: string,
  point: MarketPricePoint,
  maxPoints = MARKET_LOG_MAX_POINTS
): MarketLogUpdateOp {
  const key = `${vertical}:${advertId}`;
  const previous = { $ifNull: ["$points", []] };
  return {
    updateOne: {
      filter: { key },
      update: [
        {
          $set: {
            key: lit(key),
            vertical: lit(vertical),
            advertId: lit(advertId),
            // `firstSeen` es el primer día que ESTE seguimiento vio el aviso y nunca se vuelve a tocar.
            firstSeen: { $ifNull: ["$firstSeen", lit(point.d)] },
            lastSeen: { $cond: [{ $gt: [lit(point.d), { $ifNull: ["$lastSeen", lit("")] }] }, lit(point.d), "$lastSeen"] },
            points: {
              $let: {
                vars: { prev: previous },
                in: {
                  $let: {
                    vars: { last: { $last: "$$prev" } },
                    in: {
                      $cond: [
                        { $and: [{ $eq: ["$$last.p", lit(point.p)] }, { $eq: ["$$last.c", lit(point.c)] }] },
                        "$$prev",
                        {
                          $slice: [
                            {
                              $concatArrays: [
                                {
                                  $cond: [
                                    { $eq: ["$$last.d", lit(point.d)] },
                                    { $slice: ["$$prev", 0, { $max: [0, { $subtract: [{ $size: "$$prev" }, 1] }] }] },
                                    "$$prev",
                                  ],
                                },
                                [lit(point)],
                              ],
                            },
                            -maxPoints,
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      ],
      upsert: true,
    },
  };
}

export interface MarketObservationRow {
  advertId: string;
  p: number;
  c: "UYU" | "USD";
}

/**
 * Los puntos que deja una cosecha de alquileres: uno por AVISO publicable. Un mismo aviso repetido en
 * dos propiedades (una separación a medio hacer) se queda con su precio más barato — el punto del día
 * es el precio de ese aviso, no un registro de cada vez que se lo vio, que es la misma regla de
 * `recordPricewatch`.
 */
export function marketObservationsFromRentals(properties: readonly { offers?: readonly any[] }[]): MarketObservationRow[] {
  const byAdvert = new Map<string, MarketObservationRow>();
  for (const property of properties) {
    for (const offer of property?.offers ?? []) {
      const advertId = marketAdvertId(offer?.source, offer?.listingId);
      if (!advertId) continue;
      const price = offer?.price;
      const currency = offer?.currency;
      if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) continue;
      if (currency !== "UYU" && currency !== "USD") continue;
      const existing = byAdvert.get(advertId);
      if (!existing || price < existing.p) byAdvert.set(advertId, { advertId, p: price, c: currency });
    }
  }
  return [...byAdvert.values()];
}

const BATCH = 1000;

/**
 * Escribe un punto por aviso visto en esta cosecha. Un fallo acá nunca debe costar el directorio que
 * ya se guardó, así que el llamador lo envuelve en su propio `try/catch` (la misma regla que
 * `recordPricewatch`). No poda nada: la poda de esta colección es de `currency-market-series`, que la
 * hace por vertical con su propia ventana de 120 días.
 */
export async function recordRentalPriceLogs(
  properties: readonly { offers?: readonly any[] }[],
  today: string
): Promise<{ written: number }> {
  const rows = marketObservationsFromRentals(properties);
  if (!rows.length) return { written: 0 };
  const collection = appConnection().collection(MARKET_LOG_COLLECTION);
  await collection.createIndex({ key: 1 }, { unique: true });
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows
      .slice(i, i + BATCH)
      .map((row) => marketLogOperation("alquiler", row.advertId, { d: today, p: row.p, c: row.c }));
    await collection.bulkWrite(batch as any, { ordered: false });
  }
  return { written: rows.length };
}

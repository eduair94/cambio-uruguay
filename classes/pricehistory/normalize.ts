// PURO: convierte los tres documentos que ya existen en la serie común de `types.ts`. Sin Mongo, sin
// Date.now(): todo lo que decide sale de sus argumentos, así los tests corren sin base y el "hoy" es
// siempre un parámetro (la misma regla que classes/pricewatch/record.ts y classes/priceevents).
import type {
  PriceHistoryChange,
  PriceHistoryCurrency,
  PriceHistoryPoint,
  PriceHistorySeries,
  PriceHistoryVertical,
} from "./types";
import { isPlaceholderPrice } from "./placeholder";

const VERTICALS: readonly PriceHistoryVertical[] = ["autos", "alquiler", "venta", "equipar", "sillas", "celulares", "movilidad"];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const isPriceHistoryVertical = (value: unknown): value is PriceHistoryVertical =>
  typeof value === "string" && (VERTICALS as readonly string[]).includes(value);

const isCurrency = (value: unknown): value is PriceHistoryCurrency => value === "UYU" || value === "USD";

const text = (value: unknown, max = 200): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= max ? value : null;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Un punto crudo: la moneda puede ser desconocida (`null`) — los puntos de pricewatch anteriores al
 * 2026-09-17 no llevan `c`, y "desconocida" NO es "otra". */
interface RawPoint {
  d: string;
  p: number;
  c: PriceHistoryCurrency | null;
}

const rawPoint = (d: unknown, p: unknown, c: unknown): RawPoint | null => {
  const day = typeof d === "string" ? d.slice(0, 10) : "";
  if (!DAY.test(day)) return null;
  if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) return null;
  // Un precio de relleno ("11111") no es un punto: el cambio que vendría después no lo hizo nadie.
  if (isPlaceholderPrice(p)) return null;
  return { d: day, p, c: isCurrency(c) ? c : null };
};

/**
 * La cola de puntos comparables: se camina desde el final hacia atrás y se corta en el primer punto
 * cuya moneda CONOCIDA no es la del último. Un punto sin moneda hereda la del aviso, que es la que la
 * última corrida escribió, así que nunca corta.
 *
 * Devuelve también si hubo corte: la ficha lo dice en palabras ("antes estaba publicado en otra
 * moneda") en vez de dibujar un salto que no es un cambio de precio.
 */
export function currencyTail(
  points: readonly RawPoint[],
  fallback: PriceHistoryCurrency
): { points: PriceHistoryPoint[]; currency: PriceHistoryCurrency; switched: boolean } {
  if (!points.length) return { points: [], currency: fallback, switched: false };
  const currency = points[points.length - 1]!.c ?? fallback;
  let start = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    const own = points[i]!.c;
    if (own && own !== currency) {
      start = i + 1;
      break;
    }
  }
  return {
    points: points.slice(start).map((point) => ({ d: point.d, p: point.p })),
    currency,
    switched: start > 0,
  };
}

/**
 * Un salto que ningún vendedor hace no es un cambio de precio, es un error de carga. `carlistings`
 * guarda el punto igual —`priceSanity.ts` retira el AVISO del catálogo, no el punto de su historia— y
 * la primera ficha publicada el 2026-09-22 anunciaba "subió 6.597,5 %" sobre un Chery Tiggo 8 que
 * había pasado de US$ 16.590 a US$ 1.111.111.
 *
 * El factor es 5, no 2: duplicar el precio de un alquiler pasa de verdad (15.000 -> 30.000, medido) y
 * la guarda no puede comerse un cambio real. Con TRES o más puntos se descarta el punto que se aparta
 * de la mediana de los demás, que es la misma mecánica de `classes/priceevents/analyze.ts`; con DOS
 * no hay mediana ni forma de saber cuál de los dos es el bueno, así que no se publica nada: de un
 * error de carga no se puede decir cómo cambió el precio.
 */
export const PRICE_HISTORY_MAX_RATIO = 5;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

export function plausiblePoints(points: readonly PriceHistoryPoint[]): PriceHistoryPoint[] | null {
  if (points.length < 2) return [...points];
  if (points.length === 2) {
    const ratio = points[1]!.p / points[0]!.p;
    return ratio > PRICE_HISTORY_MAX_RATIO || ratio < 1 / PRICE_HISTORY_MAX_RATIO ? null : [...points];
  }
  const kept = points.filter((point, index) => {
    const others = points.filter((_, other) => other !== index).map((other) => other.p);
    const reference = median(others);
    if (!(reference > 0)) return true;
    const ratio = point.p / reference;
    return ratio <= PRICE_HISTORY_MAX_RATIO && ratio >= 1 / PRICE_HISTORY_MAX_RATIO;
  });
  return kept.length ? kept : null;
}

/** Variación total y último cambio de precio de una serie ya recortada a una sola moneda. */
export function summarize(points: readonly PriceHistoryPoint[]): {
  changePct: number | null;
  lastChange: PriceHistoryChange | null;
} {
  if (points.length < 2) return { changePct: null, lastChange: null };
  const first = points[0]!;
  const last = points[points.length - 1]!;
  let lastChange: PriceHistoryChange | null = null;
  for (let i = points.length - 1; i > 0; i--) {
    const current = points[i]!;
    const previous = points[i - 1]!;
    if (current.p !== previous.p) {
      lastChange = { from: previous.p, to: current.p, at: current.d };
      break;
    }
  }
  return { changePct: round2(((last.p - first.p) / first.p) * 100), lastChange };
}

function build(
  base: Omit<PriceHistorySeries, "points" | "currency" | "changePct" | "lastChange" | "currencySwitched">,
  raw: readonly RawPoint[],
  fallback: PriceHistoryCurrency
): PriceHistorySeries | null {
  const tail = currencyTail(raw, fallback);
  if (!tail.points.length) return null;
  const points = plausiblePoints(tail.points);
  if (!points || !points.length) return null;
  return { ...base, ...summarize(points), points, currency: tail.currency, currencySwitched: tail.switched };
}

/** `pricewatchoffers`: un punto por día aunque el precio no cambie (equipar, sillas, celulares, movilidad). */
export function seriesFromPricewatch(doc: Record<string, any>): PriceHistorySeries | null {
  const id = text(doc?.listingId, 160);
  if (!id || !isPriceHistoryVertical(doc?.vertical)) return null;
  const fallback = isCurrency(doc?.currency) ? doc.currency : "UYU";
  const raw = (Array.isArray(doc?.history) ? doc.history : [])
    .map((point: any) => rawPoint(point?.d, point?.p, point?.c))
    .filter((point: RawPoint | null): point is RawPoint => point !== null);
  return build(
    {
      vertical: doc.vertical,
      id,
      title: text(doc?.title),
      url: text(doc?.url, 600),
      sellerName: text(doc?.sellerName, 160),
      sellerKey: text(doc?.sellerKey, 160),
      firstSeen: text(doc?.firstSeen, 10) ?? raw[0]?.d ?? "",
      lastSeen: text(doc?.lastSeen, 10) ?? raw[raw.length - 1]?.d ?? "",
      source: "pricewatch",
    },
    raw,
    fallback
  );
}

/** `carlistings.priceHistory`: un punto SÓLO cuando el precio cambia, con marca de tiempo completa. */
export function seriesFromCarListing(doc: Record<string, any>): PriceHistorySeries | null {
  const id = text(doc?.key, 160);
  if (!id) return null;
  const listing = doc?.listing ?? {};
  const fallback = isCurrency(listing?.currency) ? listing.currency : "USD";
  const raw = (Array.isArray(doc?.priceHistory) ? doc.priceHistory : [])
    .map((point: any) => rawPoint(point?.observedAt, point?.price, point?.currency))
    .filter((point: RawPoint | null): point is RawPoint => point !== null);
  return build(
    {
      vertical: "autos",
      id,
      title: text(listing?.title),
      url: text(listing?.url, 600),
      sellerName: text(listing?.sellerName, 160),
      sellerKey: text(listing?.sellerKey, 160),
      firstSeen: text(doc?.firstSeen, 10)?.slice(0, 10) ?? raw[0]?.d ?? "",
      lastSeen: text(doc?.lastSeen, 30)?.slice(0, 10) ?? raw[raw.length - 1]?.d ?? "",
      source: "carlistings",
    },
    raw,
    fallback
  );
}

/** `marketpricelogs`: un punto sólo al cambiar, sin título ni url — los completa quien lo muestra. */
export function seriesFromMarketLog(doc: Record<string, any>): PriceHistorySeries | null {
  const id = text(doc?.advertId, 160);
  if (!id || !isPriceHistoryVertical(doc?.vertical)) return null;
  const raw = (Array.isArray(doc?.points) ? doc.points : [])
    .map((point: any) => rawPoint(point?.d, point?.p, point?.c))
    .filter((point: RawPoint | null): point is RawPoint => point !== null);
  const fallback = raw[raw.length - 1]?.c ?? "UYU";
  return build(
    {
      vertical: doc.vertical,
      id,
      title: null,
      url: null,
      sellerName: null,
      sellerKey: null,
      firstSeen: text(doc?.firstSeen, 10) ?? raw[0]?.d ?? "",
      lastSeen: text(doc?.lastSeen, 10) ?? raw[raw.length - 1]?.d ?? "",
      source: "marketpricelogs",
    },
    raw,
    fallback
  );
}

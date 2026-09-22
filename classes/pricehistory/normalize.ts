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
  return { ...base, ...summarize(tail.points), points: tail.points, currency: tail.currency, currencySwitched: tail.switched };
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

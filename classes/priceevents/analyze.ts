// Plan D — CyberLunes/Black Friday: ¿el descuento es real? Análisis PURO de una oferta contra su
// propio historial (`pricewatchoffers`): sin Mongo, sin Date.now() — `today` siempre es un
// parámetro, así el mismo código sirve al job diario, al horario de evento y a este test.
import {
  PRICE_EVENT_DROP_DEN,
  PRICE_EVENT_DROP_NUM,
  PRICE_EVENT_INFLATED_DEN,
  PRICE_EVENT_INFLATED_NUM,
  PRICE_EVENT_LOOKBACK_DAYS,
  PRICE_EVENT_MIN_AGE_DAYS,
  PRICE_EVENT_MIN_POINTS,
  PriceEventAnalysis,
  PriceEventClass,
  PricewatchOfferLike,
} from "./types";
import type { PricewatchPoint } from "../pricewatch/types";

const MS_PER_DAY = 86_400_000;

/** Días calendario entre dos `YYYY-MM-DD` en UTC (mismo patrón que `classes/precios/staleness.ts`,
 * incluida la salida temprana en `NaN` ante una fecha ilegible en vez de dejar que se propague un
 * `NaN` silencioso desde la resta). */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Centavos enteros de un precio en moneda (`3.3` -> `330`, nunca `329` por el clásico
 * `3.3 * 100 === 329.99999999999994`). Multiplicar dos precios así redondeados y comparar los
 * productos enteros es exacto donde comparar los floats originales (`priorMax * 1.1`) no lo es: los
 * umbrales de esta clasificación son "≤"/"≥", así que un precio que cae EXACTO en el borde (110,00 %
 * o 90,00 %) tiene que clasificar, y un error de redondeo de `1e-13` en el float alcanza para que no
 * lo haga.
 */
function toCents(value: number): number {
  return Math.round(value * 100);
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Un mismo día (`d`) no debería repetirse dentro de `history` — el escritor (`applyHistory` en
 * `classes/pricewatch/record.ts`) filtra el punto viejo de ese día antes de anexar el nuevo, así que
 * en la base real hay como máximo un punto por fecha. Esta función es una defensa igual: si dos
 * puntos comparten `d` (un doc armado a mano, o un futuro escritor que no respete esa garantía), se
 * queda con el ÚLTIMO — mismo criterio que "un resync del mismo día reemplaza al anterior" — y nunca
 * cuenta el mismo día dos veces hacia `PRICE_EVENT_MIN_POINTS` ni hacia min/max/mediana.
 */
function dedupeByDay(points: readonly PricewatchPoint[]): PricewatchPoint[] {
  const byDay = new Map<string, PricewatchPoint>();
  for (const point of points) byDay.set(point.d, point);
  return [...byDay.values()];
}

function isTrackedCurrency(currency: string): currency is "UYU" | "USD" {
  return currency === "UYU" || currency === "USD";
}

/**
 * Compara el precio de HOY de una oferta contra su propio pasado — nunca contra otra oferta ni
 * contra una banda de mercado, que es lo que ya publican equipar/sillas. Devuelve `null` cuando la
 * oferta no califica para tener una opinión:
 *
 * - sin un punto de historial fechado exactamente `today`: no hay nada que evaluar hoy;
 * - `firstSeen` a menos de `PRICE_EVENT_MIN_AGE_DAYS` de `today`: todavía no tiene "pasado" propio;
 * - menos de `PRICE_EVENT_MIN_POINTS` DÍAS previos distintos dentro de la ventana: `priorMin/Max/
 *   Median` con 3 o 4 puntos son ruido, no una línea de base;
 * - moneda distinta de UYU/USD: no hay una tercera moneda que este job entienda todavía.
 *
 * "Previo" = un punto con `d` estrictamente antes de `today` (el punto de hoy nunca cuenta como su
 * propio previo, aunque exista) y a lo sumo `PRICE_EVENT_LOOKBACK_DAYS` días antes. La frontera de
 * los 60 días es INCLUSIVA a propósito: un punto de hace exactamente 60 días es tan parte de "la
 * temporada anterior" como uno de hace 59 — lo que se descarta es lo más viejo que eso, no el borde
 * mismo. (Ver los tests "includes/excludes a point exactly 60/61 days before today".)
 */
export function analyzeOffer(doc: PricewatchOfferLike, today: string): PriceEventAnalysis | null {
  if (!isTrackedCurrency(doc.currency)) return null;

  // Same "a repeat wins" rule as `dedupeByDay` below, applied to today's own point: a resync within
  // the same run (or a doc assembled by hand) can carry two entries dated `today`, and the writer's
  // own semantics (`applyHistory` in `classes/pricewatch/record.ts`) make the LAST one the current
  // price. Scanning from the end picks that one instead of silently grading a stale first entry.
  let todayPoint: PricewatchPoint | undefined;
  for (let i = doc.history.length - 1; i >= 0; i--) {
    if (doc.history[i]!.d === today) {
      todayPoint = doc.history[i];
      break;
    }
  }
  if (!todayPoint) return null;

  const age = daysBetween(doc.firstSeen, today);
  if (!Number.isFinite(age) || age < PRICE_EVENT_MIN_AGE_DAYS) return null;

  const priorCandidates = doc.history.filter((point) => {
    if (point.d === today) return false;
    const pointAge = daysBetween(point.d, today);
    return Number.isFinite(pointAge) && pointAge > 0 && pointAge <= PRICE_EVENT_LOOKBACK_DAYS;
  });
  const priorPoints = dedupeByDay(priorCandidates);
  if (priorPoints.length < PRICE_EVENT_MIN_POINTS) return null;

  const priorPrices = priorPoints.map((point) => point.p);
  const priorMin = Math.min(...priorPrices);
  const priorMax = Math.max(...priorPrices);
  const priorMedian = median(priorPrices);

  const priceCents = toCents(todayPoint.p);
  const priorMinCents = toCents(priorMin);
  const priorMaxCents = toCents(priorMax);

  const classes: PriceEventClass[] = [];
  let dropPct: number | null = null;

  if (priceCents * PRICE_EVENT_DROP_DEN <= priorMinCents * PRICE_EVENT_DROP_NUM) {
    classes.push("baja-real");
    dropPct = Math.round((1 - priceCents / priorMinCents) * 1000) / 10;
  }

  // `lp` (cuando no es null) es SIEMPRE mayor que `p` por construcción del escritor
  // (`listPriceOf` en `classes/retail/price.ts` sólo devuelve un precio de lista cuando supera al
  // precio de venta) — no hace falta un chequeo extra acá para esa relación.
  const listPrice = todayPoint.lp;
  if (listPrice !== null) {
    const listPriceCents = toCents(listPrice);
    if (listPriceCents * PRICE_EVENT_INFLATED_DEN >= priorMaxCents * PRICE_EVENT_INFLATED_NUM) {
      classes.push("tachado-por-encima");
    }
  }

  if (classes.length === 0) classes.push("precio-de-siempre");

  return {
    listingId: doc.listingId,
    vertical: doc.vertical,
    category: doc.category,
    productKey: doc.productKey,
    sellerKey: doc.sellerKey,
    sellerName: doc.sellerName,
    title: doc.title,
    url: doc.url,
    currency: doc.currency,
    price: todayPoint.p,
    listPrice,
    priorMin,
    priorMax,
    priorMedian,
    priorPoints: priorPoints.length,
    classes,
    dropPct,
  };
}

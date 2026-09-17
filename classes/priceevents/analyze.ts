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
  PRICE_EVENT_PLAUSIBLE_MAX_RATIO,
  PRICE_EVENT_PLAUSIBLE_MIN_RATIO,
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

/** Resultado de {@link analyzeOfferOutcome}: la misma decisión que devolvía `analyzeOffer`, más una
 * señal aparte para distinguir un descarte "todavía no tiene historial suficiente" (normal, ver
 * `docs/app/PRICE_EVENTS.md`) de un descarte "el precio de hoy no es creíble contra su propia
 * mediana" (síntoma de un problema de datos: mezcla de monedas, un precio de lista sin parsear bien,
 * un placeholder). */
export interface PriceEventOfferOutcome {
  analysis: PriceEventAnalysis | null;
  /** `true` sólo cuando la oferta fue descartada por la guarda de plausibilidad (I2a) — nunca por
   * edad, por falta de puntos previos o por moneda no soportada. */
  suspect: boolean;
}

const NOT_ANALYZED: PriceEventOfferOutcome = { analysis: null, suspect: false };

/**
 * Compara el precio de HOY de una oferta contra su propio pasado — nunca contra otra oferta ni
 * contra una banda de mercado, que es lo que ya publican equipar/sillas. `analysis` es `null` cuando
 * la oferta no califica para tener una opinión:
 *
 * - sin un punto de historial fechado exactamente `today`: no hay nada que evaluar hoy;
 * - `firstSeen` a menos de `PRICE_EVENT_MIN_AGE_DAYS` de `today`: todavía no tiene "pasado" propio;
 * - menos de `PRICE_EVENT_MIN_POINTS` DÍAS previos distintos dentro de la ventana (una vez filtrada
 *   la moneda, ver abajo): `priorMin/Max/Median` con 3 o 4 puntos son ruido, no una línea de base;
 * - moneda distinta de UYU/USD: no hay una tercera moneda que este job entienda todavía;
 * - (I2a) el precio de hoy, o su precio de lista, cae fuera de `[1/5, 5]` veces `priorMedian` —
 *   `suspect: true` en este único caso, ver {@link PriceEventOfferOutcome}.
 *
 * "Previo" = un punto con `d` estrictamente antes de `today` (el punto de hoy nunca cuenta como su
 * propio previo, aunque exista), a lo sumo `PRICE_EVENT_LOOKBACK_DAYS` días antes, Y (I2b) con la
 * MISMA moneda que el punto de hoy cuando los dos la declaran (`PricewatchPoint.c`, opcional): un
 * punto viejo en otra moneda no es "un precio más bajo", es una unidad distinta, y promediarlo con el
 * resto inventaría un mínimo/máximo/mediana sin sentido. Un punto sin `c` (escrito antes de que ese
 * campo existiera) nunca se filtra por esta regla — queda a cargo de la guarda de plausibilidad (I2a)
 * de arriba. La frontera de los 60 días es INCLUSIVA a propósito: un punto de hace exactamente 60
 * días es tan parte de "la temporada anterior" como uno de hace 59 — lo que se descarta es lo más
 * viejo que eso, no el borde mismo. (Ver los tests "includes/excludes a point exactly 60/61 days
 * before today".)
 */
export function analyzeOfferOutcome(doc: PricewatchOfferLike, today: string): PriceEventOfferOutcome {
  if (!isTrackedCurrency(doc.currency)) return NOT_ANALYZED;

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
  if (!todayPoint) return NOT_ANALYZED;

  const age = daysBetween(doc.firstSeen, today);
  if (!Number.isFinite(age) || age < PRICE_EVENT_MIN_AGE_DAYS) return NOT_ANALYZED;

  const todayCurrency = todayPoint.c;
  const priorCandidates = doc.history.filter((point) => {
    if (point.d === today) return false;
    const pointAge = daysBetween(point.d, today);
    if (!Number.isFinite(pointAge) || pointAge <= 0 || pointAge > PRICE_EVENT_LOOKBACK_DAYS) return false;
    // I2b: a prior point whose OWN currency is known and differs from today's known currency is not
    // "a lower price", it is a different unit — drop it before it can pollute priorMin/Max/Median.
    // A point missing `c` (written before this field existed) is never filtered here.
    if (todayCurrency && point.c && point.c !== todayCurrency) return false;
    return true;
  });
  const priorPoints = dedupeByDay(priorCandidates);
  if (priorPoints.length < PRICE_EVENT_MIN_POINTS) return NOT_ANALYZED;

  const priorPrices = priorPoints.map((point) => point.p);
  const priorMin = Math.min(...priorPrices);
  const priorMax = Math.max(...priorPrices);
  const priorMedian = median(priorPrices);

  // I2a: today's price (and, when it exists, today's list price) must sit within a plausible band of
  // its own priorMedian, or this is far more likely a currency/unit mix-up than a real discount — 30
  // days flat at UYU 20.000 followed by a USD 500 "price" today is not a 97,5 % baja real. This runs
  // BEFORE the drop/inflated math below so an implausible offer never reaches either classification.
  const priceRatio = todayPoint.p / priorMedian;
  const listPrice = todayPoint.lp;
  const listPriceRatio = listPrice === null ? null : listPrice / priorMedian;
  const outOfBand = (ratio: number): boolean =>
    ratio < PRICE_EVENT_PLAUSIBLE_MIN_RATIO || ratio > PRICE_EVENT_PLAUSIBLE_MAX_RATIO;
  if (outOfBand(priceRatio) || (listPriceRatio !== null && outOfBand(listPriceRatio))) {
    return { analysis: null, suspect: true };
  }

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
  if (listPrice !== null) {
    const listPriceCents = toCents(listPrice);
    if (listPriceCents * PRICE_EVENT_INFLATED_DEN >= priorMaxCents * PRICE_EVENT_INFLATED_NUM) {
      classes.push("tachado-por-encima");
    }
  }

  if (classes.length === 0) classes.push("precio-de-siempre");

  return {
    suspect: false,
    analysis: {
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
    },
  };
}

/** Wrapper de compatibilidad: la mayoría de los llamadores (y casi todo este archivo de tests) sólo
 * necesitan el resultado clasificado, no la señal `suspect` — ver {@link analyzeOfferOutcome} para el
 * orquestador (`classes/priceevents/refresh.ts`), que sí la necesita para contarla en el snapshot. */
export function analyzeOffer(doc: PricewatchOfferLike, today: string): PriceEventAnalysis | null {
  return analyzeOfferOutcome(doc, today).analysis;
}

// Plan D — CyberLunes/Black Friday: ¿el descuento es real? Análisis PURO de una oferta contra su
// propio historial (`pricewatchoffers`): sin Mongo, sin Date.now() — `today` siempre es un
// parámetro, así el mismo código sirve al job diario, al horario de evento y a este test.
import {
  PRICE_EVENT_DROP_RATIO,
  PRICE_EVENT_INFLATED_RATIO,
  PRICE_EVENT_LOOKBACK_DAYS,
  PRICE_EVENT_MIN_AGE_DAYS,
  PRICE_EVENT_MIN_POINTS,
  PriceEventAnalysis,
  PriceEventClass,
  PricewatchOfferLike,
} from "./types";
import type { PricewatchPoint } from "../pricewatch/types";

const MS_PER_DAY = 86_400_000;

/** Días calendario entre dos `YYYY-MM-DD` en UTC (mismo patrón que `classes/precios/staleness.ts`). */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / MS_PER_DAY);
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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
 * - menos de `PRICE_EVENT_MIN_POINTS` puntos previos dentro de la ventana: `priorMin/Max/Median`
 *   con 3 o 4 puntos son ruido, no una línea de base;
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

  const todayPoint = doc.history.find((point) => point.d === today);
  if (!todayPoint) return null;

  const age = daysBetween(doc.firstSeen, today);
  if (!Number.isFinite(age) || age < PRICE_EVENT_MIN_AGE_DAYS) return null;

  const priorPoints: PricewatchPoint[] = doc.history.filter((point) => {
    if (point.d === today) return false;
    const pointAge = daysBetween(point.d, today);
    return Number.isFinite(pointAge) && pointAge > 0 && pointAge <= PRICE_EVENT_LOOKBACK_DAYS;
  });
  if (priorPoints.length < PRICE_EVENT_MIN_POINTS) return null;

  const priorPrices = priorPoints.map((point) => point.p);
  const priorMin = Math.min(...priorPrices);
  const priorMax = Math.max(...priorPrices);
  const priorMedian = median(priorPrices);

  const classes: PriceEventClass[] = [];
  let dropPct: number | null = null;

  if (todayPoint.p <= priorMin * PRICE_EVENT_DROP_RATIO) {
    classes.push("baja-real");
    dropPct = Math.round((1 - todayPoint.p / priorMin) * 1000) / 10;
  }

  const listPrice = todayPoint.lp;
  if (listPrice !== null && listPrice >= priorMax * PRICE_EVENT_INFLATED_RATIO) {
    classes.push("tachado-por-encima");
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

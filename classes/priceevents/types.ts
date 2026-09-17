// Plan D — CyberLunes/Black Friday: ¿el descuento es real? Tipos y umbrales compartidos por el
// análisis puro (analyze.ts), el agregado diario (Task 2, aggregate.ts) y el job (sync_price_events.ts).
import type { PricewatchPoint } from "../pricewatch/types";

/**
 * `baja-real`: el precio de hoy está por debajo de su propio mínimo de los últimos
 * `PRICE_EVENT_LOOKBACK_DAYS` días en al menos `1 - PRICE_EVENT_DROP_RATIO`.
 * `tachado-por-encima`: el precio de lista (tachado) de hoy está por encima del máximo de venta de
 * ese mismo período en al menos `PRICE_EVENT_INFLATED_RATIO - 1`.
 * `precio-de-siempre`: ninguna de las dos anteriores. Una oferta puede ser `baja-real` Y
 * `tachado-por-encima` a la vez (dos preguntas distintas sobre el mismo día), pero nunca
 * `precio-de-siempre` junto con otra — esa clase es "el resto".
 */
export type PriceEventClass = "baja-real" | "tachado-por-encima" | "precio-de-siempre";

/** Antigüedad mínima (`firstSeen` hasta hoy) para que una oferta pueda calificar. Inclusivo: 21
 * días exactos alcanza. Menos que eso, la propia oferta todavía no tiene "propio pasado" que
 * comparar — comparar contra dos semanas de historial sería medir ruido, no una campaña. */
export const PRICE_EVENT_MIN_AGE_DAYS = 21;

/** Cantidad mínima de puntos de precio previos (dentro de la ventana de `PRICE_EVENT_LOOKBACK_DAYS`,
 * sin contar el de hoy) para que priorMin/priorMax/priorMedian signifiquen algo. */
export const PRICE_EVENT_MIN_POINTS = 10;

/** Ventana de comparación: cuántos días antes de hoy cuentan como "previos". Ver `analyzeOffer`
 * para la frontera exacta (inclusiva del lado de hace 60 días). */
export const PRICE_EVENT_LOOKBACK_DAYS = 60;

/** Precio de hoy ≤ `priorMin × PRICE_EVENT_DROP_RATIO` clasifica como `baja-real`. */
export const PRICE_EVENT_DROP_RATIO = 0.9;

/** Precio de lista de hoy ≥ `priorMax × PRICE_EVENT_INFLATED_RATIO` clasifica como
 * `tachado-por-encima`. */
export const PRICE_EVENT_INFLATED_RATIO = 1.1;

/**
 * Forma estructural mínima que `analyzeOffer` lee de un documento de `pricewatchoffers`
 * (`classes/models/PricewatchOffer.ts`) — sólo los campos que de verdad usa, no el documento
 * entero, así una tarea futura (el job de Task 2) puede pasarle un doc `.lean()` de Mongo con
 * `.select()` recortado en vez de tener que hidratar el modelo completo.
 */
export interface PricewatchOfferLike {
  listingId: string;
  vertical: string;
  category: string | null;
  productKey: string | null;
  sellerKey: string;
  sellerName: string;
  title: string;
  url: string;
  currency: string;
  firstSeen: string;
  history: PricewatchPoint[];
}

/** Resultado de comparar una oferta contra su propio historial para un `today` dado. */
export interface PriceEventAnalysis {
  listingId: string;
  vertical: string;
  category: string | null;
  productKey: string | null;
  sellerKey: string;
  sellerName: string;
  title: string;
  url: string;
  currency: "UYU" | "USD";
  price: number;
  listPrice: number | null;
  priorMin: number;
  priorMax: number;
  priorMedian: number;
  priorPoints: number;
  classes: PriceEventClass[];
  dropPct: number | null;
}

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

/** Precio de hoy ≤ `priorMin × PRICE_EVENT_DROP_RATIO` clasifica como `baja-real`. Documentativa:
 * la comparación real en `analyze.ts` usa la fracción exacta de abajo, no este float. */
export const PRICE_EVENT_DROP_RATIO = 0.9;

/** Precio de lista de hoy ≥ `priorMax × PRICE_EVENT_INFLATED_RATIO` clasifica como
 * `tachado-por-encima`. Documentativa, mismo motivo que la de arriba. */
export const PRICE_EVENT_INFLATED_RATIO = 1.1;

/**
 * Misma regla de `baja-real` que `PRICE_EVENT_DROP_RATIO`, como fracción exacta de enteros
 * (9/10) en vez de un float: `priorMax * 1.1` puede aterrizar en `7700.000000000001` y perder un
 * umbral que cae justo en el borde (110 % exacto no clasificaría). `analyze.ts` compara
 * `p * DEN <= priorMin * NUM` en centavos enteros, que no tiene ese problema.
 */
export const PRICE_EVENT_DROP_NUM = 9;
export const PRICE_EVENT_DROP_DEN = 10;

/** Misma regla de `tachado-por-encima` que `PRICE_EVENT_INFLATED_RATIO`, como fracción exacta. */
export const PRICE_EVENT_INFLATED_NUM = 11;
export const PRICE_EVENT_INFLATED_DEN = 10;

/**
 * Guarda de plausibilidad (revisión final, hallazgo I2a): `history` no tiene moneda propia por punto
 * hasta que este mismo cambio la agrega (`PricewatchPoint.c`, opcional para compatibilidad), y ni
 * Fenicio ni Shopify garantizan una sola moneda por aviso a lo largo del tiempo — 1.730 ofertas UYU
 * conviven con avisos en USD en la misma colección. Sin este freno, 30 días a UYU 20.000 y hoy USD 500
 * clasificarían como una "baja real" del 97,5 %, que es una confusión de unidades, no un CyberLunes.
 * Si el precio de hoy (o su precio de lista) queda fuera de `[1/5, 5]` veces `priorMedian`, la oferta
 * NO se clasifica — ver `analyzeOfferOutcome` en `analyze.ts`, que la cuenta aparte como `suspect` en
 * vez de simplemente "sin historial suficiente".
 */
export const PRICE_EVENT_PLAUSIBLE_MIN_RATIO = 1 / 5;
export const PRICE_EVENT_PLAUSIBLE_MAX_RATIO = 5;

/**
 * `classes/retail/sources/mercadolibre.ts::mlToListing` falls back to the literal name "Mercado
 * Libre" whenever a listing's own seller has no usable name (`String(result.seller?.name ||
 * "Mercado Libre")`) — the same branch that produces `sellerKey: "ml:unknown"` when there is also no
 * numeric seller id (`mlSellerKey`). A seller id WITHOUT a name (`ml:<id>` paired with this literal
 * name) is just as unidentified for display purposes: it has no human-readable identity, only a
 * number nobody chose. Final review C1: neither case is a "store" — excluded from the sellers table,
 * relabeled in the drops table, and never sharing the per-seller cap with a real store.
 *
 * F2 (hallazgo 7): comparación insensible a mayúsculas/espacios (`.trim().toLowerCase()`) — un
 * nombre real que MercadoLibre nos mande como `"MERCADO LIBRE "` o `" mercado libre"` es el mismo
 * caso, no una tienda nueva. `sellerKey === "ml:unknown"` se chequea aparte del nombre porque ese
 * caso es siempre no-identificado sin importar qué diga `sellerName` (no debería llegar con otro
 * nombre, pero la función no depende de esa garantía).
 */
export const ML_UNKNOWN_SELLER_NAME = "Mercado Libre";
export const ML_UNKNOWN_SELLER_DISPLAY_NAME = "Vendedor sin identificar (Mercado Libre)";

export function isUnidentifiedMlSeller(sellerKey: string, sellerName: string): boolean {
  if (sellerKey === "ml:unknown") return true;
  return sellerKey.startsWith("ml:") && sellerName.trim().toLowerCase() === ML_UNKNOWN_SELLER_NAME.toLowerCase();
}

/** `ml:12345` -> `12345`; sólo tiene sentido llamarla con un `sellerKey` que ya empieza con `ml:`. */
function mlNumericId(sellerKey: string): string {
  return sellerKey.slice("ml:".length);
}

/**
 * El nombre a MOSTRAR para un vendedor — distinto del `sellerName` crudo en dos casos, los dos de
 * MercadoLibre (F2, hallazgo 7):
 *
 * - {@link isUnidentifiedMlSeller}: `ML_UNKNOWN_SELLER_DISPLAY_NAME` ("Vendedor sin identificar
 *   (Mercado Libre)") — ni id ni nombre, o el nombre literal de respaldo.
 * - `ml:<id>` con nombre VACÍO tras `.trim()` (un nombre de origen hecho sólo de espacios: no es el
 *   caso de arriba porque no es literalmente "Mercado Libre", pero tampoco hay nada legible que
 *   mostrar) — se sintetiza `"Vendedor de Mercado Libre #<id>"`. A diferencia del caso anterior, ESTE
 *   vendedor SÍ es una identidad distinguible (un id numérico real) y por eso participa en `sellers`
 *   y en el tope de 3 bajas por su PROPIO `sellerKey`, nunca por `listingId` — ver `aggregate.ts`.
 *
 * Cualquier otro vendedor (con nombre real, sea de MercadoLibre o de otra fuente) devuelve
 * `sellerName` sin tocar.
 */
export function mlDisplaySellerName(sellerKey: string, sellerName: string): string {
  if (isUnidentifiedMlSeller(sellerKey, sellerName)) return ML_UNKNOWN_SELLER_DISPLAY_NAME;
  if (sellerKey.startsWith("ml:") && sellerKey !== "ml:unknown" && sellerName.trim() === "") {
    return `Vendedor de Mercado Libre #${mlNumericId(sellerKey)}`;
  }
  return sellerName;
}

/**
 * Clave de comparación insensible a mayúsculas y acentos para detectar nombres "iguales" entre dos
 * vendedores (F2, hallazgo 8: antes la comparación era exacta y "PRONTOMETAL" vs. "Prontometal" no
 * se detectaba como el mismo nombre). Sólo pliega acentos y caja, nunca espacios internos — "Pronto
 * Metal" sigue siendo un nombre distinto de "Prontometal", no se adivina esa coincidencia.
 */
export function foldSellerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

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

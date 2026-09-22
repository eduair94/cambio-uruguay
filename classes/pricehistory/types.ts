// La forma común a la que se normalizan las TRES series de precio por aviso que el sitio ya escribe:
// `pricewatchoffers` (equipar/sillas/celulares/movilidad), `carlistings.priceHistory` (autos) y
// `marketpricelogs` (alquiler/venta/autos). No hay una cuarta colección: esto es sólo un lector.
//
// Ver docs/superpowers/specs/2026-09-22-cambios-de-precio-design.md y docs/app/PRICE_CHANGES.md.

export type PriceHistoryVertical = "autos" | "alquiler" | "venta" | "equipar" | "sillas" | "celulares" | "movilidad";

export type PriceHistoryCurrency = "UYU" | "USD";

/** Un día, un precio. La moneda no viaja por punto: una serie es de UNA sola moneda (ver D2). */
export interface PriceHistoryPoint {
  d: string;
  p: number;
}

export interface PriceHistoryChange {
  from: number;
  to: number;
  at: string;
}

/**
 * La serie de un aviso. `title`/`url`/`sellerName`/`sellerKey` son `null` cuando la fuente no los
 * guarda: `marketpricelogs` sólo tiene el id del aviso, y quien la muestra (la ficha) ya tiene el
 * título delante. El job de la página los completa cruzando el catálogo público correspondiente.
 */
export interface PriceHistorySeries {
  vertical: PriceHistoryVertical;
  id: string;
  title: string | null;
  url: string | null;
  sellerName: string | null;
  sellerKey: string | null;
  currency: PriceHistoryCurrency;
  points: PriceHistoryPoint[];
  /** El primer día que NOSOTROS vimos el aviso, no la fecha de publicación del portal. */
  firstSeen: string;
  lastSeen: string;
  /** Último punto contra el primero de la misma moneda, en %. `null` con un solo punto. */
  changePct: number | null;
  lastChange: PriceHistoryChange | null;
  /** Hubo puntos en otra moneda: lo anterior al corte no es comparable y no se publica. */
  currencySwitched: boolean;
  source: "pricewatch" | "carlistings" | "marketpricelogs";
}

/** Una fila de la página de últimos cambios. */
export interface PriceChange {
  vertical: PriceHistoryVertical;
  id: string;
  title: string;
  /** A donde va el lector: la ficha propia del sitio (autos, alquiler, venta) o, cuando el aviso no
   * tiene ficha propia, la oferta en la tienda. `external` distingue las dos. */
  url: string;
  external: boolean;
  sellerName: string | null;
  sellerKey: string | null;
  from: number;
  to: number;
  currency: PriceHistoryCurrency;
  at: string;
  /** (to - from) / from * 100, con dos decimales. Negativo = bajó. */
  pct: number;
  direction: "baja" | "suba";
}

export interface PriceChangeVerticalSummary {
  vertical: PriceHistoryVertical;
  /** Avisos con documento de historial. */
  tracked: number;
  /** Avisos con dos o más puntos comparables. */
  withHistory: number;
  drops: number;
  rises: number;
  /** El `firstSeen` más viejo de la vertical: desde cuándo medimos. */
  trackingSince: string | null;
}

export interface PriceChangeSnapshot {
  key: string;
  day: string;
  generatedAt: string;
  windowDays: number;
  verticals: PriceChangeVerticalSummary[];
  changes: PriceChange[];
}

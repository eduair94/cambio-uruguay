// El registro de movimientos del tablero regional: una fila por cada vez que un
// precio cambió, por poco que haya sido.
//
// La colección diaria guarda **un punto por día**, y ese punto se sobrescribe en
// cada corrida: al terminar el día lo que queda es el cierre. Sirve para dibujar
// treinta años de PTAX y no sirve para nada de lo que pasa adentro de un día —
// no dice cuántas veces se movió el blue, ni a qué hora, ni si el turismo
// brasileño subió antes o después del fixing.
//
// Esto es la otra mitad: cada corrida compara lo que acaba de leer contra el
// último estado conocido de cada mercado y escribe una fila por diferencia.
// **No hay umbral mínimo**: un guaraní, un centavo de real o una diezmilésima de
// peso uruguayo entran igual. Un umbral parece prudente y es una decisión
// editorial disfrazada de higiene — quien consuma el ledger puede filtrar por el
// tamaño que le importe; lo que no puede es recuperar lo que nunca se guardó.
//
// La RESOLUCIÓN, en cambio, es la del trabajo: se ve lo que hay cuando se mira.
// Con el job cada diez minutos, dos movimientos dentro de la misma ventana se
// registran como uno solo, del primer valor al último. Por eso cada fila lleva
// `observedAt` (cuándo lo vimos) y `sourceUpdatedAt` (cuándo dice la fuente que
// se fijó): si la segunda no se movió entre dos lecturas, el mercado tampoco.
import type { RegionalQuote } from "./types";

/** Una fila del ledger: el paso de un precio al siguiente. */
export interface RegionalChange {
  /** `${country}:${market}:${base}${quote}` — la misma clave del tablero. */
  key: string;
  country: string;
  market: string;
  base: string;
  quote: string;
  /** Quién publicó el valor nuevo. */
  source: string;
  previousBuy: number | null;
  previousSell: number | null;
  previousAvg: number;
  buy: number | null;
  sell: number | null;
  avg: number;
  buyChanged: boolean;
  sellChanged: boolean;
  /** Variación del punto medio, en porcentaje. Firmada. */
  changePct: number;
  /** Cuándo lo vimos nosotros. */
  observedAt: Date;
  /** Cuándo dice la fuente que fijó el valor nuevo. */
  sourceUpdatedAt: string;
  /** Cuánto tiempo pasó desde la lectura anterior de ese mercado, en minutos. */
  sinceMinutes: number | null;
}

/** El último estado conocido de un mercado, para comparar contra él. */
export interface RegionalState {
  key: string;
  buy: number | null;
  sell: number | null;
  avg: number;
  observedAt: Date;
}

const round = (value: number, decimals = 6): number => {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/**
 * Compara la lectura nueva contra el último estado conocido y devuelve una fila
 * por mercado que se movió.
 *
 * Un mercado que aparece por primera vez NO genera fila: no hay movimiento
 * cuando no había desde dónde moverse, y escribir uno inventaría una variación
 * del 0 % que después alguien va a contar como un cambio real.
 */
export function detectRegionalChanges(
  quotes: RegionalQuote[],
  previous: RegionalState[],
  observedAt: Date = new Date()
): RegionalChange[] {
  const byKey = new Map(previous.map((state) => [state.key, state]));
  const changes: RegionalChange[] = [];

  for (const quote of quotes) {
    const prior = byKey.get(quote.id);
    if (!prior) continue;

    const buyChanged = quote.buy !== prior.buy;
    const sellChanged = quote.sell !== prior.sell;
    const avgChanged = quote.avg !== prior.avg;
    if (!buyChanged && !sellChanged && !avgChanged) continue;

    const sinceMs = observedAt.getTime() - prior.observedAt.getTime();
    changes.push({
      key: quote.id,
      country: quote.country,
      market: quote.market,
      base: quote.base,
      quote: quote.quote,
      source: quote.source,
      previousBuy: prior.buy,
      previousSell: prior.sell,
      previousAvg: prior.avg,
      buy: quote.buy,
      sell: quote.sell,
      avg: quote.avg,
      buyChanged,
      sellChanged,
      changePct: prior.avg > 0 ? round((quote.avg / prior.avg - 1) * 100, 6) : 0,
      observedAt,
      sourceUpdatedAt: quote.updatedAt,
      sinceMinutes: Number.isFinite(sinceMs) && sinceMs >= 0 ? Math.round(sinceMs / 60_000) : null,
    });
  }

  return changes;
}

/** El estado que deja una corrida, para que la próxima compare contra él. */
export function statesFromQuotes(quotes: RegionalQuote[], observedAt: Date = new Date()): RegionalState[] {
  return quotes.map((quote) => ({
    key: quote.id,
    buy: quote.buy,
    sell: quote.sell,
    avg: quote.avg,
    observedAt,
  }));
}

/** Resumen de una corrida, para el log del job. */
export function summariseChanges(changes: RegionalChange[]): string {
  if (!changes.length) return "sin movimientos";
  const biggest = [...changes].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];
  return `${changes.length} movimientos, el mayor ${biggest.key} ${biggest.changePct > 0 ? "+" : ""}${biggest.changePct.toFixed(4)} %`;
}

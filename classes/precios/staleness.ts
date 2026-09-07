// El eje que las otras dos guardas no ven: cada local contra SU PROPIO pasado.
//
// Acá sale gratis, y eso es lo raro. En las pizarras de cambio hubo que
// construir la comparación contra el histórico propio para descubrir que un
// origen se había congelado; el SIPC manda la fecha en cada fila.
//
// Medido el 2026-09-07: 94 % de las filas son del día o del anterior, pero
// había 174 con fecha 27/08 y algunas de 12–15/08.
//
// No se borra nada: una góndola quieta puede ser un precio real. Se publica el
// estado, y una fila `stale` no puede ganar un ranking (ver `plausibility.ts`).
export type PrecioFreshness = "fresh" | "aging" | "stale";

export const FRESH_DAYS = 2;
export const STALE_DAYS = 14;

const MS_PER_DAY = 86_400_000;

/** Días calendario entre dos ISO `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Frescura de una fila según la fecha que declara el origen.
 *
 * Una fecha ilegible se trata como vieja y no como fresca a propósito: si el
 * error empujara la fila hacia "fresh", una fila sin antigüedad medible podría
 * encabezar el ranking, que es exactamente lo que esta guarda existe para
 * impedir.
 */
export function freshnessOf(sourceDay: string, today: string): PrecioFreshness {
  const age = daysBetween(sourceDay, today);
  if (!Number.isFinite(age)) return "stale";
  if (age <= FRESH_DAYS) return "fresh";
  if (age <= STALE_DAYS) return "aging";
  return "stale";
}

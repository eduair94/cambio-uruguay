// El historial PRIVADO de cada aviso: un punto sólo cuando cambia su precio o su moneda. Es lo que
// permite la medida de "misma oferta": el precio de hoy contra el propio precio de hace W días.
// Nunca se sirve campo a campo; la página sólo ve agregados.
import type { MarketObservation, MarketPriceLog, MarketPricePoint, MarketVertical } from "./types";

export const MARKET_LOG_MAX_POINTS = 40;
export const MARKET_LOG_RETENTION_DAYS = 120;

export const shiftDay = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);

export const marketLogKey = (vertical: MarketVertical, advertId: string): string => `${vertical}:${advertId}`;

/** The price in force on `day`, or null when we did not know the advert yet. */
export function priceAt(log: MarketPriceLog | undefined, day: string): MarketPricePoint | null {
  if (!log || log.firstSeen > day) return null;
  let found: MarketPricePoint | null = null;
  for (const point of log.points) {
    if (point.d > day) break;
    found = point;
  }
  return found;
}

/**
 * The log after today's observation. The observation's day is the catalogue's own lastSeen: a row the
 * harvester did not re-read today adds nothing. Returns the SAME object when nothing changed, so the
 * caller writes only what moved.
 */
export function nextLog(existing: MarketPriceLog | undefined, obs: MarketObservation): MarketPriceLog {
  const point: MarketPricePoint = { d: obs.seenDay, p: obs.price, c: obs.currency };
  if (!existing)
    return {
      key: marketLogKey(obs.vertical, obs.advertId),
      vertical: obs.vertical,
      advertId: obs.advertId,
      firstSeen: obs.seenDay,
      lastSeen: obs.seenDay,
      points: [point],
    };
  if (obs.seenDay < existing.lastSeen) return existing;
  const last = existing.points[existing.points.length - 1];
  const samePrice = !!last && last.p === point.p && last.c === point.c;
  if (samePrice && obs.seenDay === existing.lastSeen) return existing;
  const points = samePrice
    ? existing.points
    : (last && last.d === point.d ? [...existing.points.slice(0, -1), point] : [...existing.points, point]).slice(-MARKET_LOG_MAX_POINTS);
  return { ...existing, lastSeen: obs.seenDay, points };
}

export function marketLogPruneFilter(
  vertical: MarketVertical,
  today: string,
  days: number = MARKET_LOG_RETENTION_DAYS,
): { vertical: MarketVertical; lastSeen: { $lt: string } } {
  return { vertical, lastSeen: { $lt: shiftDay(today, -days) } };
}

// PURO: de las series normalizadas a las filas que publica /cambios-de-precio-uruguay.
//
// Una fila es un CAMBIO OBSERVADO por nosotros, no un veredicto: el titular es "qué se movió", no
// "qué comprar". La pregunta "¿es un descuento real?" la contesta /ciberlunes-y-black-friday-uruguay,
// que compara contra el propio mínimo de 60 días y exige antigüedad (docs/app/PRICE_EVENTS.md).
import type { PriceChange, PriceHistorySeries } from "./types";

export const PRICE_CHANGE_WINDOW_DAYS = 7;
/** Un anunciante que retoca 40 precios el mismo día no puede comerse la tabla de su vertical. */
export const PRICE_CHANGE_PER_SELLER = 3;
export const PRICE_CHANGE_PER_VERTICAL = 25;

const shiftDay = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * La fila de una serie, si su último cambio cae dentro de la ventana. Sin título o sin url no hay
 * fila: la página lista avisos que el lector puede abrir, y un id suelto no es eso.
 */
export function changeFromSeries(series: PriceHistorySeries, today: string, windowDays: number): PriceChange | null {
  const change = series.lastChange;
  if (!change || !series.title || !series.url) return null;
  if (change.at > today || change.at < shiftDay(today, -windowDays)) return null;
  if (!(change.from > 0) || !(change.to > 0) || change.from === change.to) return null;
  return {
    vertical: series.vertical,
    id: series.id,
    title: series.title,
    url: series.url,
    sellerName: series.sellerName,
    sellerKey: series.sellerKey,
    from: change.from,
    to: change.to,
    currency: series.currency,
    at: change.at,
    pct: round2(((change.to - change.from) / change.from) * 100),
    direction: change.to < change.from ? "baja" : "suba",
  };
}

export interface RankOptions {
  perSeller?: number;
  perVertical?: number;
}

/**
 * Orden determinista: primero la magnitud del cambio, después la fecha más nueva y por último el id,
 * para que dos corridas con los mismos datos publiquen exactamente la misma tabla.
 */
export function rankChanges(changes: readonly PriceChange[], options: RankOptions = {}): PriceChange[] {
  const perSeller = options.perSeller ?? PRICE_CHANGE_PER_SELLER;
  const perVertical = options.perVertical ?? PRICE_CHANGE_PER_VERTICAL;
  const sorted = [...changes].sort(
    (a, b) => Math.abs(b.pct) - Math.abs(a.pct) || (a.at < b.at ? 1 : a.at > b.at ? -1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  const bySeller = new Map<string, number>();
  const byVertical = new Map<string, number>();
  const kept: PriceChange[] = [];
  for (const change of sorted) {
    const verticalCount = byVertical.get(change.vertical) ?? 0;
    if (verticalCount >= perVertical) continue;
    // Un aviso sin vendedor conocido (particular en un portal que no lo declara) no comparte cupo con
    // otro: agruparlos bajo una clave vacía los haría competir entre sí sin motivo.
    if (change.sellerKey) {
      const sellerCount = bySeller.get(`${change.vertical}:${change.sellerKey}`) ?? 0;
      if (sellerCount >= perSeller) continue;
      bySeller.set(`${change.vertical}:${change.sellerKey}`, sellerCount + 1);
    }
    byVertical.set(change.vertical, verticalCount + 1);
    kept.push(change);
  }
  return kept;
}

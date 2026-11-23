// Qué fichas de moto leer en esta corrida, y en qué orden.
//
// La lección que esta cola no repite es la de Casasweb (`docs/app/RENTALS.md`): una cola que guarda
// sólo lo que salió bien se traba, porque los mismos avisos muertos la encabezan corrida tras corrida
// y sus fallas consecutivas la cortan. Acá toda lectura deja rastro: la buena en `detail`, la fallida
// en `detailError` (espera un día) y la del aviso borrado en `detailGoneAt` (espera una semana).
import { ML_MOTOS_PERMALINK_PREFIX } from "./sources/mercadolibre";
import type { StoredMoto } from "./types";

export interface MotoDetailTarget {
  key: string;
  permalink: string;
  reason: "nuevo" | "vencido";
}

export const MOTO_DETAIL_ERROR_WAIT_DAYS = 1;
export const MOTO_DETAIL_GONE_WAIT_DAYS = 7;
/** Sólo los avisos que el directorio todavía publica: los mismos 4 días del catálogo, más uno de margen. */
export const MOTO_DETAIL_FRESH_DAYS = 5;

const days = (ms: number): number => ms / 86_400_000;

/**
 * Los nunca leídos primero (los vistos más recientemente arriba: son los que la página muestra hoy),
 * después los que tienen la ficha vieja, de la más vieja a la más nueva.
 */
export function motoDetailTargets(
  stored: readonly StoredMoto[],
  options: { now: Date; refreshDays: number }
): MotoDetailTarget[] {
  const now = options.now.getTime();
  const fresh: MotoDetailTarget[] = [];
  const stale: Array<MotoDetailTarget & { readAt: string }> = [];
  const neverRead: Array<MotoDetailTarget & { lastSeen: string }> = [];
  for (const doc of stored) {
    const permalink = doc.listing?.permalink ?? "";
    if (doc.retiredAt || !permalink.startsWith(ML_MOTOS_PERMALINK_PREFIX)) continue;
    if (days(now - Date.parse(doc.lastSeen)) > MOTO_DETAIL_FRESH_DAYS) continue;
    if (doc.detailGoneAt && days(now - Date.parse(doc.detailGoneAt)) < MOTO_DETAIL_GONE_WAIT_DAYS) continue;
    if (doc.detailError && days(now - Date.parse(doc.detailError.at)) < MOTO_DETAIL_ERROR_WAIT_DAYS) continue;
    if (!doc.detail) {
      neverRead.push({ key: doc.key, permalink, reason: "nuevo", lastSeen: doc.lastSeen });
    } else if (days(now - Date.parse(doc.detail.readAt)) >= options.refreshDays) {
      stale.push({ key: doc.key, permalink, reason: "vencido", readAt: doc.detail.readAt });
    }
  }
  neverRead.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen) || a.key.localeCompare(b.key));
  stale.sort((a, b) => a.readAt.localeCompare(b.readAt) || a.key.localeCompare(b.key));
  for (const { key, permalink, reason } of [...neverRead, ...stale]) fresh.push({ key, permalink, reason });
  return fresh;
}

/**
 * ¿La corrida se cayó? Sólo si hubo al menos cinco fallas y ninguna lectura buena: con el atraso ya
 * leído, la cola horaria trae dos o tres avisos y un 5xx suelto la marcaba como caída (y abría un
 * issue en Sentry) sin que nada estuviera roto.
 */
export const MOTO_DETAIL_BROKEN_MIN_FAILURES = 5;

export function motoDetailRunBroken(run: { targets: number; read: number; failed: number }): boolean {
  return run.targets > 0 && run.read === 0 && run.failed >= MOTO_DETAIL_BROKEN_MIN_FAILURES;
}

export function motoDetailQueueSummary(targets: readonly MotoDetailTarget[]): Record<MotoDetailTarget["reason"], number> {
  return {
    nuevo: targets.filter(target => target.reason === "nuevo").length,
    vencido: targets.filter(target => target.reason === "vencido").length,
  };
}

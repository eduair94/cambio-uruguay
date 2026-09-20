// Un documento vivo en la base del APP, leído por `/estadisticas-de-busqueda` detrás de
// `requireAdmin`.
//
// PRIVADO, y por dos motivos acumulados, no uno. El primero lo hereda de su vecino de Search
// Console: acá están las consultas que la gente tipea, que son el activo competitivo del sitio. El
// segundo es propio y más caro: este documento lleva el RPM por familia, o sea CUÁNTO FACTURA cada
// sección. `classes/site-analytics/revenue.ts` ya tuvo que separar colección y ruta para que un
// `.select()` mal escrito no publicara la facturación en una página pública; este snapshot cruza
// las dos cosas, así que hereda esa regla entera. Nunca lo lee una ruta pública.
import { RevenuePlanSnapshotModel } from "../models/RevenuePlanSnapshot";
import { REVENUE_PLAN_KEY } from "./types";
import type { RevenuePlanSnapshot } from "./types";

/** Acciones publicadas por debajo de las cuales una corrida nueva parece una falla, no un plan. */
export const MIN_ACTIONS_FOR_GUARD = 10;
/** Fracción de lo guardado por debajo de la cual la corrida nueva no pisa. */
export const THIN_RUN_RATIO = 0.4;
/** Días después de los cuales una negativa deja de defender una foto vieja. */
export const REFUSAL_MAX_DAYS = 7;

export async function loadRevenuePlan(): Promise<RevenuePlanSnapshot | null> {
  return RevenuePlanSnapshotModel.findOne({ key: REVENUE_PLAN_KEY }).lean<RevenuePlanSnapshot>().exec();
}

/**
 * True cuando guardar esto perdería el plan bueno que ya está.
 *
 * El caso que ataja: `currency-gsc` falla o llega tarde, este job encuentra el snapshot viejo o
 * ninguno, y publica una cola vacía que en la pantalla se ve igual que "no hay nada para hacer".
 * La diferencia entre "no hay trabajo" y "no pude leer" es exactamente la que hace que alguien
 * cierre la pestaña.
 *
 * Y la negativa caduca, por la misma razón que en `site-analytics/store.ts`: si el sitio de verdad
 * se queda sin oportunidades —o las publicadas se ejecutaron todas— defender para siempre una foto
 * de hace un mes publica una mentira distinta.
 */
export function planIsThin(next: RevenuePlanSnapshot, previous: RevenuePlanSnapshot | null): boolean {
  if (!previous) return false;
  if (previous.actions.length < MIN_ACTIONS_FOR_GUARD) return false;
  if (next.actions.length >= previous.actions.length * THIN_RUN_RATIO) return false;
  return !refusalExpired(previous.asOf, next.asOf);
}

function refusalExpired(previousAsOf: string, nextAsOf: string): boolean {
  const before = Date.parse(`${previousAsOf}T00:00:00Z`);
  const now = Date.parse(`${nextAsOf}T00:00:00Z`);
  if (!Number.isFinite(before) || !Number.isFinite(now)) return false;
  return now - before > REFUSAL_MAX_DAYS * 86400000;
}

export async function saveRevenuePlan(snapshot: RevenuePlanSnapshot): Promise<void> {
  await RevenuePlanSnapshotModel.updateOne(
    { key: REVENUE_PLAN_KEY },
    { $set: { ...snapshot, key: REVENUE_PLAN_KEY } },
    { upsert: true }
  );
}

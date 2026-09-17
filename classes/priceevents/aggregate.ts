// Plan D — CyberLunes/Black Friday: agregado PURO del día — toma lo que `analyzeOffer` ya decidió
// para cada oferta (Task 1) y arma el documento que el job (Task 2, `sync_price_events.ts`) publica.
// Sin Mongo, sin Date.now() salvo para `generatedAt` (el único campo que documenta CUÁNDO se corrió,
// nunca usado para decidir nada dentro de esta función).
import type { PriceEvent } from "./calendar";
import type { PriceEventAnalysis } from "./types";

/** Por vertical: cuántas ofertas calificaron hoy y cuántas de esas cayeron en cada regla. Una
 * oferta puede contar en `drops` Y en `inflated` a la vez (ver `PriceEventAnalysis.classes`). */
export interface PriceEventVerticalStats {
  eligible: number;
  drops: number;
  inflated: number;
}

/** Un vendedor con al menos `PRICE_EVENT_MIN_SELLER_LISTINGS` ofertas con precio de lista hoy: sólo
 * conteo y proporción, nunca un adjetivo — la regla que lo define va escrita junto a la tabla que lo
 * muestra (AGENTS.md, "Sin acusaciones"). */
export interface PriceEventSellerStat {
  sellerKey: string;
  sellerName: string;
  withListPrice: number;
  inflated: number;
  /** `inflated / withListPrice`, como porcentaje con 1 decimal (mismo formato que `dropPct`). */
  share: number;
}

export interface PriceEventSnapshot {
  key: string;
  day: string;
  event: PriceEvent | null;
  generatedAt: string;
  trackingSince: string | null;
  /** Cuántas ofertas se leyeron hoy en total (con o sin punto calificado) — el denominador que hace
   * legible a `eligible` en el reporte de la corrida en seco. */
  analyzed: number;
  /** Cuántas de esas `analyzeOffer` no descartó (antigüedad + puntos previos + moneda soportada). */
  eligible: number;
  byVertical: Record<string, PriceEventVerticalStats>;
  drops: PriceEventAnalysis[];
  sellers: PriceEventSellerStat[];
}

/** Techo de la lista de bajas publicadas — una vitrina, no el dataset completo. */
export const PRICE_EVENT_MAX_DROPS = 200;
/** Ningún vendedor domina la vitrina de bajas con su propio catálogo entero. */
export const PRICE_EVENT_MAX_DROPS_PER_SELLER = 3;
/** Bajo esta cantidad de ofertas con precio de lista, "la mitad de las mías están infladas" no dice
 * nada — ver AGENTS.md, "requiere ≥ 5 ofertas con precio tachado ese día". */
export const PRICE_EVENT_MIN_SELLER_LISTINGS = 5;

/**
 * Agrega los análisis de UN día (todas las verticales juntas) en el documento que se publica.
 *
 * `analyses` lleva un elemento por oferta LEÍDA hoy — `null` cuando `analyzeOffer` la descartó — así
 * que `analyses.length` es el total leído y `eligible` (abajo) es cuántas de esas calificaron; sin
 * ese `null` de por medio, el reporte de la corrida en seco no podría distinguir "no hay ofertas" de
 * "hay ofertas pero ninguna con 21 días de historia todavía".
 */
export function buildPriceEventSnapshot(
  analyses: readonly (PriceEventAnalysis | null)[],
  today: string,
  event: PriceEvent | null,
  trackingSince: string | null
): PriceEventSnapshot {
  const eligible = analyses.filter((analysis): analysis is PriceEventAnalysis => analysis !== null);

  const byVertical: Record<string, PriceEventVerticalStats> = {};
  for (const analysis of eligible) {
    const stats = byVertical[analysis.vertical] ?? { eligible: 0, drops: 0, inflated: 0 };
    stats.eligible += 1;
    if (analysis.classes.includes("baja-real")) stats.drops += 1;
    if (analysis.classes.includes("tachado-por-encima")) stats.inflated += 1;
    byVertical[analysis.vertical] = stats;
  }

  // Ordenadas de la baja más grande a la más chica ANTES de aplicar el tope por vendedor, así el
  // resultado se queda ordenado igual: dentro de sus 3 lugares, cada vendedor entra con sus mejores
  // bajas primero, nunca con las últimas que sobraron.
  const droppedCandidates = eligible
    .filter((analysis) => analysis.classes.includes("baja-real") && analysis.dropPct !== null)
    .sort((a, b) => (b.dropPct as number) - (a.dropPct as number));

  const drops: PriceEventAnalysis[] = [];
  const dropsPerSeller = new Map<string, number>();
  for (const candidate of droppedCandidates) {
    if (drops.length >= PRICE_EVENT_MAX_DROPS) break;
    const count = dropsPerSeller.get(candidate.sellerKey) ?? 0;
    if (count >= PRICE_EVENT_MAX_DROPS_PER_SELLER) continue;
    drops.push(candidate);
    dropsPerSeller.set(candidate.sellerKey, count + 1);
  }

  const sellerTotals = new Map<string, { sellerName: string; withListPrice: number; inflated: number }>();
  for (const analysis of eligible) {
    if (analysis.listPrice === null) continue;
    const entry = sellerTotals.get(analysis.sellerKey) ?? {
      sellerName: analysis.sellerName,
      withListPrice: 0,
      inflated: 0,
    };
    entry.withListPrice += 1;
    if (analysis.classes.includes("tachado-por-encima")) entry.inflated += 1;
    sellerTotals.set(analysis.sellerKey, entry);
  }

  const sellers: PriceEventSellerStat[] = [...sellerTotals.entries()]
    .filter(([, totals]) => totals.withListPrice >= PRICE_EVENT_MIN_SELLER_LISTINGS)
    .map(([sellerKey, totals]) => ({
      sellerKey,
      sellerName: totals.sellerName,
      withListPrice: totals.withListPrice,
      inflated: totals.inflated,
      share: Math.round((totals.inflated / totals.withListPrice) * 1000) / 10,
    }))
    .sort((a, b) => a.sellerName.localeCompare(b.sellerName));

  return {
    key: `day:${today}`,
    day: today,
    event,
    generatedAt: new Date().toISOString(),
    trackingSince,
    analyzed: analyses.length,
    eligible: eligible.length,
    byVertical,
    drops,
    sellers,
  };
}

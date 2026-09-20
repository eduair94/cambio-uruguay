// Arma el plan: lee los tres snapshots que ya existen y los cruza. No sale a ninguna API.
//
// Esto es a propósito. `currency-gsc` ya pagó las llamadas a Search Console a las 11:20 y
// `currency-site-analytics` las de GA4 a las 10:51; este job corre después y no vuelve a pedir
// nada. Consecuencia práctica: no necesita credenciales nuevas, no tiene cuota que agotar, y si
// alguno de los dos falló, este no inventa datos — lo dice en una alerta y valúa lo que tenga.
import { loadDays, loadSnapshot } from "../gsc/store";
import type { GscDay, GscSnapshot } from "../gsc/types";
import { loadSiteRevenue } from "../site-analytics/store";
import type { RevenueSnapshot } from "../site-analytics/revenue";
import { EXPERIMENT_WINDOW_DAYS, loadSpecs, measureExperiments } from "./experiments";
import { DEFEND_KINDS, MAX_ACTIONS, MAX_DEFEND, UPSIDE_KINDS, buildPlanAlerts, familyLedger, priceActions, totalUpside } from "./plan";
import { REVENUE_PLAN_KEY } from "./types";
import type { ExperimentResult, ExperimentSpec, RevenuePlanSnapshot } from "./types";
import { buildValueTable } from "./value";

/**
 * Tope de días de archivo que una corrida puede traer a memoria.
 *
 * Cada documento del archivo lleva hasta 5.000 consultas y 3.000 páginas: doscientos días son
 * cientos de megabytes en un proceso que corre en un VPS compartido con veinte jobs más. El tope
 * existe para que agregar experimentos no degrade en silencio hasta que el job muera por OOM un
 * martes cualquiera.
 */
export const MAX_ARCHIVE_DAYS = 90;

/** Veredictos que ya no pueden cambiar: la ventana cerró con los días que tenía. */
const FINAL_VERDICTS = new Set(["mejoró", "sin cambio", "empeoró"]);

const dayShift = (day: string, delta: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86400000).toISOString().slice(0, 10);

/** Firma de un experimento: si cambió el sujeto, el veredicto guardado ya no le corresponde. */
const signatureOf = (spec: { shippedOn: string; routes: string[]; queries?: string[] }): string =>
  `${spec.shippedOn}|${spec.routes.slice().sort().join(",")}|${(spec.queries || []).slice().sort().join(",")}`;

export interface RefreshOptions {
  /** Hoy, `YYYY-MM-DD`. Los tests lo fijan. */
  today?: string;
  /** El plan anterior, para reusar veredictos ya cerrados en vez de releer el archivo. */
  previous?: RevenuePlanSnapshot | null;
}

export interface RefreshResult {
  snapshot: RevenuePlanSnapshot;
  /** Cuántos días de archivo se leyeron. Para el log. */
  archiveDaysRead: number;
}

/**
 * Decide qué experimentos hay que volver a medir y sobre qué rango de archivo.
 *
 * Un veredicto cerrado no se recalcula: su ventana es fija y el archivo de esos días ya no cambia.
 * Lo que sí se vuelve a medir es todo lo que está esperando y todo lo que quedó "sin datos", porque
 * un `--backfill` del job de Search Console puede haber agregado justo los días que faltaban.
 */
export function planExperimentWork(
  specs: ExperimentSpec[],
  previous: RevenuePlanSnapshot | null,
  maxDays = MAX_ARCHIVE_DAYS
): { measure: ExperimentSpec[]; reuse: ExperimentResult[]; from: string | null; to: string | null; dropped: ExperimentSpec[] } {
  const stored = new Map((previous?.experiments || []).map((e) => [e.id, e]));
  const measure: ExperimentSpec[] = [];
  const reuse: ExperimentResult[] = [];

  for (const spec of specs) {
    const prior = stored.get(spec.id);
    if (prior && FINAL_VERDICTS.has(prior.verdict) && signatureOf(prior) === signatureOf(spec)) {
      reuse.push({ ...prior, hypothesis: spec.hypothesis });
      continue;
    }
    measure.push(spec);
  }

  // Los más recientes primero: son los que están esperando veredicto y los que alguien está por
  // mirar. Si el rango no entra en el tope, lo que se cae es lo viejo, no lo que se acaba de subir.
  measure.sort((a, b) => b.shippedOn.localeCompare(a.shippedOn));

  const kept: ExperimentSpec[] = [];
  const dropped: ExperimentSpec[] = [];
  let from: string | null = null;
  let to: string | null = null;
  for (const spec of measure) {
    const specFrom = dayShift(spec.shippedOn, -EXPERIMENT_WINDOW_DAYS);
    const specTo = dayShift(spec.shippedOn, EXPERIMENT_WINDOW_DAYS);
    const nextFrom = from && from < specFrom ? from : specFrom;
    const nextTo = to && to > specTo ? to : specTo;
    const span = Math.round((Date.parse(`${nextTo}T00:00:00Z`) - Date.parse(`${nextFrom}T00:00:00Z`)) / 86400000) + 1;
    if (kept.length && span > maxDays) {
      dropped.push(spec);
      continue;
    }
    kept.push(spec);
    from = nextFrom;
    to = nextTo;
  }
  return { measure: kept, reuse, from, to, dropped };
}

export async function refreshRevenuePlan(options: RefreshOptions = {}): Promise<RefreshResult> {
  const today = options.today || new Date().toISOString().slice(0, 10);
  const previous = options.previous ?? null;

  const [gsc, revenue] = await Promise.all([
    loadSnapshot().catch(() => null as GscSnapshot | null),
    loadSiteRevenue().catch(() => null as RevenueSnapshot | null),
  ]);

  const table = buildValueTable(revenue);
  const opportunities = gsc?.opportunities || [];
  const actions = priceActions(opportunities, table, UPSIDE_KINDS).slice(0, MAX_ACTIONS);
  const defend = priceActions(opportunities, table, DEFEND_KINDS).slice(0, MAX_DEFEND);
  const families = familyLedger(gsc?.pageTypes || [], revenue, table);

  // ---- el ledger de cambios ----
  const { specs, problems, file } = loadSpecs();
  const work = planExperimentWork(specs, previous);
  let days: GscDay[] = [];
  if (work.measure.length && work.from && work.to) {
    // Sólo los campos que el ledger mira. `countries`/`devices` son chicos pero se piden igual en
    // todas las filas y no los usa nadie acá.
    days = await loadDays(work.from, work.to);
  }
  const measured = measureExperiments(work.measure, days, today);
  const experiments = [...measured, ...work.reuse].sort(
    (a, b) => b.shippedOn.localeCompare(a.shippedOn) || a.id.localeCompare(b.id)
  );

  const alerts = buildPlanAlerts({
    table,
    families,
    actions,
    gscAsOf: gsc?.asOf || null,
    revenueAsOf: revenue?.asOf || null,
    today,
  });

  for (const problem of problems) {
    alerts.push({ level: "warn", code: "experiments-file", message: `Libro de cambios: ${problem}` });
  }
  if (work.dropped.length) {
    alerts.push({
      level: "info",
      code: "experiments-capped",
      message:
        `${work.dropped.length} experimento(s) no se midieron en esta corrida por el tope de ${MAX_ARCHIVE_DAYS} días ` +
        `de archivo (${work.dropped.map((d) => d.id).join(", ")}). Se miden cuando los de arriba cierren.`,
    });
  }
  const waiting = experiments.filter((e) => e.verdict === "esperando").length;
  const closed = experiments.filter((e) => FINAL_VERDICTS.has(e.verdict));
  if (closed.length) {
    const won = closed.filter((e) => e.verdict === "mejoró").length;
    alerts.push({
      level: "info",
      code: "experiments-summary",
      message:
        `Libro de cambios: ${closed.length} con veredicto (${won} mejoraron), ${waiting} esperando. ` +
        (file ? `Declarados en ${file}.` : ""),
    });
  }

  const snapshot: RevenuePlanSnapshot = {
    key: REVENUE_PLAN_KEY,
    asOf: today,
    searchWindow: gsc?.window || { startDate: "", endDate: "" },
    revenueWindow: revenue?.range || { start: "", end: "" },
    currency: revenue?.currency || "USD",
    siteRpm: Math.round(table.siteRpm * 10000) / 10000,
    siteUsdPerClick: Math.round(table.siteUsdPerClick * 1000000) / 1000000,
    revenuePending: table.siteRpm <= 0,
    totalUpsideUsd: totalUpside(actions),
    actions,
    defend,
    families,
    experiments,
    alerts,
  };

  return { snapshot, archiveDaysRead: days.length };
}

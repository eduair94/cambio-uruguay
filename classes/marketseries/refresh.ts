// Un mercado por vez, cada uno en su propio try: un catálogo caído no frena a los otros dos.
// Orden: leer → emparejar contra el log de ANTES de hoy → escribir series → actualizar logs → podar →
// índice. Si el índice se escribe último, una corrida que muere a la mitad no anuncia cohortes nuevas.
import { appConnection } from "../appdb";
import { buildMarketDay } from "./build";
import { buildMarketIndex, marketTrackingSince } from "./indexDoc";
import { MARKET_READERS } from "./sources";
import {
  ensureMarketIndexes,
  loadMarketLogs,
  pruneMarketLogs,
  readMarketIndex,
  writeMarketIndex,
  writeMarketLogs,
  writeMarketRun,
  writeMarketSeries,
} from "./store";
import { MARKET_VERTICALS, type MarketVertical } from "./types";

export const MARKET_THIN_RATIO = 0.6;
const MARKET_THIN_FLOOR = 50;

/** A market whose read fell under 60 % of the previous run is an outage, not a market move. */
export function marketThinRun(current: number, previous: number | null | undefined): string | null {
  if (!previous || previous < MARKET_THIN_FLOOR) return null;
  return current < previous * MARKET_THIN_RATIO
    ? `${current} observaciones contra ${previous} de la corrida anterior (menos del ${MARKET_THIN_RATIO * 100} %)`
    : null;
}

export interface MarketVerticalResult {
  vertical: MarketVertical;
  ok: boolean;
  skipped: string | null;
  error: string | null;
  observations: number;
  adverts: number;
  groups: number;
  cohorts: number;
  logsWritten: number;
  logsPruned: number;
  excluded: Record<string, number>;
  /** The biggest cohorts, for the job log (a dry run is read from here). */
  sample: string[];
}

export async function refreshMarketSeries(
  options: { now?: Date; dryRun?: boolean; only?: readonly MarketVertical[] } = {},
): Promise<MarketVerticalResult[]> {
  const now = options.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  await appConnection().asPromise();
  if (!options.dryRun) await ensureMarketIndexes();
  const results: MarketVerticalResult[] = [];
  for (const vertical of options.only ?? MARKET_VERTICALS) {
    const result: MarketVerticalResult = {
      vertical,
      ok: false,
      skipped: null,
      error: null,
      observations: 0,
      adverts: 0,
      groups: 0,
      cohorts: 0,
      logsWritten: 0,
      logsPruned: 0,
      excluded: {},
      sample: [],
    };
    try {
      const read = await MARKET_READERS[vertical](now);
      result.observations = read.observations.length;
      result.excluded = read.excluded;
      const previous = await readMarketIndex(vertical);
      result.skipped = marketThinRun(read.observations.length, previous?.observations);
      if (!result.skipped) {
        const day = buildMarketDay({
          vertical,
          today,
          observations: read.observations,
          logs: await loadMarketLogs(vertical),
          trackingSince: marketTrackingSince(previous, today),
        });
        const index = buildMarketIndex({
          vertical,
          today,
          generatedAt: now.toISOString(),
          dataAsOf: read.dataAsOf,
          previous,
          entries: day.entries,
          observations: read.observations.length,
          excluded: read.excluded,
        });
        result.adverts = day.adverts;
        result.groups = day.groups;
        result.cohorts = day.entries.length;
        result.logsWritten = day.logs.length;
        result.sample = [...day.entries]
          .sort((a, b) => b.point.n - a.point.n)
          .slice(0, 6)
          .map(entry => `${entry.cohort.key} n=${entry.point.n} med=${entry.point.med ?? "-"} w7=${entry.point.w7?.chg ?? "-"} w30=${entry.point.w30?.chg ?? "-"}`);
        if (!options.dryRun) {
          await writeMarketSeries(day.entries, today);
          await writeMarketLogs(day.logs);
          result.logsPruned = await pruneMarketLogs(vertical, today);
          await writeMarketIndex(index);
        }
        result.ok = true;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }
    if (!options.dryRun) {
      const { sample: _sample, ...run } = result;
      await writeMarketRun(vertical, { ...run, at: now.toISOString() }).catch(() => undefined);
    }
    results.push(result);
  }
  return results;
}

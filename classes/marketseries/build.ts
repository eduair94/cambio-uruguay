// El día de un mercado: nivel por cohorte (una observación por vivienda o aviso) y "misma oferta"
// (cada aviso contra su propio log de ANTES de hoy). Puro: sin base, testeable.
import { cohortLabel, cohortsOf } from "./cohorts";
import { buildHistogram } from "./histogram";
import { marketLogKey, nextLog, priceAt, shiftDay } from "./log";
import { levelStats, medianStats, pairStats, MARKET_PAIR_MINIMUM, MARKET_SAMPLE_MINIMUM, MARKET_WINDOWS } from "./stats";
import type {
  MarketCohort,
  MarketCohortLabels,
  MarketObservation,
  MarketPairStats,
  MarketPriceLog,
  MarketSeriesEntry,
  MarketVertical,
  MarketWindow,
} from "./types";

interface Accumulator {
  cohort: MarketCohort;
  prices: number[];
  m2: number[];
  pairs: Record<MarketWindow, number[]>;
  names: Record<keyof MarketCohortLabels, Map<string, number>>;
}

/** Freshest observation wins; same instant, the lowest id (stable, and never "the cheapest"). */
const newer = (a: MarketObservation, b: MarketObservation): boolean =>
  a.seenAt > b.seenAt || (a.seenAt === b.seenAt && a.advertId < b.advertId);

const SMALL_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y"]);

/** A name the portals only ever wrote in lowercase ("carrasco", "golf") still reads as a proper noun. */
export function displayName(name: string): string {
  if (/\p{Lu}/u.test(name)) return name;
  return name
    .split(" ")
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

/**
 * Most frequent spelling; a tie goes to the capitalized one, then the accented one ("Paysandú" over
 * "Paysandu"), then A-Z.
 */
export function preferredName(counts: ReadonlyMap<string, number>): string | null {
  let best: string | null = null;
  let bestRank: [number, number, number] = [-1, -1, -1];
  for (const [name, count] of counts) {
    const rank: [number, number, number] = [count, /\p{Lu}/u.test(name) ? 1 : 0, name.normalize("NFD").length - name.normalize("NFC").length];
    const cmp = rank[0] - bestRank[0] || rank[1] - bestRank[1] || rank[2] - bestRank[2];
    if (cmp > 0 || (cmp === 0 && best !== null && name < best)) {
      best = name;
      bestRank = rank;
    }
  }
  return best === null ? null : displayName(best);
}

export interface MarketDayInput {
  vertical: MarketVertical;
  today: string;
  observations: readonly MarketObservation[];
  /** Keyed by `marketLogKey`, as they were BEFORE today. */
  logs: ReadonlyMap<string, MarketPriceLog>;
}

export interface MarketDay {
  entries: MarketSeriesEntry[];
  /** Only new or changed logs. */
  logs: MarketPriceLog[];
  adverts: number;
  groups: number;
}

export function buildMarketDay(input: MarketDayInput): MarketDay {
  const adverts = new Map<string, MarketObservation>();
  for (const obs of input.observations) {
    if (obs.vertical !== input.vertical) continue;
    const existing = adverts.get(obs.advertId);
    if (!existing || newer(obs, existing)) adverts.set(obs.advertId, obs);
  }
  const groups = new Map<string, MarketObservation>();
  for (const obs of adverts.values()) {
    const existing = groups.get(obs.groupKey);
    if (!existing || newer(obs, existing)) groups.set(obs.groupKey, obs);
  }

  const accumulators = new Map<string, Accumulator>();
  const accumulator = (cohort: MarketCohort): Accumulator => {
    let acc = accumulators.get(cohort.key);
    if (!acc) {
      acc = {
        cohort,
        prices: [],
        m2: [],
        pairs: { 7: [], 30: [], 90: [] },
        names: { department: new Map(), neighborhood: new Map(), brand: new Map(), model: new Map() },
      };
      accumulators.set(cohort.key, acc);
    }
    return acc;
  };
  const tally = (map: Map<string, number>, value: string | null): void => {
    if (value) map.set(value, (map.get(value) ?? 0) + 1);
  };

  for (const obs of groups.values()) {
    for (const cohort of cohortsOf(obs)) {
      const acc = accumulator(cohort);
      acc.prices.push(obs.price);
      if (obs.vertical !== "autos" && obs.areaBuilt) acc.m2.push(obs.price / obs.areaBuilt);
      tally(acc.names.department, obs.department);
      tally(acc.names.neighborhood, obs.neighborhood);
      tally(acc.names.brand, obs.brand);
      tally(acc.names.model, obs.model);
    }
  }

  const changed: MarketPriceLog[] = [];
  for (const obs of adverts.values()) {
    const log = input.logs.get(marketLogKey(obs.vertical, obs.advertId));
    const cohorts = cohortsOf(obs);
    for (const window of MARKET_WINDOWS) {
      const then = priceAt(log, shiftDay(input.today, -window));
      if (!then || then.c !== obs.currency || !(then.p > 0)) continue;
      for (const cohort of cohorts) accumulator(cohort).pairs[window].push(obs.price / then.p);
    }
    const next = nextLog(log, obs);
    if (next !== log) changed.push(next);
  }

  const entries: MarketSeriesEntry[] = [];
  const ordered = [...accumulators.values()].sort((a, b) => (a.cohort.key < b.cohort.key ? -1 : a.cohort.key > b.cohort.key ? 1 : 0));
  for (const acc of ordered) {
    const level = levelStats(acc.prices);
    const windows = {} as Record<MarketWindow, MarketPairStats | null>;
    for (const window of MARKET_WINDOWS) windows[window] = acc.pairs[window].length ? pairStats(acc.pairs[window]) : null;
    const pairsPublishable = MARKET_WINDOWS.some(window => (windows[window]?.n ?? 0) >= MARKET_PAIR_MINIMUM);
    if (level.n < MARKET_SAMPLE_MINIMUM && !pairsPublishable) continue;
    const labels: MarketCohortLabels = {
      department: preferredName(acc.names.department),
      neighborhood: preferredName(acc.names.neighborhood),
      brand: preferredName(acc.names.brand),
      model: preferredName(acc.names.model),
    };
    entries.push({
      cohort: acc.cohort,
      labels,
      label: cohortLabel(acc.cohort.dims, labels),
      point: {
        d: input.today,
        ...level,
        m2: input.vertical === "autos" ? null : medianStats(acc.m2),
        w7: windows[7],
        w30: windows[30],
        w90: windows[90],
      },
      hist: buildHistogram(acc.prices),
    });
  }
  return { entries, logs: changed, adverts: adverts.size, groups: groups.size };
}

import moment from "moment-timezone";
import { CambioObj } from "../interfaces/Cambio";
import { MongooseServer } from "./database";
import { rateChangesDb, RateChange } from "./rate_changes";
import { isPublicRate } from "./rate_source";

export type RateAnalyticsInterval = "hour" | "day";

export interface RateAnalyticsQuery {
  code: string;
  origins?: string[];
  from: Date;
  to: Date;
  interval: RateAnalyticsInterval;
}

export interface RateAnalyticsPoint {
  at: string;
  buy: number | null;
  sell: number | null;
}

export interface RateAnalyticsSeries {
  origin: string;
  houseName: string;
  type: string;
  currentBuy: number;
  currentSell: number;
  points: RateAnalyticsPoint[];
}

export interface RateAnalyticsOrigin {
  origin: string;
  houseName: string;
  currencies: string[];
}

export interface RateAnalyticsResponse {
  asOf: string;
  from: string;
  to: string;
  code: string;
  interval: RateAnalyticsInterval;
  intradayCoverageStart: string | null;
  availableCurrencies: string[];
  availableOrigins: RateAnalyticsOrigin[];
  series: RateAnalyticsSeries[];
}

type HistoricalRate = CambioObj & {
  origin: string;
  date: Date | string;
};

type AnalyticsState = {
  buy: number;
  sell: number;
};

type AnalyticsEvent = AnalyticsState & {
  at: number;
};

const MONTEVIDEO_TZ = "America/Montevideo";
// The ledger intentionally stores only real changes. Daily snapshots still
// verify that a scraper is reporting; bridge one normal snapshot cycle, then
// return null so an absent provider is shown as a gap instead of a stale line.
const MAX_VERIFIED_AGE_MS = 36 * 60 * 60 * 1000;

function quoteKey(row: Pick<CambioObj, "code" | "type"> & { origin?: string }): string {
  return `${row.origin}|${row.code.toUpperCase()}|${row.type || ""}`;
}

function typeRank(type: string): number {
  if (type === "") return 0;
  if (type === "BILLETE") return 1;
  return 2;
}

function validRate(row: Pick<CambioObj, "buy" | "sell">): boolean {
  return (
    Number.isFinite(row.buy) &&
    Number.isFinite(row.sell) &&
    row.buy > 0 &&
    row.sell > 0
  );
}

export function selectPreferredAnalyticsQuotes(
  currentRows: CambioObj[],
  code: string,
  origins?: string[]
): Array<CambioObj & { origin: string }> {
  const wantedOrigins = origins?.length ? new Set(origins) : null;
  const byOrigin = new Map<string, CambioObj & { origin: string }>();

  for (const row of currentRows) {
    if (
      !row.origin ||
      row.code.toUpperCase() !== code.toUpperCase() ||
      !isPublicRate(row) ||
      !validRate(row) ||
      (wantedOrigins && !wantedOrigins.has(row.origin))
    ) {
      continue;
    }

    const prior = byOrigin.get(row.origin);
    if (
      !prior ||
      typeRank(row.type || "") < typeRank(prior.type || "") ||
      (typeRank(row.type || "") === typeRank(prior.type || "") &&
        row.sell < prior.sell)
    ) {
      byOrigin.set(row.origin, row as CambioObj & { origin: string });
    }
  }

  return [...byOrigin.values()].sort((a, b) => a.origin.localeCompare(b.origin));
}

function bucketEnd(cursor: Date, interval: RateAnalyticsInterval, to: Date): Date {
  const next = moment.tz(cursor, MONTEVIDEO_TZ).add(1, interval).toDate();
  return next > to ? to : next;
}

function buildPoints(
  from: Date,
  to: Date,
  interval: RateAnalyticsInterval,
  initial: AnalyticsEvent | null,
  events: AnalyticsEvent[]
): RateAnalyticsPoint[] {
  const points: RateAnalyticsPoint[] = [];
  let cursor = new Date(from);
  let eventIndex = 0;
  let state: AnalyticsState | null = initial
    ? { buy: initial.buy, sell: initial.sell }
    : null;
  let lastVerifiedAt = initial?.at ?? null;

  while (cursor < to) {
    const end = bucketEnd(cursor, interval, to);
    while (eventIndex < events.length && events[eventIndex]!.at <= end.getTime()) {
      const event = events[eventIndex]!;
      state = { buy: event.buy, sell: event.sell };
      lastVerifiedAt = event.at;
      eventIndex++;
    }
    const isVerified =
      state !== null &&
      lastVerifiedAt !== null &&
      end.getTime() - lastVerifiedAt <= MAX_VERIFIED_AGE_MS;
    points.push({
      at: end.toISOString(),
      buy: isVerified ? state!.buy : null,
      sell: isVerified ? state!.sell : null,
    });
    cursor = end;
  }

  return points;
}

export function buildRateAnalyticsSeries(
  currentQuotes: Array<CambioObj & { origin: string }>,
  dailyRows: HistoricalRate[],
  changes: RateChange[],
  query: RateAnalyticsQuery,
  houseNames: Record<string, string>
): RateAnalyticsSeries[] {
  return currentQuotes.map(current => {
    const key = quoteKey(current);
    const quoteDaily = dailyRows
      .filter(row => quoteKey(row) === key && validRate(row))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const quoteChanges = changes
      .filter(change => quoteKey(change) === key)
      .sort(
        (a, b) =>
          new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
      );

    const fromMs = query.from.getTime();
    const toMs = query.to.getTime();
    const beforeChange = [...quoteChanges]
      .reverse()
      .find(change => new Date(change.observedAt).getTime() <= fromMs);
    const firstChangeAfter = quoteChanges.find(
      change => new Date(change.observedAt).getTime() > fromMs
    );
    const beforeDaily = [...quoteDaily]
      .reverse()
      .find(row => new Date(row.date).getTime() <= fromMs);

    const priorEvents: AnalyticsEvent[] = [];
    if (beforeChange) {
      priorEvents.push({
        at: new Date(beforeChange.observedAt).getTime(),
        buy: beforeChange.buy,
        sell: beforeChange.sell,
      });
    }
    if (beforeDaily) {
      priorEvents.push({
        at: new Date(beforeDaily.date).getTime(),
        buy: beforeDaily.buy,
        sell: beforeDaily.sell,
      });
    }
    if (validRate(current) && new Date(current.date).getTime() <= fromMs) {
      priorEvents.push({
        at: new Date(current.date).getTime(),
        buy: current.buy,
        sell: current.sell,
      });
    }

    const latestPrior = priorEvents.sort((a, b) => b.at - a.at)[0];
    let initial: AnalyticsEvent | null =
      latestPrior && fromMs - latestPrior.at <= MAX_VERIFIED_AGE_MS ? latestPrior : null;
    const firstChangeAfterAt = firstChangeAfter
      ? new Date(firstChangeAfter.observedAt).getTime()
      : Number.POSITIVE_INFINITY;
    if (!initial && firstChangeAfter && firstChangeAfterAt - fromMs <= MAX_VERIFIED_AGE_MS) {
      initial = {
        at: fromMs,
        buy: firstChangeAfter.previousBuy,
        sell: firstChangeAfter.previousSell,
      };
    }

    const dailyEvents: AnalyticsEvent[] = quoteDaily
      .filter(row => {
        const at = new Date(row.date).getTime();
        return at > fromMs && at <= toMs;
      })
      .map(row => ({
        at: new Date(row.date).getTime(),
        buy: row.buy,
        sell: row.sell,
      }));
    const changeEvents: AnalyticsEvent[] = quoteChanges
      .filter(change => {
        const at = new Date(change.observedAt).getTime();
        return at > fromMs && at <= toMs;
      })
      .map(change => ({
        at: new Date(change.observedAt).getTime(),
        buy: change.buy,
        sell: change.sell,
      }));

    const events = [...dailyEvents, ...changeEvents].sort((a, b) => a.at - b.at);
    return {
      origin: current.origin,
      houseName: houseNames[current.origin] || current.origin,
      type: current.type || "",
      currentBuy: current.buy,
      currentSell: current.sell,
      points: buildPoints(query.from, query.to, query.interval, initial, events),
    };
  });
}

function availableOrigins(
  currentRows: CambioObj[],
  houseNames: Record<string, string>
): RateAnalyticsOrigin[] {
  const currenciesByOrigin = new Map<string, Set<string>>();
  for (const row of currentRows) {
    if (!row.origin || !isPublicRate(row) || !validRate(row)) continue;
    const currencies = currenciesByOrigin.get(row.origin) || new Set<string>();
    currencies.add(row.code.toUpperCase());
    currenciesByOrigin.set(row.origin, currencies);
  }
  return [...currenciesByOrigin.entries()]
    .map(([origin, currencies]) => ({
      origin,
      houseName: houseNames[origin] || origin,
      currencies: [...currencies].sort(),
    }))
    .sort((a, b) => a.houseName.localeCompare(b.houseName, "es"));
}

export async function buildRateAnalytics(
  currentRows: CambioObj[],
  currentRatesDb: MongooseServer,
  query: RateAnalyticsQuery,
  houseNames: Record<string, string>
): Promise<RateAnalyticsResponse> {
  const code = query.code.toUpperCase();
  const quotes = selectPreferredAnalyticsQuotes(currentRows, code, query.origins);
  const keys = quotes.map(row => ({
    origin: row.origin,
    code: row.code,
    type: row.type || "",
  }));
  const allOrigins = availableOrigins(currentRows, houseNames);
  const availableCurrencies = [
    ...new Set(allOrigins.flatMap(origin => origin.currencies)),
  ].sort();

  if (keys.length === 0) {
    return {
      asOf: new Date().toISOString(),
      from: query.from.toISOString(),
      to: query.to.toISOString(),
      code,
      interval: query.interval,
      intradayCoverageStart: null,
      availableCurrencies,
      availableOrigins: allOrigins,
      series: [],
    };
  }

  const dailyModel = currentRatesDb.getModel();
  const changesModel = rateChangesDb().getModel();
  const dailyStart = moment
    .tz(query.from, MONTEVIDEO_TZ)
    .startOf("day")
    .toDate();
  const keyMatch = { $or: keys };

  const [dailyBaseline, dailyRange, changeBaseline, changeRange, coverage] =
    await Promise.all([
      dailyModel.aggregate([
        { $match: { ...keyMatch, date: { $lte: query.from } } },
        { $sort: { date: -1 } },
        {
          $group: {
            _id: { origin: "$origin", code: "$code", type: "$type" },
            row: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$row" } },
      ]),
      dailyModel
        .find({
          ...keyMatch,
          date: { $gte: dailyStart, $lte: query.to },
        })
        .lean(),
      changesModel.aggregate([
        { $match: { ...keyMatch, observedAt: { $lte: query.from } } },
        { $sort: { observedAt: -1 } },
        {
          $group: {
            _id: { origin: "$origin", code: "$code", type: "$type" },
            row: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$row" } },
      ]),
      changesModel
        .find({
          ...keyMatch,
          observedAt: { $gt: query.from, $lte: query.to },
        })
        .sort({ observedAt: 1 })
        .lean(),
      changesModel
        .findOne(keyMatch)
        .sort({ observedAt: 1 })
        .select("observedAt")
        .lean(),
    ]);

  const dailyRows = [...dailyBaseline, ...dailyRange] as HistoricalRate[];
  const changes = [...changeBaseline, ...changeRange] as unknown as RateChange[];
  return {
    asOf: new Date().toISOString(),
    from: query.from.toISOString(),
    to: query.to.toISOString(),
    code,
    interval: query.interval,
    intradayCoverageStart: (coverage as any)?.observedAt
      ? new Date((coverage as any).observedAt).toISOString()
      : null,
    availableCurrencies,
    availableOrigins: allOrigins,
    series: buildRateAnalyticsSeries(
      quotes,
      dailyRows,
      changes,
      query,
      houseNames
    ),
  };
}

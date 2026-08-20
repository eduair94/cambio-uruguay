import moment from "moment-timezone";
import { CambioObj } from "../interfaces/Cambio";
import { MongooseServer } from "./database";
import { rateChangesDb, RateChange } from "./rate_changes";
import { isPublicRate } from "./rate_source";

const MONTEVIDEO_TZ = "America/Montevideo";

export interface IntradayQuery {
  /** Currency code, uppercase (USD, EUR, ARS...). */
  code: string;
  /** Start of the requested Montevideo calendar day. */
  dayStart: Date;
  /** Optional origin allow-list. */
  origins?: string[];
  /** Optional exact quote type ("" = plain, "BILLETE", ...). */
  type?: string;
}

export interface IntradayPoint {
  at: string;
  buy: number;
  sell: number;
  buyChanged: boolean;
  sellChanged: boolean;
}

/**
 * Where the opening price came from. The daily collection stores ONE row per
 * Montevideo day whose value is overwritten on every sync, so that row is the
 * day's *close*, never its open — the open has to be reconstructed.
 */
export type IntradayOpenSource =
  | "ledger-previous" // previousBuy/previousSell of the day's first change (exact)
  | "ledger-carried" // last ledger state observed before the day started
  | "daily-previous" // previous day's daily row (its close)
  | "flat"; // nothing before it and nothing moved: open == close

export interface IntradaySeries {
  origin: string;
  houseName: string;
  code: string;
  type: string;
  name: string;
  openBuy: number;
  openSell: number;
  openSource: IntradayOpenSource;
  lastBuy: number;
  lastSell: number;
  lastAt: string | null;
  highBuy: number;
  lowBuy: number;
  highSell: number;
  lowSell: number;
  buyChange: number;
  buyChangePct: number;
  sellChange: number;
  sellChangePct: number;
  changes: number;
  firstChangeAt: string | null;
  lastChangeAt: string | null;
  points: IntradayPoint[];
}

export interface IntradayTotals {
  quotes: number;
  quotesChanged: number;
  changes: number;
  avgOpenBuy: number | null;
  avgOpenSell: number | null;
  avgLastBuy: number | null;
  avgLastSell: number | null;
  avgBuyChangePct: number | null;
  avgSellChangePct: number | null;
}

export interface IntradayResponse {
  asOf: string;
  date: string;
  dayStart: string;
  dayEnd: string;
  /** End of the window actually covered — `now` while the day is still running. */
  coverageEnd: string;
  isToday: boolean;
  code: string;
  totals: IntradayTotals;
  availableCurrencies: string[];
  series: IntradaySeries[];
}

export type DailyRateRow = CambioObj & { origin: string; date: Date | string };

function round(value: number, decimals = 6): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function validRate(row: Pick<CambioObj, "buy" | "sell">): boolean {
  return (
    Number.isFinite(row.buy) &&
    Number.isFinite(row.sell) &&
    row.buy > 0 &&
    row.sell > 0
  );
}

export function intradayKey(
  row: Pick<CambioObj, "code" | "type"> & { origin?: string }
): string {
  return `${row.origin}|${row.code.toUpperCase()}|${row.type || ""}`;
}

/** Montevideo calendar day (start-of-day Date) for a `YYYY-MM-DD` string. */
export function montevideoDayStart(date?: string): Date {
  const base = date
    ? moment.tz(date, "YYYY-MM-DD", MONTEVIDEO_TZ)
    : moment.tz(MONTEVIDEO_TZ);
  return base.startOf("day").toDate();
}

export function isValidDayString(date: string): boolean {
  return moment.tz(date, "YYYY-MM-DD", true, MONTEVIDEO_TZ).isValid();
}

/**
 * The `date` values that mean "this calendar day" in the daily collection.
 *
 * Rows written before the timezone fix carry UTC midnight (`D 00:00Z`); rows
 * written after it carry Montevideo midnight (`D 03:00Z`). An exact match on
 * either one silently drops half the history, so every daily read uses this
 * window. It cannot reach a neighbouring day: `D-1 03:00Z` is before it and
 * `D+1 00:00Z` is after it.
 */
export function dailyRowWindow(dayStart: Date): { from: Date; to: Date } {
  const day = moment.tz(dayStart, MONTEVIDEO_TZ).format("YYYY-MM-DD");
  return { from: new Date(`${day}T00:00:00.000Z`), to: dayStart };
}

/**
 * Quotes of the requested day that a person can actually transact at, after the
 * code/origin/type filters. The daily rows are the universe (not the current
 * snapshot) so a past day still lists the houses that quoted THAT day.
 */
export function selectIntradayQuotes(
  dailyRows: DailyRateRow[],
  query: IntradayQuery
): DailyRateRow[] {
  const wanted = query.origins?.length ? new Set(query.origins) : null;
  const byKey = new Map<string, DailyRateRow>();

  for (const row of dailyRows) {
    if (!row.origin || !isPublicRate(row) || !validRate(row)) continue;
    if (row.code.toUpperCase() !== query.code) continue;
    if (wanted && !wanted.has(row.origin)) continue;
    if (query.type !== undefined && (row.type || "") !== query.type) continue;
    // Two rows for the same quote can only differ by a re-run of the same day;
    // the later one is the one the sync left behind.
    const prior = byKey.get(intradayKey(row));
    if (!prior || new Date(row.date).getTime() >= new Date(prior.date).getTime()) {
      byKey.set(intradayKey(row), row);
    }
  }

  return [...byKey.values()];
}

export function availableIntradayCurrencies(dailyRows: DailyRateRow[]): string[] {
  const codes = new Set<string>();
  for (const row of dailyRows) {
    if (!row.origin || !isPublicRate(row) || !validRate(row)) continue;
    codes.add(row.code.toUpperCase());
  }
  return [...codes].sort();
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || from === 0) return 0;
  return round(((to - from) / from) * 100, 4);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 6);
}

/**
 * Build one intraday series per quote. Pure: every read already happened.
 *
 * `dayChanges` must be the ledger rows observed inside the day, ascending.
 * `priorChanges` / `priorDaily` are the newest row per quote strictly before
 * the day, used only to reconstruct the open when the day itself is flat.
 */
export function buildIntradaySeries(
  quotes: DailyRateRow[],
  dayChanges: RateChange[],
  priorChanges: RateChange[],
  priorDaily: DailyRateRow[],
  houseNames: Record<string, string> = {}
): IntradaySeries[] {
  const changesByKey = new Map<string, RateChange[]>();
  for (const change of dayChanges) {
    const key = intradayKey(change);
    const list = changesByKey.get(key) || [];
    list.push(change);
    changesByKey.set(key, list);
  }
  const priorChangeByKey = new Map(
    priorChanges.map(change => [intradayKey(change), change])
  );
  const priorDailyByKey = new Map(priorDaily.map(row => [intradayKey(row), row]));

  return quotes
    .map(quote => {
      const key = intradayKey(quote);
      const points = (changesByKey.get(key) || [])
        .slice()
        .sort(
          (a, b) =>
            new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime()
        );

      const firstChange = points[0];
      const priorChange = priorChangeByKey.get(key);
      const previousDay = priorDailyByKey.get(key);

      let openBuy = quote.buy;
      let openSell = quote.sell;
      let openSource: IntradayOpenSource = "flat";
      if (firstChange) {
        openBuy = firstChange.previousBuy;
        openSell = firstChange.previousSell;
        openSource = "ledger-previous";
      } else if (priorChange && validRate(priorChange)) {
        openBuy = priorChange.buy;
        openSell = priorChange.sell;
        openSource = "ledger-carried";
      } else if (previousDay && validRate(previousDay)) {
        openBuy = previousDay.buy;
        openSell = previousDay.sell;
        openSource = "daily-previous";
      }

      // The daily row is the day's close, so it is the last value even when the
      // ledger's final change is older (a re-scrape that matched writes nothing).
      const lastChange = points[points.length - 1];
      const lastBuy = quote.buy;
      const lastSell = quote.sell;

      const buys = [openBuy, ...points.map(point => point.buy), lastBuy];
      const sells = [openSell, ...points.map(point => point.sell), lastSell];

      return {
        origin: quote.origin,
        houseName: houseNames[quote.origin] || quote.origin,
        code: quote.code.toUpperCase(),
        type: quote.type || "",
        name: quote.name,
        openBuy: round(openBuy),
        openSell: round(openSell),
        openSource,
        lastBuy: round(lastBuy),
        lastSell: round(lastSell),
        lastAt: lastChange
          ? new Date(lastChange.observedAt).toISOString()
          : null,
        highBuy: round(Math.max(...buys)),
        lowBuy: round(Math.min(...buys)),
        highSell: round(Math.max(...sells)),
        lowSell: round(Math.min(...sells)),
        buyChange: round(lastBuy - openBuy),
        buyChangePct: pctChange(openBuy, lastBuy),
        sellChange: round(lastSell - openSell),
        sellChangePct: pctChange(openSell, lastSell),
        changes: points.length,
        firstChangeAt: firstChange
          ? new Date(firstChange.observedAt).toISOString()
          : null,
        lastChangeAt: lastChange
          ? new Date(lastChange.observedAt).toISOString()
          : null,
        points: points.map(point => ({
          at: new Date(point.observedAt).toISOString(),
          buy: round(point.buy),
          sell: round(point.sell),
          buyChanged: Boolean(point.buyChanged),
          sellChanged: Boolean(point.sellChanged),
        })),
      };
    })
    .sort(
      (a, b) =>
        a.houseName.localeCompare(b.houseName, "es") ||
        a.type.localeCompare(b.type)
    );
}

export function buildIntradayTotals(series: IntradaySeries[]): IntradayTotals {
  return {
    quotes: series.length,
    quotesChanged: series.filter(row => row.changes > 0).length,
    changes: series.reduce((sum, row) => sum + row.changes, 0),
    avgOpenBuy: average(series.map(row => row.openBuy)),
    avgOpenSell: average(series.map(row => row.openSell)),
    avgLastBuy: average(series.map(row => row.lastBuy)),
    avgLastSell: average(series.map(row => row.lastSell)),
    avgBuyChangePct: average(series.map(row => row.buyChangePct)),
    avgSellChangePct: average(series.map(row => row.sellChangePct)),
  };
}

/**
 * Read path for `GET /intraday`. Four reads: the day's daily rows (universe and
 * close), the day's ledger changes, and the newest pre-day state from each of
 * the two stores so the open can be reconstructed.
 */
export async function buildIntraday(
  currentRatesDb: MongooseServer,
  query: IntradayQuery,
  houseNames: Record<string, string> = {}
): Promise<IntradayResponse> {
  const dayStart = query.dayStart;
  const dayEnd = moment.tz(dayStart, MONTEVIDEO_TZ).add(1, "day").toDate();
  const now = new Date();
  const isToday = now >= dayStart && now < dayEnd;
  const rangeEnd = isToday ? now : dayEnd;

  const dailyModel = currentRatesDb.getModel();
  const changesModel = rateChangesDb().getModel();

  const dayWindow = dailyRowWindow(dayStart);
  const dayRows = (await dailyModel
    .find({ date: { $gte: dayWindow.from, $lte: dayWindow.to } })
    .select("origin code type name buy sell date")
    .lean()) as unknown as DailyRateRow[];

  const quotes = selectIntradayQuotes(dayRows, query);
  const availableCurrencies = availableIntradayCurrencies(dayRows);

  const base: IntradayResponse = {
    asOf: now.toISOString(),
    date: moment.tz(dayStart, MONTEVIDEO_TZ).format("YYYY-MM-DD"),
    dayStart: dayStart.toISOString(),
    dayEnd: dayEnd.toISOString(),
    coverageEnd: rangeEnd.toISOString(),
    isToday,
    code: query.code,
    totals: buildIntradayTotals([]),
    availableCurrencies,
    series: [],
  };

  if (quotes.length === 0) return base;

  const keyMatch = {
    $or: quotes.map(row => ({
      origin: row.origin,
      code: row.code.toUpperCase(),
      type: row.type || "",
    })),
  };

  const [dayChanges, priorChanges, priorDaily] = await Promise.all([
    changesModel
      .find({ ...keyMatch, observedAt: { $gt: dayStart, $lte: rangeEnd } })
      .select("-__v")
      .sort({ observedAt: 1 })
      .lean(),
    changesModel.aggregate([
      { $match: { ...keyMatch, observedAt: { $lte: dayStart } } },
      { $sort: { observedAt: -1 } },
      {
        $group: {
          _id: { origin: "$origin", code: "$code", type: "$type" },
          row: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$row" } },
    ]),
    dailyModel.aggregate([
      // Strictly before the day's own window, or the legacy `D 00:00Z` row
      // would be mistaken for the previous day's close.
      { $match: { ...keyMatch, date: { $lt: dayWindow.from } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: { origin: "$origin", code: "$code", type: "$type" },
          row: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$row" } },
    ]),
  ]);

  const series = buildIntradaySeries(
    quotes,
    dayChanges as unknown as RateChange[],
    priorChanges as unknown as RateChange[],
    priorDaily as unknown as DailyRateRow[],
    houseNames
  );

  return { ...base, totals: buildIntradayTotals(series), series };
}

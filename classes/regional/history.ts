// The daily series behind `GET /regional/history`.
//
// Two ways a day gets into the collection, and they are not the same thing:
//
//   * BACKFILL — three publishers hand out their own history: the seven
//     Argentine dollars daily since 2011, the Brazilian PTAX daily since 1984,
//     and Chile's observed dollar by calendar year. Those are closing values
//     computed by the publisher; we store them as they come.
//   * SNAPSHOT — every other market (Paraguay, Bolivia, the Uruguayan board, the
//     tourism dollar) has no public history at all, so its series starts the day
//     this job first ran and grows one row per day from the live board.
//
// The snapshot rows carry the same caveat the Uruguayan daily collection does:
// the row is overwritten on every run, so what is stored is the day's LAST
// observed value — its close, never its open. A consumer computing an intraday
// move from two consecutive rows is computing close-to-close, which is a
// different (and, for these markets, more honest) number.
//
// The day is the calendar day IN THE COUNTRY THAT PUBLISHED THE PRICE. A
// Brazilian fixing at 13:00 Brasília and an Argentine close at 18:00 Buenos
// Aires belong to the same day; stamping them in UTC would put half the
// afternoon of one country on the next day.
import moment from "moment-timezone";
import { fetchArHistory, AR_HISTORY_MARKETS } from "./sources/ar_argentinadatos";
import { fetchBrPtaxHistory } from "./sources/br_bcb";
import { fetchClDolarHistory } from "./sources/cl_mindicador";
import { REGIONAL_COUNTRY_TZ, type RegionalHistoryPoint, type RegionalQuote, type RegionalSnapshot } from "./types";

/** The calendar day a quote belongs to, in its own country's timezone. */
export function quoteDay(quote: RegionalQuote): string {
  const tz = REGIONAL_COUNTRY_TZ[quote.country] || "America/Montevideo";
  return moment.tz(quote.updatedAt, tz).format("YYYY-MM-DD");
}

/** Today's points, one per market, from a finished snapshot. */
export function snapshotHistoryPoints(snapshot: RegionalSnapshot): RegionalHistoryPoint[] {
  return snapshot.quotes.map((quote) => ({
    key: quote.id,
    country: quote.country,
    market: quote.market,
    base: quote.base,
    quote: quote.quote,
    day: quoteDay(quote),
    buy: quote.buy,
    sell: quote.sell,
    avg: quote.avg,
    source: quote.source,
  }));
}

export interface BackfillOptions {
  /** Oldest day to keep, `YYYY-MM-DD`. Omit for everything the sources have. */
  since?: string;
  /** Chile is fetched year by year; this bounds how many years are asked for. */
  chileFromYear?: number;
}

export interface BackfillResult {
  points: RegionalHistoryPoint[];
  /** One line per series fetched, for the job log. */
  notes: string[];
}

/**
 * Pull every series a publisher will hand over. Failures are per-series: a dead
 * endpoint costs that series' history, never the rest of the run.
 */
export async function backfillHistory(options: BackfillOptions = {}): Promise<BackfillResult> {
  const since = options.since;
  const notes: string[] = [];
  const points: RegionalHistoryPoint[] = [];

  // A source that could not be read reports `null`, and that is logged as a
  // FAILURE rather than as "0 días". They are not the same thing and conflating
  // them already cost a day: the Argentine publisher rate-limited a run, seven
  // series logged "0 días", and the line read exactly like seven markets with no
  // history to fetch.
  const push = async (label: string, task: () => Promise<RegionalHistoryPoint[] | null>): Promise<void> => {
    try {
      const rows = await task();
      if (rows === null) {
        notes.push(`${label}: FALLÓ (la fuente no respondió)`);
        return;
      }
      points.push(...rows);
      notes.push(`${label}: ${rows.length} días`);
    } catch (error) {
      notes.push(`${label}: FALLÓ (${error instanceof Error ? error.message : String(error)})`);
    }
  };

  for (const market of AR_HISTORY_MARKETS) {
    await push(`AR ${market}`, () => fetchArHistory(market, since));
  }

  await push("BR ptax", async () => {
    const from = since || "1995-01-01";
    const to = moment.tz("America/Sao_Paulo").format("YYYY-MM-DD");
    return fetchBrPtaxHistory(from, to);
  });

  const currentYear = Number(moment.tz("America/Santiago").format("YYYY"));
  const firstYear = options.chileFromYear ?? (since ? Number(since.slice(0, 4)) : currentYear - 15);
  for (let year = firstYear; year <= currentYear; year++) {
    await push(`CL observado ${year}`, async () => {
      const rows = await fetchClDolarHistory(year);
      if (rows === null) return null;
      return since ? rows.filter((row) => row.day >= since) : rows;
    });
  }

  return { points, notes };
}

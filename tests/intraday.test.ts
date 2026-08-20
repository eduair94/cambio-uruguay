import { describe, expect, it } from "vitest";
import {
  availableIntradayCurrencies,
  dailyRowWindow,
  buildIntradaySeries,
  buildIntradayTotals,
  DailyRateRow,
  IntradayQuery,
  isValidDayString,
  montevideoDayStart,
  selectIntradayQuotes,
} from "../classes/intraday";
import { RateChange } from "../classes/rate_changes";

const dayStart = montevideoDayStart("2026-08-19");

const query: IntradayQuery = {
  code: "USD",
  dayStart,
  origins: ["brou"],
};

function daily(overrides: Partial<DailyRateRow> = {}): DailyRateRow {
  return {
    origin: "brou",
    code: "USD",
    type: "",
    name: "Dólar",
    buy: 39.5,
    sell: 41.5,
    date: dayStart,
    ...overrides,
  };
}

function change(overrides: Partial<RateChange> = {}): RateChange {
  return {
    origin: "brou",
    houseName: "BROU",
    code: "USD",
    type: "",
    name: "Dólar",
    previousBuy: 39.2,
    previousSell: 41.2,
    buy: 39.5,
    sell: 41.5,
    buyChanged: true,
    sellChanged: true,
    observedAt: new Date("2026-08-19T13:00:00.000Z"),
    telegramReportedAt: null,
    ...overrides,
  };
}

describe("intraday day parsing", () => {
  it("accepts a calendar day and rejects anything else", () => {
    expect(isValidDayString("2026-08-19")).toBe(true);
    expect(isValidDayString("19-08-2026")).toBe(false);
    expect(isValidDayString("2026-13-01")).toBe(false);
    expect(isValidDayString("hoy")).toBe(false);
  });

  it("anchors the day to Montevideo, not to UTC", () => {
    // Montevideo is UTC-3 all year, so the day starts at 03:00Z.
    expect(montevideoDayStart("2026-08-19").toISOString()).toBe(
      "2026-08-19T03:00:00.000Z"
    );
  });
});

describe("daily row window", () => {
  it("covers both date encodings of the same day and nothing else", () => {
    const window = dailyRowWindow(montevideoDayStart("2026-08-19"));

    // Legacy rows sit at UTC midnight, current rows at Montevideo midnight.
    expect(window.from.toISOString()).toBe("2026-08-19T00:00:00.000Z");
    expect(window.to.toISOString()).toBe("2026-08-19T03:00:00.000Z");

    // The neighbours stay out: an exact match on either encoding alone would
    // have dropped half the history instead.
    const previousDay = montevideoDayStart("2026-08-18");
    const nextDayLegacy = new Date("2026-08-20T00:00:00.000Z");
    expect(previousDay.getTime()).toBeLessThan(window.from.getTime());
    expect(nextDayLegacy.getTime()).toBeGreaterThan(window.to.getTime());
  });
});

describe("intraday quote selection", () => {
  it("keeps only public quotes of the requested currency and houses", () => {
    const quotes = selectIntradayQuotes(
      [
        daily(),
        daily({ code: "EUR", buy: 45, sell: 47 }),
        daily({ origin: "itau", type: "BILLETE" }),
        daily({ origin: "bcu", type: "BILLETE" }),
        daily({ type: "INTERBANCARIO" }),
        daily({ buy: 0, sell: 0 }),
      ],
      query
    );

    expect(quotes.map(row => `${row.origin}:${row.type}`)).toEqual(["brou:"]);
  });

  it("filters by exact quote type, treating an empty type as the plain quote", () => {
    const rows = [daily(), daily({ type: "BILLETE", buy: 39.1, sell: 41.9 })];

    expect(
      selectIntradayQuotes(rows, { ...query, type: "" }).map(row => row.type)
    ).toEqual([""]);
    expect(
      selectIntradayQuotes(rows, { ...query, type: "BILLETE" }).map(row => row.type)
    ).toEqual(["BILLETE"]);
    expect(selectIntradayQuotes(rows, query)).toHaveLength(2);
  });

  it("lists the currencies quoted that day, excluding non-public rows", () => {
    expect(
      availableIntradayCurrencies([
        daily(),
        daily({ code: "eur", buy: 45, sell: 47 }),
        daily({ origin: "bcu", code: "ARS", buy: 0.03, sell: 0.04 }),
        daily({ code: "BRL", type: "CABLE", buy: 7, sell: 8 }),
      ])
    ).toEqual(["EUR", "USD"]);
  });
});

describe("intraday series", () => {
  it("takes the open from the first change of the day and the close from the daily row", () => {
    const [series] = buildIntradaySeries(
      [daily({ buy: 39.8, sell: 41.9 })],
      [
        change(),
        change({
          previousBuy: 39.5,
          previousSell: 41.5,
          buy: 39.8,
          sell: 41.9,
          observedAt: new Date("2026-08-19T18:30:00.000Z"),
        }),
      ],
      [],
      [],
      { brou: "BROU" }
    );

    expect(series!.openBuy).toBe(39.2);
    expect(series!.openSell).toBe(41.2);
    expect(series!.openSource).toBe("ledger-previous");
    expect(series!.lastBuy).toBe(39.8);
    expect(series!.lastSell).toBe(41.9);
    expect(series!.changes).toBe(2);
    expect(series!.firstChangeAt).toBe("2026-08-19T13:00:00.000Z");
    expect(series!.lastChangeAt).toBe("2026-08-19T18:30:00.000Z");
    expect(series!.houseName).toBe("BROU");
  });

  it("reports the real high and low, not just open vs close", () => {
    const [series] = buildIntradaySeries(
      [daily({ buy: 39.2, sell: 41.2 })],
      [
        change({
          previousBuy: 39.2,
          previousSell: 41.2,
          buy: 40.1,
          sell: 42.4,
          observedAt: new Date("2026-08-19T12:00:00.000Z"),
        }),
        change({
          previousBuy: 40.1,
          previousSell: 42.4,
          buy: 39.2,
          sell: 41.2,
          observedAt: new Date("2026-08-19T20:00:00.000Z"),
        }),
      ],
      [],
      []
    );

    expect(series!.highBuy).toBe(40.1);
    expect(series!.lowBuy).toBe(39.2);
    expect(series!.highSell).toBe(42.4);
    expect(series!.lowSell).toBe(41.2);
    // Round trip: it moved, but it ended where it started.
    expect(series!.buyChange).toBe(0);
    expect(series!.buyChangePct).toBe(0);
  });

  it("computes the signed change and its percentage against the open", () => {
    const [series] = buildIntradaySeries(
      [daily({ buy: 39.6, sell: 41.6 })],
      [change({ buy: 39.6, sell: 41.6 })],
      [],
      []
    );

    expect(series!.buyChange).toBe(0.4);
    expect(series!.buyChangePct).toBe(1.0204);
    expect(series!.sellChange).toBe(0.4);
    expect(series!.sellChangePct).toBe(0.9709);
  });

  it("carries the open from the ledger state observed before the day", () => {
    const [series] = buildIntradaySeries(
      [daily({ buy: 39.5, sell: 41.5 })],
      [],
      [
        change({
          buy: 39.5,
          sell: 41.5,
          observedAt: new Date("2026-08-15T14:00:00.000Z"),
        }),
      ],
      [daily({ buy: 38, sell: 40, date: new Date("2026-08-18T03:00:00.000Z") })]
    );

    expect(series!.openSource).toBe("ledger-carried");
    expect(series!.openBuy).toBe(39.5);
    expect(series!.changes).toBe(0);
    expect(series!.lastAt).toBeNull();
  });

  it("falls back to the previous day's close, then to a flat day", () => {
    const [carried] = buildIntradaySeries(
      [daily()],
      [],
      [],
      [daily({ buy: 39.1, sell: 41.1, date: new Date("2026-08-18T03:00:00.000Z") })]
    );
    expect(carried!.openSource).toBe("daily-previous");
    expect(carried!.openBuy).toBe(39.1);
    expect(carried!.buyChange).toBe(0.4);

    const [flat] = buildIntradaySeries([daily()], [], [], []);
    expect(flat!.openSource).toBe("flat");
    expect(flat!.openBuy).toBe(flat!.lastBuy);
    expect(flat!.buyChangePct).toBe(0);
  });

  it("never mixes the changes of two quotes of the same house", () => {
    const series = buildIntradaySeries(
      [daily(), daily({ type: "BILLETE", buy: 39.9, sell: 41.9 })],
      [
        change({ type: "BILLETE", previousBuy: 39.7, previousSell: 41.7, buy: 39.9, sell: 41.9 }),
      ],
      [],
      []
    );

    const plain = series.find(row => row.type === "")!;
    const billete = series.find(row => row.type === "BILLETE")!;
    expect(plain.changes).toBe(0);
    expect(billete.changes).toBe(1);
    expect(billete.openBuy).toBe(39.7);
  });

  it("sorts by house name so the payload is stable between calls", () => {
    const series = buildIntradaySeries(
      [daily({ origin: "itau" }), daily({ origin: "brou" })],
      [],
      [],
      [],
      { brou: "BROU", itau: "Itaú" }
    );

    expect(series.map(row => row.origin)).toEqual(["brou", "itau"]);
  });
});

describe("intraday totals", () => {
  it("counts the quotes that actually moved and averages the day", () => {
    const series = buildIntradaySeries(
      [daily({ buy: 39.6, sell: 41.6 }), daily({ origin: "itau", buy: 39.4, sell: 41.4 })],
      [change({ buy: 39.6, sell: 41.6 })],
      [],
      [
        daily({
          origin: "itau",
          buy: 39.4,
          sell: 41.4,
          date: new Date("2026-08-18T03:00:00.000Z"),
        }),
      ]
    );
    const totals = buildIntradayTotals(series);

    expect(totals.quotes).toBe(2);
    expect(totals.quotesChanged).toBe(1);
    expect(totals.changes).toBe(1);
    expect(totals.avgLastBuy).toBe(39.5);
  });

  it("returns nulls instead of NaN when there is nothing to average", () => {
    const totals = buildIntradayTotals([]);
    expect(totals.quotes).toBe(0);
    expect(totals.avgOpenBuy).toBeNull();
    expect(totals.avgSellChangePct).toBeNull();
  });
});

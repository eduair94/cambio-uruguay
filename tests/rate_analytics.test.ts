import { describe, expect, it } from "vitest";
import {
  buildRateAnalyticsSeries,
  RateAnalyticsQuery,
  selectPreferredAnalyticsQuotes,
} from "../classes/rate_analytics";
import { RateChange } from "../classes/rate_changes";
import { CambioObj } from "../interfaces/Cambio";

const query: RateAnalyticsQuery = {
  code: "USD",
  origins: ["brou"],
  from: new Date("2026-07-24T00:00:00.000Z"),
  to: new Date("2026-07-24T03:00:00.000Z"),
  interval: "hour",
};

const current: Array<CambioObj & { origin: string }> = [
  {
    origin: "brou",
    code: "USD",
    type: "",
    name: "Dólar",
    buy: 39.2,
    sell: 41.3,
  },
];

describe("rate analytics quote selection", () => {
  it("includes every requested house but picks one public quote per origin", () => {
    const selected = selectPreferredAnalyticsQuotes(
      [
        ...current,
        { ...current[0], type: "EBROU", buy: 39.4, sell: 41.1 },
        {
          ...current[0],
          origin: "itau",
          type: "BILLETE",
          buy: 39,
          sell: 41,
        },
        {
          ...current[0],
          origin: "bcu",
          type: "BILLETE",
          buy: 40,
          sell: 40.1,
        },
      ],
      "USD"
    );

    expect(selected.map(row => `${row.origin}:${row.type}`)).toEqual([
      "brou:",
      "itau:BILLETE",
    ]);
  });
});

describe("hourly rate analytics", () => {
  it("forward-fills unchanged hours and applies a change to that hour's close", () => {
    const change: RateChange = {
      origin: "brou",
      houseName: "BROU",
      code: "USD",
      type: "",
      name: "Dólar",
      previousBuy: 39,
      previousSell: 41,
      buy: 39.2,
      sell: 41.3,
      buyChanged: true,
      sellChanged: true,
      observedAt: new Date("2026-07-24T01:15:00.000Z"),
      telegramReportedAt: null,
    };
    const result = buildRateAnalyticsSeries(
      current,
      [],
      [change],
      query,
      { brou: "BROU" }
    );

    expect(result[0]!.points).toEqual([
      { at: "2026-07-24T01:00:00.000Z", buy: 39, sell: 41 },
      { at: "2026-07-24T02:00:00.000Z", buy: 39.2, sell: 41.3 },
      { at: "2026-07-24T03:00:00.000Z", buy: 39.2, sell: 41.3 },
    ]);
  });

  it("uses the last daily snapshot when the intraday ledger has no event", () => {
    const result = buildRateAnalyticsSeries(
      current,
      [
        {
          ...current[0],
          date: new Date("2026-07-23T03:00:00.000Z"),
          buy: 38.9,
          sell: 41.1,
        },
      ],
      [],
      query,
      { brou: "BROU" }
    );

    expect(result[0]!.points).toHaveLength(3);
    expect(result[0]!.points.every(point => point.sell === 41.1)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildSantanderPreferentialRatesResponse,
  emptySantanderPreferentialRatesDoc,
  mergeSantanderPreferentialSnapshot,
  normalizeSantanderPreferentialRates,
  selectSantanderPreferentialRate,
} from "../classes/santander-preferential/store";
import { buildPreferentialRatesCatalogResponse } from "../classes/preferential-rates/catalog";

const sourceRates = [
  {
    arbBestBuy: 1,
    arbBestSell: 1,
    buyRate: 39.35,
    currency: "USD",
    rateFrom: 0,
    rateTo: 1001,
    sellRate: 41,
  },
  {
    arbBestBuy: 1,
    arbBestSell: 1,
    buyRate: 39.4,
    currency: "USD",
    rateFrom: 1001,
    rateTo: 10000,
    sellRate: 40.95,
  },
  {
    arbBestBuy: 1,
    arbBestSell: 1,
    buyRate: 39.5,
    currency: "USD",
    rateFrom: 10000,
    rateTo: 999999999999999,
    sellRate: 40.85,
  },
  {
    arbBestBuy: 1.1131,
    arbBestSell: 1.1631,
    buyRate: 44.73,
    currency: "EUR",
    rateFrom: 0,
    rateTo: 999999999999999,
    sellRate: 46.7,
  },
];

describe("Santander preferential-rate normalization", () => {
  it("normalizes and sorts the live Supernet amount bands", () => {
    const rates = normalizeSantanderPreferentialRates(sourceRates);

    expect(rates).toHaveLength(4);
    expect(rates.map((rate) => `${rate.currency}:${rate.minAmount}`)).toEqual([
      "EUR:0",
      "USD:0",
      "USD:1001",
      "USD:10000",
    ]);
    expect(rates.at(-1)).toMatchObject({
      currency: "USD",
      buy: 39.5,
      sell: 40.85,
      minAmount: 10000,
      maxAmount: null,
    });
  });

  it("drops malformed rows and rejects an entirely invalid response", () => {
    expect(
      normalizeSantanderPreferentialRates([
        ...sourceRates,
        {
          buyRate: 42,
          sellRate: 41,
          currency: "usd",
          rateFrom: 20,
          rateTo: 10,
        },
      ])
    ).toHaveLength(4);

    expect(() =>
      normalizeSantanderPreferentialRates([
        {
          buyRate: "not-a-number",
          sellRate: 41,
          currency: "USD",
          rateFrom: 0,
          rateTo: 1000,
        },
      ])
    ).toThrow("Santander returned no valid preferential rates");
  });

  it("selects bands using inclusive lower and exclusive upper boundaries", () => {
    const rates = normalizeSantanderPreferentialRates(sourceRates);

    expect(
      selectSantanderPreferentialRate(rates, "usd", 1000)?.buy
    ).toBe(39.35);
    expect(
      selectSantanderPreferentialRate(rates, "USD", 1001)?.buy
    ).toBe(39.4);
    expect(
      selectSantanderPreferentialRate(rates, "USD", 10000)?.buy
    ).toBe(39.5);
    expect(
      selectSantanderPreferentialRate(rates, "EUR", 50000)?.buy
    ).toBe(44.73);
  });
});

describe("Santander preferential-rate history", () => {
  it("keeps one snapshot per Uruguay day and overwrites a same-day rerun", () => {
    const rates = normalizeSantanderPreferentialRates(sourceRates);
    const first = mergeSantanderPreferentialSnapshot(
      emptySantanderPreferentialRatesDoc(),
      rates,
      new Date("2026-07-23T20:00:00.000Z")
    );
    const nextRates = rates.map((rate) =>
      rate.currency === "USD" ? { ...rate, buy: rate.buy + 0.1 } : rate
    );
    const rerun = mergeSantanderPreferentialSnapshot(
      first,
      nextRates,
      new Date("2026-07-24T01:30:00.000Z")
    );

    expect(rerun.history).toHaveLength(1);
    expect(rerun.current?.date).toBe("2026-07-23");
    expect(
      rerun.current?.rates.find(
        (rate) => rate.currency === "USD" && rate.minAmount === 0
      )?.buy
    ).toBe(39.45);
  });

  it("builds a filtered current and historical response for an amount", () => {
    const rates = normalizeSantanderPreferentialRates(sourceRates);
    const dayOne = mergeSantanderPreferentialSnapshot(
      emptySantanderPreferentialRatesDoc(),
      rates,
      new Date("2026-07-22T15:00:00.000Z")
    );
    const dayTwo = mergeSantanderPreferentialSnapshot(
      dayOne,
      rates,
      new Date("2026-07-23T15:00:00.000Z")
    );

    const response = buildSantanderPreferentialRatesResponse(
      dayTwo,
      "usd",
      5000
    );

    expect(response.currency).toBe("USD");
    expect(response.amount).toBe(5000);
    expect(response.current?.rates).toHaveLength(3);
    expect(response.current?.selectedRate?.buy).toBe(39.4);
    expect(response.history).toHaveLength(2);
    expect(
      response.history.every((snapshot) => snapshot.selectedRate?.buy === 39.4)
    ).toBe(true);
  });
});

describe("Preferential-rate provider catalog", () => {
  it("wraps provider-specific storage in the shared extensible contract", () => {
    const rates = normalizeSantanderPreferentialRates(sourceRates);
    const doc = mergeSantanderPreferentialSnapshot(
      emptySantanderPreferentialRatesDoc(),
      rates,
      new Date("2026-07-23T15:00:00.000Z")
    );
    const response = buildPreferentialRatesCatalogResponse(
      [
        {
          adapter: {
            id: "santander",
            displayName: "Santander",
            requiresAuthentication: true,
            build: buildSantanderPreferentialRatesResponse,
          },
          doc,
        },
      ],
      "USD",
      5000
    );

    expect(response.providerCount).toBe(1);
    expect(response.providers[0]).toMatchObject({
      provider: "santander",
      displayName: "Santander",
      requiresAuthentication: true,
    });
    expect(response.providers[0]?.current?.selectedRate).toMatchObject({
      currency: "USD",
      buy: 39.4,
      sell: 40.95,
      minAmount: 1001,
      maxAmount: 10000,
    });
  });
});

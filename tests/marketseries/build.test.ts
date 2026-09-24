import { describe, expect, it } from "vitest";
import { buildMarketDay, preferredName } from "../../classes/marketseries/build";
import { marketLogKey } from "../../classes/marketseries/log";
import type { MarketObservation, MarketPriceLog } from "../../classes/marketseries/types";
import { car, observation } from "./fixtures";

const TODAY = "2026-09-18";
const flats = (count: number, extra: (i: number) => Partial<MarketObservation> = () => ({})): MarketObservation[] =>
  Array.from({ length: count }, (_, i) =>
    observation({ advertId: `infocasas:${i}`, groupKey: `prop-${i}`, price: 20000 + i * 1000, ...extra(i) }));
const entry = (day: ReturnType<typeof buildMarketDay>, key: string) => day.entries.find(item => item.cohort.key === key);

describe("buildMarketDay: level", () => {
  it("publishes a cohort from 8 homes on, with its labels", () => {
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(8), logs: new Map() });
    const pocitos = entry(day, "alquiler|UYU|apartamento|2|b:montevideo:pocitos")!;
    expect(pocitos.point).toMatchObject({ d: TODAY, n: 8, med: 23500, p25: 21750, p75: 25250, w7: null, w30: null, w90: null });
    expect(pocitos.label).toBe("Pocitos, Montevideo");
  });
  it("7 homes publish nothing", () => {
    expect(buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(7), logs: new Map() }).entries).toEqual([]);
  });
  it("one home is one observation: the freshest offer represents it, never the cheapest", () => {
    const observations = [
      ...flats(8),
      observation({ advertId: "mercadolibre:x", groupKey: "prop-0", price: 1000, seenAt: "2026-09-10", seenDay: "2026-09-10" }),
    ];
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: new Map() });
    expect(entry(day, "alquiler|UYU|todas|any|uy")!.point.n).toBe(8);
    expect(entry(day, "alquiler|UYU|todas|any|uy")!.point.p25).toBe(21750);
    expect(day.groups).toBe(8);
    expect(day.adverts).toBe(9);
  });
  it("ignores observations of another market", () => {
    const day = buildMarketDay({ vertical: "venta", today: TODAY, observations: flats(8), logs: new Map() });
    expect(day.entries).toEqual([]);
  });
  it("price per built m2 only from explicit built area, cars never", () => {
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(8, () => ({ areaBuilt: 50 })), logs: new Map() });
    expect(entry(day, "alquiler|UYU|todas|any|uy")!.point.m2).toEqual({ n: 8, med: 470 });
    const cars = buildMarketDay({
      vertical: "autos",
      today: TODAY,
      observations: Array.from({ length: 8 }, (_, i) => car({ advertId: `ml-${i}`, groupKey: `ml-${i}` })),
      logs: new Map(),
    });
    expect(entry(cars, "autos|USD|all")!.point.m2).toBeNull();
    expect(entry(cars, "autos|USD|m:toyota-hilux")!.label).toBe("Toyota Hilux");
  });
});

describe("buildMarketDay: misma oferta", () => {
  const logsAt = (price: number, currency: "UYU" | "USD" = "UYU"): Map<string, MarketPriceLog> =>
    new Map(
      Array.from({ length: 8 }, (_, i) => {
        const key = marketLogKey("alquiler", `infocasas:${i}`);
        const log: MarketPriceLog = {
          key,
          vertical: "alquiler",
          advertId: `infocasas:${i}`,
          firstSeen: "2026-06-01",
          lastSeen: "2026-09-17",
          points: [{ d: "2026-06-01", p: price, c: currency }],
        };
        return [key, log];
      }),
    );

  it("each advert against its own price 7/30/90 days ago", () => {
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(8, () => ({ price: 90 })), logs: logsAt(100) });
    const uy = entry(day, "alquiler|UYU|todas|any|uy")!.point;
    expect(uy.w7).toMatchObject({ n: 8, chg: -0.1, down: 8 });
    expect(uy.w30).toMatchObject({ n: 8, chg: -0.1 });
    expect(uy.w90).toMatchObject({ n: 8, chg: -0.1 });
  });
  it("never pairs across currencies", () => {
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(8, () => ({ price: 90 })), logs: logsAt(100, "USD") });
    expect(entry(day, "alquiler|UYU|todas|any|uy")!.point.w30).toBeNull();
  });
  it("a cohort with 4 homes but 8 repriced adverts still publishes its pairs", () => {
    const observations = flats(8, i => ({ groupKey: `prop-${i % 4}`, price: 90 }));
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: logsAt(100) });
    const uy = entry(day, "alquiler|UYU|todas|any|uy")!.point;
    expect(uy.n).toBe(4);
    expect(uy.med).toBeNull();
    expect(uy.w30!.n).toBe(8);
  });
  it("a reading not refreshed since the reference day is not a pair: it would be compared with itself", () => {
    // Measured 2026-09-24 on the sale catalogue: 5.988 of 12.397 seven-day pairs were this, all "same".
    const stale = flats(8, () => ({ price: 100, seenAt: "2026-09-08", seenDay: "2026-09-08" }));
    const logs = new Map<string, MarketPriceLog>(
      stale.map(obs => {
        const key = marketLogKey("alquiler", obs.advertId);
        return [key, { key, vertical: "alquiler", advertId: obs.advertId, firstSeen: "2026-09-08", lastSeen: "2026-09-08", points: [{ d: "2026-09-08", p: 100, c: "UYU" }] }];
      }),
    );
    const uy = entry(buildMarketDay({ vertical: "alquiler", today: TODAY, observations: stale, logs }), "alquiler|UYU|todas|any|uy")!.point;
    expect(uy.w7).toBeNull();
    expect(uy.w30).toBeNull();
  });
  it("a reading from after the reference day pairs even when it is not from today", () => {
    const observations = flats(8, () => ({ price: 90, seenAt: "2026-09-12", seenDay: "2026-09-12" }));
    const uy = entry(buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: logsAt(100) }), "alquiler|UYU|todas|any|uy")!.point;
    expect(uy.w7).toMatchObject({ n: 8, chg: -0.1 });
  });
  it("no window is measured before tracking has lasted that long", () => {
    const observations = flats(8, () => ({ price: 90 }));
    const early = entry(
      buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: logsAt(100), trackingSince: "2026-09-12" }),
      "alquiler|UYU|todas|any|uy",
    )!.point;
    expect(early.w7).toBeNull();
    const week = entry(
      buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: logsAt(100), trackingSince: "2026-09-11" }),
      "alquiler|UYU|todas|any|uy",
    )!.point;
    expect(week.w7).toMatchObject({ n: 8, chg: -0.1 });
    expect(week.w30).toBeNull();
    expect(week.w90).toBeNull();
  });
  it("returns only the logs that changed", () => {
    const observations = flats(8, i => ({ price: i === 0 ? 90 : 100, seenAt: "2026-09-17", seenDay: "2026-09-17" }));
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations, logs: logsAt(100) });
    expect(day.logs.map(log => log.advertId)).toEqual(["infocasas:0"]);
  });
});

describe("buildMarketDay: histogram", () => {
  it("draws the shape from 30 homes on, from the same units as the level", () => {
    const day = buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(30), logs: new Map() });
    expect(entry(day, "alquiler|UYU|todas|any|uy")!.hist).toMatchObject({ n: 30 });
    const small = buildMarketDay({ vertical: "alquiler", today: TODAY, observations: flats(8), logs: new Map() });
    expect(entry(small, "alquiler|UYU|todas|any|uy")!.hist).toBeNull();
  });
});

describe("preferredName", () => {
  it("most frequent spelling; a tie goes to the accented one", () => {
    expect(preferredName(new Map([["Paysandu", 1], ["Paysandú", 1]]))).toBe("Paysandú");
    expect(preferredName(new Map([["Paysandú", 1], ["Paysandu", 1]]))).toBe("Paysandú");
    expect(preferredName(new Map([["Paysandu", 3], ["Paysandú", 1]]))).toBe("Paysandu");
    expect(preferredName(new Map())).toBeNull();
  });
  it("a tie goes to the capitalized spelling; an all-lowercase name is capitalized", () => {
    expect(preferredName(new Map([["pocitos", 1], ["Pocitos", 1]]))).toBe("Pocitos");
    expect(preferredName(new Map([["carrasco", 4]]))).toBe("Carrasco");
    expect(preferredName(new Map([["barra de carrasco", 4]]))).toBe("Barra de Carrasco");
    expect(preferredName(new Map([["Barra De Carrasco", 1]]))).toBe("Barra De Carrasco");
  });
});

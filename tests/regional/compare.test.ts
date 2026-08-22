import { describe, expect, it } from "vitest";
import { compareRoutes, convert, foreignPerDollar } from "../../classes/regional/compare";
import { makeQuote } from "../../classes/regional/quote";
import type { RegionalCountry, RegionalKind, RegionalQuote } from "../../classes/regional/types";

function q(
  country: RegionalCountry,
  market: string,
  kind: RegionalKind,
  base: string,
  quoteCurrency: string,
  legs: { buy?: number | null; sell?: number | null; avg?: number | null }
): RegionalQuote {
  return makeQuote({
    country,
    market,
    label: `${country} ${market}`,
    kind,
    base,
    quote: quoteCurrency,
    buy: legs.buy ?? null,
    sell: legs.sell ?? null,
    avg: legs.avg ?? null,
    updatedAt: "2026-08-21T18:00:00.000Z",
    source: "test",
    sourceUrl: "https://example.test",
  })!;
}

const board: RegionalQuote[] = [
  q("UY", "casas", "retail", "USD", "UYU", { buy: 40, sell: 40.4 }),
  q("UY", "casas", "retail", "ARS", "UYU", { buy: 0.0247, sell: 0.03 }),
  q("UY", "casas", "retail", "BRL", "UYU", { buy: 7.8, sell: 8.15 }),
  q("AR", "oficial", "official", "USD", "ARS", { buy: 1465, sell: 1515 }),
  q("AR", "blue", "parallel", "USD", "ARS", { buy: 1530, sell: 1550 }),
  q("BR", "ptax", "official", "USD", "BRL", { buy: 5.1619, sell: 5.1625 }),
  q("BR", "turismo", "retail", "USD", "BRL", { buy: 5.09903, sell: 5.49918 }),
];

describe("foreignPerDollar", () => {
  it("uses the street price where one exists — that is what a traveller gets", () => {
    expect(foreignPerDollar(board, "AR")?.market).toBe("blue");
  });

  it("falls back to the counter price when there is no street market", () => {
    expect(foreignPerDollar(board, "BR")?.market).toBe("turismo");
  });

  it("returns null rather than guessing when the country is missing", () => {
    expect(foreignPerDollar(board, "BO")).toBeNull();
  });
});

describe("compareRoutes", () => {
  it("prices both routes in pesos uruguayos per unit and names the winner", () => {
    const ars = compareRoutes(board).find((entry) => entry.currency === "ARS")!;
    const local = ars.routes.find((route) => route.kind === "local")!;
    const dollars = ars.routes.find((route) => route.kind === "dollars")!;
    // Buying pesos here costs 0,03 UYU each; taking dollars costs 40,4/1530.
    expect(local.costPerUnit).toBe(0.03);
    expect(dollars.costPerUnit).toBeCloseTo(40.4 / 1530, 6);
    expect(ars.best).toBe("dollars");
    expect(ars.differencePct).toBeCloseTo(13.6, 0);
  });

  it("takes the side of the foreign market a traveller is actually on", () => {
    // Selling dollars in Argentina means taking the market's BID (1530), never
    // its ask — the traveller is the one selling.
    const ars = compareRoutes(board).find((entry) => entry.currency === "ARS")!;
    expect(ars.routes.find((route) => route.kind === "dollars")!.legs).toEqual(["UY:casas:USDUYU", "AR:blue:USDARS"]);
  });

  it("says which leg is missing instead of pricing a route it cannot price", () => {
    const bob = compareRoutes(board).find((entry) => entry.currency === "BOB")!;
    expect(bob.routes).toHaveLength(0);
    expect(bob.best).toBeNull();
    expect(bob.differencePct).toBeNull();
    expect(bob.missing.length).toBeGreaterThan(0);
  });

  it("covers every neighbour whose currency Uruguayan casas quote", () => {
    expect(compareRoutes(board).map((entry) => entry.currency)).toEqual(["ARS", "BRL", "PYG", "CLP", "BOB"]);
  });
});

describe("convert", () => {
  it("converts through the dollar and names the legs it used", () => {
    const result = convert(board, "ARS", "UYU", 10_000)!;
    // 10 000 pesos argentinos at the official rate, into pesos uruguayos.
    expect(result.rate).toBeCloseTo(40.2 / 1490, 8);
    expect(result.result).toBeCloseTo(10_000 * (40.2 / 1490), 2);
    expect(result.legs).toEqual(["AR:oficial:USDARS", "UY:casas:USDUYU"]);
    expect(result.via).toBe("USD");
  });

  it("honours a pinned market — the whole point of the parameter", () => {
    const official = convert(board, "ARS", "UYU", 10_000, "oficial")!;
    const blue = convert(board, "ARS", "UYU", 10_000, "blue")!;
    expect(blue.result).toBeLessThan(official.result);
    expect(blue.legs[0]).toBe("AR:blue:USDARS");
  });

  it("handles the dollar on either side without a pivot", () => {
    expect(convert(board, "USD", "ARS", 1)!.result).toBeCloseTo(1490, 0);
    expect(convert(board, "ARS", "USD", 1490)!.result).toBeCloseTo(1, 2);
  });

  it("is the identity for the same currency and null for an unknown pair", () => {
    expect(convert(board, "UYU", "UYU", 55)!.result).toBe(55);
    expect(convert(board, "ARS", "PYG", 100)).toBeNull();
    expect(convert(board, "ARS", "UYU", -1)).toBeNull();
  });
});

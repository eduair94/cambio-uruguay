import { describe, expect, it } from "vitest";
import { isoOrNow, makeQuote, parseLocaleNumber, quoteId, round } from "../../classes/regional/quote";

describe("parseLocaleNumber", () => {
  it("reads a machine decimal as a decimal when told the style", () => {
    // The bug this exists for: AwesomeAPI's bid for the dollar in reais is
    // "5.138". Read as a thousands group it becomes 5138, the buy leg ends up a
    // thousand times the sell leg, and the validator throws the quote away.
    expect(parseLocaleNumber("5.138", "dot")).toBe(5.138);
    expect(parseLocaleNumber("5.1395", "dot")).toBe(5.1395);
    expect(parseLocaleNumber("-1.05", "dot")).toBe(-1.05);
  });

  it("reads Spanish-style numbers with dot thousands and comma decimals", () => {
    expect(parseLocaleNumber("6.021,64", "latam")).toBe(6021.64);
    expect(parseLocaleNumber("1.530,00", "latam")).toBe(1530);
    expect(parseLocaleNumber("149,67", "latam")).toBe(149.67);
    expect(parseLocaleNumber("$1531,70", "latam")).toBe(1531.7);
  });

  it("strips currency symbols, spaces and non-breaking spaces", () => {
    expect(parseLocaleNumber("₲ 6.009,15", "latam")).toBe(6009.15);
    expect(parseLocaleNumber(" 5.850", "dot")).toBe(5.85);
  });

  it("falls back to the ambiguous rule only in auto mode", () => {
    expect(parseLocaleNumber("6.021", "auto")).toBe(6021);
    expect(parseLocaleNumber("6.0215", "auto")).toBe(6.0215);
    expect(parseLocaleNumber("6.021", "dot")).toBe(6.021);
  });

  it("returns null for anything that is not a number", () => {
    expect(parseLocaleNumber("")).toBeNull();
    expect(parseLocaleNumber(null)).toBeNull();
    expect(parseLocaleNumber(undefined)).toBeNull();
    expect(parseLocaleNumber("s/c")).toBeNull();
    expect(parseLocaleNumber(Number.NaN)).toBeNull();
  });
});

describe("makeQuote", () => {
  const base = {
    country: "AR" as const,
    market: "blue",
    label: "Dólar blue",
    kind: "parallel" as const,
    base: "USD",
    quote: "ARS",
    updatedAt: "2026-08-21T19:59:00.000Z",
    source: "ar_dolarapi",
    sourceUrl: "https://dolarapi.com/v1/dolares",
  };

  it("derives id, mid price and spread from the two legs", () => {
    const quote = makeQuote({ ...base, buy: 1530, sell: 1550 })!;
    expect(quote.id).toBe("AR:blue:USDARS");
    expect(quote.avg).toBe(1540);
    expect(quote.spreadPct).toBeCloseTo(1.3072, 3);
  });

  it("keeps a one-sided quote instead of dropping it", () => {
    const quote = makeQuote({ ...base, market: "observado", kind: "official", avg: 923.23, quote: "CLP" })!;
    expect(quote.avg).toBe(923.23);
    expect(quote.buy).toBeNull();
    expect(quote.sell).toBeNull();
    expect(quote.spreadPct).toBeNull();
  });

  it("drops the buy leg of a card dollar, which has no buy side", () => {
    // Publishers fill `compra` for the dólar tarjeta with whatever they have —
    // the official buy rate, or the pre-tax rate — and three sources disagreed
    // by 11% purely on that meaningless leg.
    const quote = makeQuote({ ...base, market: "tarjeta", kind: "card", buy: 1911, sell: 1976 })!;
    expect(quote.buy).toBeNull();
    expect(quote.sell).toBe(1976);
    expect(quote.avg).toBe(1976);
  });

  it("returns null when there is no usable price at all", () => {
    expect(makeQuote({ ...base, buy: 0, sell: 0 })).toBeNull();
    expect(makeQuote({ ...base, buy: null, sell: null, avg: null })).toBeNull();
  });

  it("carries the sample size only when the row summarises several boards", () => {
    expect(makeQuote({ ...base, buy: 1, sell: 2 })!.sample).toBeUndefined();
    expect(makeQuote({ ...base, buy: 1, sell: 2, sample: 20 })!.sample).toBe(20);
  });
});

describe("isoOrNow", () => {
  it("parses dd/mm/yyyy dates the region publishes", () => {
    expect(isoOrNow("21/08/2026 - 18:35")).toBe("2026-08-21T18:35:00.000Z");
  });

  it("passes ISO through untouched", () => {
    expect(isoOrNow("2026-08-21T19:59:00.000Z")).toBe("2026-08-21T19:59:00.000Z");
  });

  it("never returns an invalid date", () => {
    expect(Number.isNaN(Date.parse(isoOrNow("no es una fecha")))).toBe(false);
  });
});

describe("helpers", () => {
  it("builds stable ids", () => {
    expect(quoteId("BR", "ptax", "USD", "BRL")).toBe("BR:ptax:USDBRL");
  });

  it("rounds without floating-point noise", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(6009.154999, 2)).toBe(6009.15);
  });
});

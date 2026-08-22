import { describe, expect, it } from "vitest";
import { buildUyQuotes, median, type LocalRateRow } from "../../classes/regional/sources/uy_local";

const row = (origin: string, code: string, buy: number, sell: number, type = ""): LocalRateRow => ({
  origin,
  code,
  type,
  buy,
  sell,
});

describe("buildUyQuotes", () => {
  it("publishes the best price in the market, not its average", () => {
    const quotes = buildUyQuotes([
      row("cambio_a", "USD", 39.5, 41.4),
      row("cambio_b", "USD", 40, 40.6),
      row("cambio_c", "USD", 39.8, 41.2),
    ]);
    const usd = quotes.find((quote) => quote.id === "UY:casas:USDUYU")!;
    expect(usd.buy).toBe(40);
    expect(usd.sell).toBe(40.6);
    expect(usd.sample).toBe(3);
  });

  it("drops a board quoting a multiple of the market and keeps the honest ones", () => {
    // Roughly half the casas that print a peso-argentino price do not trade it
    // and leave the sign up for months; one was live at eleven times the market.
    const quotes = buildUyQuotes([
      row("cambio_a", "ARS", 0.02, 0.035),
      row("cambio_b", "ARS", 0.0247, 0.033),
      row("cambio_c", "ARS", 0.021, 0.03),
      row("cambio_junk", "ARS", 0.01, 0.25),
    ]);
    const ars = quotes.find((quote) => quote.id === "UY:casas:ARSUYU")!;
    expect(ars.sell).toBe(0.03);
    expect(ars.buy).toBe(0.0247);
    expect(ars.sample).toBe(3);
  });

  it("judges each side against its own median, never against the other's", () => {
    // The peso's market spread is enormous (bid 0,02 against ask 0,05).
    // Measuring bids against the ask median leaves the row with no bids at all.
    const quotes = buildUyQuotes([
      row("cambio_a", "ARS", 0.02, 0.05),
      row("cambio_b", "ARS", 0.021, 0.048),
      row("cambio_c", "ARS", 0.0247, 0.052),
    ]);
    const ars = quotes.find((quote) => quote.id === "UY:casas:ARSUYU")!;
    expect(ars.buy).toBe(0.0247);
    expect(ars.sample).toBe(3);
  });

  it("never mixes the BCU reference into the casa prices", () => {
    const quotes = buildUyQuotes([row("cambio_a", "USD", 39.5, 41.4), row("bcu", "USD", 40.182, 40.182, "BILLETE")]);
    const casas = quotes.find((quote) => quote.id === "UY:casas:USDUYU")!;
    const bcu = quotes.find((quote) => quote.id === "UY:bcu:USDUYU")!;
    expect(casas.buy).toBe(39.5);
    expect(bcu.avg).toBe(40.182);
    expect(bcu.kind).toBe("official");
  });

  it("names the BCU's cash quote when it publishes the same value under three types", () => {
    const quotes = buildUyQuotes([
      row("bcu", "USD", 40.182, 40.182, "PROMED.FONDO"),
      row("bcu", "USD", 40.182, 40.182, "BILLETE"),
      row("bcu", "USD", 40.182, 40.182, "CABLE"),
    ]);
    expect(quotes.find((quote) => quote.id === "UY:bcu:USDUYU")).toBeTruthy();
  });

  it("ignores wholesale quote types the public cannot transact at", () => {
    const quotes = buildUyQuotes([row("cambio_a", "USD", 39.5, 41.4), row("cambio_b", "USD", 40.9, 40.95, "INTERBANCARIO")]);
    const usd = quotes.find((quote) => quote.id === "UY:casas:USDUYU")!;
    expect(usd.buy).toBe(39.5);
    expect(usd.sample).toBe(1);
  });

  it("returns nothing for a currency no casa quotes", () => {
    expect(buildUyQuotes([row("cambio_a", "USD", 39.5, 41.4)]).some((quote) => quote.quote === "PYG")).toBe(false);
  });

  it("survives an empty board", () => {
    expect(buildUyQuotes([])).toEqual([]);
  });
});

describe("median", () => {
  it("averages the middle pair on an even-length list", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("ignores non-positive and non-finite values", () => {
    expect(median([0, -1, Number.NaN, 5, 7])).toBe(6);
    expect(median([])).toBeNull();
  });
});

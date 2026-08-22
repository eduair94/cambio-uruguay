import { describe, expect, it } from "vitest";
import { makeQuote } from "../../classes/regional/quote";
import { dedupeQuotes, validateQuotes } from "../../classes/regional/validate";
import type { RegionalCountry, RegionalKind, RegionalQuote } from "../../classes/regional/types";

interface QuoteOptions {
  country?: RegionalCountry;
  market?: string;
  kind?: RegionalKind;
  base?: string;
  quote?: string;
  buy?: number | null;
  sell?: number | null;
  avg?: number | null;
  source?: string;
  updatedAt?: string;
}

function q(options: QuoteOptions): RegionalQuote {
  return makeQuote({
    country: options.country ?? "AR",
    market: options.market ?? "blue",
    label: "test",
    kind: options.kind ?? "parallel",
    base: options.base ?? "USD",
    quote: options.quote ?? "ARS",
    buy: options.buy ?? null,
    sell: options.sell ?? null,
    avg: options.avg ?? null,
    updatedAt: options.updatedAt ?? "2026-08-21T18:00:00.000Z",
    source: options.source ?? "ar_dolarapi",
    sourceUrl: "https://example.test",
  })!;
}

describe("validateQuotes — shape", () => {
  it("throws out a quote whose legs are inverted by orders of magnitude", () => {
    // The real failure: a decimal read as a thousands group gave buy 5138 /
    // sell 5.1395 for the Brazilian commercial dollar.
    const { kept, rejected } = validateQuotes([
      q({ country: "BR", market: "comercial", kind: "wholesale", quote: "BRL", buy: 5138, sell: 5.1395 }),
    ]);
    expect(kept).toHaveLength(0);
    expect(rejected[0].reason).toMatch(/por debajo de la compra/);
  });

  it("tolerates a slightly crossed composite, which is a real market state", () => {
    // The Uruguayan best-of-market row takes the highest bid and the cheapest
    // ask across ~46 casas; measured live, best bid 40,00 sat above cheapest
    // ask 39,55.
    const { kept } = validateQuotes([
      q({ country: "UY", market: "casas", kind: "retail", quote: "UYU", buy: 40, sell: 39.55, source: "uy_local" }),
    ]);
    expect(kept).toHaveLength(1);
  });

  it("throws out a spread so wide it is signage rather than an offer", () => {
    const { kept, rejected } = validateQuotes([
      q({ country: "PY", market: "casas", kind: "retail", base: "UYU", quote: "PYG", buy: 130, sell: 200, source: "py_maxicambios" }),
    ]);
    expect(kept).toHaveLength(0);
    expect(rejected[0].reason).toMatch(/cartel/);
  });

  it("throws out a dollar price outside the band its currency could be in", () => {
    const { kept, rejected } = validateQuotes([q({ market: "oficial", kind: "official", buy: 1.5, sell: 1.6 })]);
    expect(kept).toHaveLength(0);
    expect(rejected[0].reason).toMatch(/fuera de banda/);
  });

  it("keeps a normal two-sided quote untouched", () => {
    const { kept, rejected } = validateQuotes([q({ buy: 1530, sell: 1550 })]);
    expect(kept).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });
});

describe("validateQuotes — consensus", () => {
  it("drops the publisher that disagrees with the median of three or more", () => {
    const { kept, rejected } = validateQuotes([
      q({ buy: 1530, sell: 1550, source: "ar_dolarapi" }),
      q({ buy: 1517, sell: 1550, source: "ar_bluelytics" }),
      q({ buy: 1528, sell: 1549, source: "ar_ambito" }),
      q({ buy: 3000, sell: 3100, source: "ar_dolarhoy" }),
    ]);
    expect(kept.map((quote) => quote.source).sort()).toEqual(["ar_ambito", "ar_bluelytics", "ar_dolarapi"]);
    expect(rejected[0].source).toBe("ar_dolarhoy");
    expect(rejected[0].reason).toMatch(/lejos de la mediana/);
  });

  it("does not apply consensus to a market only two publishers cover", () => {
    // Two disagreeing sources are a disagreement, not a majority. Both survive
    // and `dedupeQuotes` records the distance between them.
    const { kept } = validateQuotes([
      q({ buy: 1530, sell: 1550, source: "ar_dolarapi" }),
      q({ buy: 1800, sell: 1850, source: "ar_ambito" }),
    ]);
    expect(kept).toHaveLength(2);
  });
});

describe("validateQuotes — coherence", () => {
  const dollarLegs = [
    q({ market: "oficial", kind: "official", buy: 1465, sell: 1515 }),
    q({ country: "BR", market: "ptax", kind: "official", quote: "BRL", buy: 5.1619, sell: 5.1625, source: "br_bcb" }),
  ];

  it("keeps a cross that agrees with the dollar legs of the same country", () => {
    // 1515/5.1625 ≈ 291 pesos per real; the BCRA publishes 291,3.
    const { kept, rejected } = validateQuotes([...dollarLegs, q({ market: "oficial", kind: "official", base: "BRL", avg: 291.3 })]);
    expect(rejected).toHaveLength(0);
    expect(kept.some((quote) => quote.id === "AR:oficial:BRLARS")).toBe(true);
  });

  it("throws out a cross the dollar legs cannot explain", () => {
    // What a column shift in a scraped table looks like: right shape, right
    // band, wrong by a factor.
    const { kept, rejected } = validateQuotes([...dollarLegs, q({ market: "oficial", kind: "official", base: "BRL", avg: 29.1 })]);
    expect(kept.some((quote) => quote.id === "AR:oficial:BRLARS")).toBe(false);
    expect(rejected[0].reason).toMatch(/cruce implícito/);
  });

  it("anchors coherence on the official dollar, not on whichever came first", () => {
    // Argentina publishes seven dollars spanning 30%. Anchoring on the card
    // dollar (1976) would reject the correct cross and accept a wrong one.
    const { rejected } = validateQuotes([
      q({ market: "tarjeta", kind: "card", sell: 1976 }),
      ...dollarLegs,
      q({ market: "oficial", kind: "official", base: "BRL", avg: 291.3 }),
    ]);
    expect(rejected).toHaveLength(0);
  });
});

describe("validateQuotes — the international fallback", () => {
  it("throws it out when it contradicts the country's own price", () => {
    // Measured live on 2026-08-22: the free mid-market feed had the Chilean peso
    // 11% off, the Uruguayan 12% and the boliviano 39%, while being right about
    // the Argentine peso and the real.
    const { kept, rejected } = validateQuotes([
      q({ country: "CL", market: "observado", kind: "official", quote: "CLP", avg: 923.23, source: "cl_mindicador" }),
      q({ country: "CL", market: "internacional", kind: "reference", quote: "CLP", avg: 818.42, source: "world_erapi" }),
    ]);
    expect(kept.map((quote) => quote.source)).toEqual(["cl_mindicador"]);
    expect(rejected[0].reason).toMatch(/referencia internacional/);
  });

  it("keeps it when it agrees, so it can still corroborate", () => {
    const { kept } = validateQuotes([
      q({ country: "BR", market: "ptax", kind: "official", quote: "BRL", avg: 5.1622, source: "br_bcb" }),
      q({ country: "BR", market: "internacional", kind: "reference", quote: "BRL", avg: 5.177, source: "world_erapi" }),
    ]);
    expect(kept).toHaveLength(2);
  });

  it("keeps it when the country has nothing else — that is what a fallback is for", () => {
    const { kept, rejected } = validateQuotes([
      q({ country: "BO", market: "internacional", kind: "reference", quote: "BOB", avg: 7.01, source: "world_erapi" }),
    ]);
    expect(kept).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("never lets a street price police the fallback", () => {
    // Argentina's blue can sit far from the official rate for years; only prices
    // a person can actually reach anchor the check, and the blue is one — but
    // the official one wins the anchor, so a 2% gap does not evict the feed.
    const { kept } = validateQuotes([
      q({ market: "oficial", kind: "official", buy: 1465, sell: 1515 }),
      q({ market: "blue", kind: "parallel", buy: 1530, sell: 1550 }),
      q({ market: "internacional", kind: "reference", avg: 1497.45, source: "world_erapi" }),
    ]);
    expect(kept.some((quote) => quote.source === "world_erapi")).toBe(true);
  });
});

describe("dedupeQuotes", () => {
  it("keeps the central bank's reading over a vendor's and a newspaper's", () => {
    const merged = dedupeQuotes([
      q({ country: "PY", market: "referencial", kind: "official", quote: "PYG", avg: 6009, source: "world_erapi" }),
      q({ country: "PY", market: "referencial", kind: "official", quote: "PYG", buy: 6008.1, sell: 6011.22, source: "py_bcp" }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("py_bcp");
    expect(merged[0].corroboratedBy).toEqual(["world_erapi"]);
  });

  it("records the widest disagreement between publishers of the same market", () => {
    const merged = dedupeQuotes([
      q({ buy: 1530, sell: 1550, source: "ar_dolarapi" }),
      q({ buy: 1517, sell: 1550, source: "ar_bluelytics" }),
      q({ buy: 1400, sell: 1450, source: "ar_dolarhoy" }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].corroboratedBy).toHaveLength(2);
    expect(merged[0].disagreementPct).toBeGreaterThan(5);
  });

  it("prefers a two-sided quote over a one-sided one within the same rank", () => {
    const merged = dedupeQuotes([
      q({ market: "oficial", kind: "official", avg: 1500, source: "ar_dolarapi" }),
      q({ market: "oficial", kind: "official", buy: 1465, sell: 1515, source: "ar_bluelytics" }),
    ]);
    expect(merged[0].source).toBe("ar_bluelytics");
  });

  it("marks a quote nobody corroborated with an empty list, not a missing field", () => {
    const merged = dedupeQuotes([q({ buy: 1530, sell: 1550 })]);
    expect(merged[0].corroboratedBy).toEqual([]);
    expect(merged[0].disagreementPct).toBeNull();
  });
});

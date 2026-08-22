import { describe, expect, it } from "vitest";
import { buildBoard, buildCross, buildGaps, oldestQuoteAt, usdAnchors } from "../../classes/regional/derive";
import { makeQuote } from "../../classes/regional/quote";
import type { RegionalKind, RegionalQuote } from "../../classes/regional/types";

function q(
  country: "AR" | "BR" | "UY" | "BO" | "PY" | "CL",
  market: string,
  kind: RegionalKind,
  quoteCurrency: string,
  legs: { buy?: number | null; sell?: number | null; avg?: number | null },
  updatedAt = "2026-08-21T18:00:00.000Z"
): RegionalQuote {
  return makeQuote({
    country,
    market,
    label: `${country} ${market}`,
    kind,
    base: "USD",
    quote: quoteCurrency,
    buy: legs.buy ?? null,
    sell: legs.sell ?? null,
    avg: legs.avg ?? null,
    updatedAt,
    source: "test",
    sourceUrl: "https://example.test",
  })!;
}

const quotes: RegionalQuote[] = [
  q("AR", "referencia", "official", "ARS", { avg: 1499 }),
  q("AR", "oficial", "official", "ARS", { buy: 1465, sell: 1515 }),
  q("AR", "blue", "parallel", "ARS", { buy: 1530, sell: 1550 }),
  q("AR", "tarjeta", "card", "ARS", { sell: 1976 }),
  q("BR", "ptax", "official", "BRL", { buy: 5.1619, sell: 5.1625 }),
  q("BR", "turismo", "retail", "BRL", { buy: 5.09903, sell: 5.49918 }),
  q("UY", "bcu", "official", "UYU", { avg: 40.182 }),
  q("UY", "casas", "retail", "UYU", { buy: 40, sell: 40.6 }),
];

describe("buildBoard", () => {
  it("shows the rate a country calls 'the official one', not merely an official one", () => {
    // Argentina publishes a retail official rate (~1 515) and the BCRA's own
    // reference (~1 499). Both are official; only one is what Argentines mean.
    const board = buildBoard(quotes);
    const ar = board.find((row) => row.country === "AR")!;
    expect(ar.official?.market).toBe("oficial");
    expect(ar.parallel?.market).toBe("blue");
  });

  it("keeps the six countries in a stable order with Uruguay first", () => {
    expect(buildBoard(quotes).map((row) => row.country)).toEqual(["UY", "AR", "BR", "PY", "CL", "BO"]);
  });

  it("leaves a country with no data as an empty row rather than dropping it", () => {
    const board = buildBoard(quotes);
    const py = board.find((row) => row.country === "PY")!;
    expect(py.official).toBeNull();
    expect(py.quotes).toEqual([]);
    expect(py.gap).toBeNull();
  });

  it("prices one unit of the local currency in dollars", () => {
    const ar = buildBoard(quotes).find((row) => row.country === "AR")!;
    expect(ar.usdPerUnit).toBeCloseTo(1 / 1490, 8);
  });
});

describe("gaps", () => {
  it("measures ask against ask, which is what a traveller pays", () => {
    // Brazil's tourism markup is 6.5% ask-to-ask and 2.6% between mid prices.
    // The 6.5% is the one somebody changing money in Chuí actually pays.
    const gap = buildGaps(buildBoard(quotes)).find((entry) => entry.country === "BR")!;
    expect(gap.market).toBe("turismo");
    expect(gap.gapPct).toBeCloseTo(6.52, 1);
  });

  it("falls back to mid prices when either side publishes only one", () => {
    const gap = buildGaps(buildBoard(quotes)).find((entry) => entry.country === "UY")!;
    expect(gap.official).toBe(40.182);
    expect(gap.parallel).toBe(40.3);
  });

  it("prefers the street price over the counter price when both exist", () => {
    const gap = buildGaps(buildBoard(quotes)).find((entry) => entry.country === "AR")!;
    expect(gap.market).toBe("blue");
    expect(gap.gapPct).toBeCloseTo(2.31, 1);
  });
});

describe("cross rates", () => {
  it("never anchors on a card or street price", () => {
    const anchors = usdAnchors(quotes);
    expect(anchors.get("ARS")?.market).toBe("oficial");
    expect(anchors.get("BRL")?.market).toBe("ptax");
  });

  it("implies every ordered pair through the dollar and names both legs", () => {
    const cross = buildCross(quotes);
    const arsToUyu = cross.find((entry) => entry.base === "ARS" && entry.quote === "UYU")!;
    expect(arsToUyu.rate).toBeCloseTo(40.182 / 1490, 6);
    expect(arsToUyu.via).toEqual(["AR:oficial:USDARS", "UY:bcu:USDUYU"]);
    // Both directions, never the identity pair.
    expect(cross.some((entry) => entry.base === entry.quote)).toBe(false);
    expect(cross.some((entry) => entry.base === "UYU" && entry.quote === "ARS")).toBe(true);
  });
});

describe("oldestQuoteAt", () => {
  it("reports the freshness floor, not the newest read", () => {
    const stale = q("BO", "oficial", "official", "BOB", { avg: 11.52 }, "2026-08-19T00:00:00.000Z");
    expect(oldestQuoteAt([...quotes, stale])).toBe("2026-08-19T00:00:00.000Z");
  });

  it("returns null for an empty board", () => {
    expect(oldestQuoteAt([])).toBeNull();
  });
});

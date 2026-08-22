import { describe, expect, it } from "vitest";
import { buildSnapshot } from "../../classes/regional/refresh";
import { quoteDay, snapshotHistoryPoints } from "../../classes/regional/history";
import { parseArHistory } from "../../classes/regional/sources/ar_argentinadatos";
import { sgsWindows } from "../../classes/regional/sources/br_bcb";
import { makeQuote } from "../../classes/regional/quote";
import { publishDecision } from "../../classes/regional/store";
import type { RegionalCountry, RegionalKind, RegionalQuote, RegionalSourceRun } from "../../classes/regional/types";

function q(
  country: RegionalCountry,
  market: string,
  kind: RegionalKind,
  quoteCurrency: string,
  legs: { buy?: number; sell?: number; avg?: number },
  source: string,
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
    source,
    sourceUrl: "https://example.test",
  })!;
}

function run(id: string, quotes: RegionalQuote[], ok = true, note = "ok"): RegionalSourceRun {
  return { id, ok, quotes, note, ms: 10 };
}

describe("buildSnapshot", () => {
  const runs = [
    run("ar_dolarapi", [
      q("AR", "oficial", "official", "ARS", { buy: 1465, sell: 1515 }, "ar_dolarapi"),
      q("AR", "blue", "parallel", "ARS", { buy: 1530, sell: 1550 }, "ar_dolarapi"),
    ]),
    run("ar_bluelytics", [q("AR", "blue", "parallel", "ARS", { buy: 1517, sell: 1550 }, "ar_bluelytics")]),
    run("br_bcb", [q("BR", "ptax", "official", "BRL", { buy: 5.1619, sell: 5.1625 }, "br_bcb")]),
    run("py_bcp", [], false, "no respondió en 30000 ms"),
  ];
  const localRows = [
    { origin: "cambio_a", code: "USD", type: "", buy: 40, sell: 40.6 },
    { origin: "cambio_b", code: "ARS", type: "", buy: 0.0247, sell: 0.03 },
  ];

  it("publishes the board with whatever answered and names who did not", () => {
    const { snapshot } = buildSnapshot(runs, localRows);
    const failed = snapshot.sources.find((source) => source.id === "py_bcp")!;
    expect(failed.ok).toBe(false);
    expect(failed.note).toMatch(/no respondió/);
    expect(snapshot.quotes.length).toBeGreaterThan(3);
  });

  it("collapses two readings of the same market into one corroborated row", () => {
    const { snapshot } = buildSnapshot(runs, localRows);
    const blue = snapshot.quotes.filter((quote) => quote.id === "AR:blue:USDARS");
    expect(blue).toHaveLength(1);
    expect(blue[0].corroboratedBy).toHaveLength(1);
  });

  it("adds this site's own board as a source run of its own", () => {
    const { snapshot } = buildSnapshot(runs, localRows);
    const local = snapshot.sources.find((source) => source.id === "uy_local")!;
    expect(local.ok).toBe(true);
    expect(local.quotes).toBe(2);
  });

  it("derives the board, the gaps, the crosses and the routes in one pass", () => {
    const { snapshot, routes } = buildSnapshot(runs, localRows);
    expect(snapshot.board.map((row) => row.country)).toEqual(["UY", "AR", "BR", "PY", "CL", "BO"]);
    expect(snapshot.gaps.some((gap) => gap.country === "AR")).toBe(true);
    expect(snapshot.cross.length).toBeGreaterThan(0);
    expect(snapshot.routes).toBe(routes);
    expect(routes.find((route) => route.currency === "ARS")!.best).toBe("dollars");
  });

  it("survives every source failing at once", () => {
    const { snapshot } = buildSnapshot([run("ar_dolarapi", [], false, "timeout")], []);
    expect(snapshot.quotes).toEqual([]);
    expect(snapshot.board).toHaveLength(6);
    expect(snapshot.oldestQuoteAt).toBeNull();
  });
});

describe("publishDecision", () => {
  it("refuses to blank a healthy board with a collapsed run", () => {
    expect(publishDecision(10, 56).saved).toBe(false);
    expect(publishDecision(10, 56).reason).toMatch(/se conserva la anterior/);
  });

  it("publishes a run that lost a source but kept most of the board", () => {
    expect(publishDecision(48, 56).saved).toBe(true);
  });

  it("publishes freely when there is nothing stored yet", () => {
    expect(publishDecision(3, 0).saved).toBe(true);
  });

  it("never publishes an empty board", () => {
    expect(publishDecision(0, 0).saved).toBe(false);
  });
});

describe("history points", () => {
  it("dates a quote by the calendar day of the country that published it", () => {
    // 23:30 UTC is still the 21st in São Paulo and in Montevideo (both UTC-3).
    const br = q("BR", "ptax", "official", "BRL", { avg: 5.16 }, "br_bcb", "2026-08-21T23:30:00.000Z");
    expect(quoteDay(br)).toBe("2026-08-21");
    // 02:00 UTC on the 22nd is still the night of the 21st there.
    const uy = q("UY", "casas", "retail", "UYU", { avg: 40.3 }, "uy_local", "2026-08-22T02:00:00.000Z");
    expect(quoteDay(uy)).toBe("2026-08-21");
  });

  it("turns a snapshot into one point per market", () => {
    const { snapshot } = buildSnapshot([run("br_bcb", [q("BR", "ptax", "official", "BRL", { buy: 5.1619, sell: 5.1625 }, "br_bcb")])], []);
    const points = snapshotHistoryPoints(snapshot);
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ key: "BR:ptax:USDBRL", country: "BR", market: "ptax", base: "USD", quote: "BRL" });
    expect(points[0].day).toBe("2026-08-21");
  });
});

describe("sgsWindows", () => {
  it("splits a long range into windows the SGS API will accept", () => {
    // A single 1995-to-today request comes back EMPTY, not short: the API
    // refuses anything wider than ten years, and the refusal looks exactly like
    // a series that does not exist.
    const windows = sgsWindows("1995-01-01", "2026-08-21");
    expect(windows.length).toBeGreaterThan(3);
    expect(windows[0][0]).toBe("1995-01-01");
    expect(windows[windows.length - 1][1]).toBe("2026-08-21");
    for (const [start, end] of windows) {
      expect(Number(end.slice(0, 4)) - Number(start.slice(0, 4))).toBeLessThanOrEqual(10);
    }
  });

  it("never fetches the same day twice", () => {
    const windows = sgsWindows("1995-01-01", "2026-08-21");
    for (let index = 1; index < windows.length; index++) {
      expect(windows[index][0] > windows[index - 1][1]).toBe(true);
    }
  });

  it("keeps a short range as a single window", () => {
    expect(sgsWindows("2026-01-01", "2026-08-21")).toEqual([["2026-01-01", "2026-08-21"]]);
  });
});

describe("parseArHistory", () => {
  it("keeps the publisher's own daily closes and computes the mid", () => {
    const points = parseArHistory("blue", [
      { casa: "blue", compra: 1530, venta: 1550, fecha: "2026-08-20" },
      { casa: "blue", compra: 4, venta: 4, fecha: "2011-01-03" },
    ]);
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ key: "AR:blue:USDARS", day: "2026-08-20", avg: 1540 });
  });

  it("drops rows without a usable date or price", () => {
    expect(
      parseArHistory("blue", [
        { casa: "blue", compra: 0, venta: 0, fecha: "2026-08-20" },
        { casa: "blue", compra: 1, venta: 2, fecha: "ayer" },
        { casa: "blue", fecha: "2026-08-19" },
      ])
    ).toEqual([]);
  });

  it("returns nothing for a dead endpoint", () => {
    expect(parseArHistory("blue", null)).toEqual([]);
  });
});

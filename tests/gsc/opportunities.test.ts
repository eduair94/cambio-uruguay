// The opportunity ranker decides where content effort goes, so the thresholds are the product.
// These tests pin the two judgements that cost the most if they silently drift:
//   1. the zero-click pool is excluded EVERYWHERE (curve, striking distance), because a list topped
//      by "dolar hoy — 30.000 impresiones, 4 clics" sends someone to fight an answer box;
//   2. the CTR curve is derived from this site's own data and never rises with position.
import { describe, expect, it } from "vitest";
import {
  bucketOf,
  buildAlerts,
  cannibalisation,
  ctrBelowCurve,
  ctrCurve,
  curveAt,
  deadWeight,
  isZeroClick,
  movers,
  newQueries,
  pageTypes,
  rankOpportunities,
  strikingDistance,
  zeroClickPool,
} from "../../classes/gsc/opportunities";
import { isQuotaError } from "../../classes/gsc/client";
import type { GscKeyed, GscPageQuery } from "../../classes/gsc/types";

const q = (key: string, clicks: number, impressions: number, position: number): GscKeyed => ({
  key,
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

describe("bucketOf", () => {
  it("folds a fan-out family and keeps a standalone page whole", () => {
    expect(bucketOf("https://cambio-uruguay.com/convertir/300-dolares-a-pesos-uruguayos")).toBe("/convertir/*");
    expect(bucketOf("https://cambio-uruguay.com/historico/brou/usd")).toBe("/historico/*");
    expect(bucketOf("https://cambio-uruguay.com/tarjetas-de-credito-uruguay")).toBe("/tarjetas-de-credito-uruguay");
    expect(bucketOf("https://cambio-uruguay.com/")).toBe("/");
  });

  it("keeps locale prefixes separate — /en ranks nothing like /es", () => {
    expect(bucketOf("https://cambio-uruguay.com/en/convertir/20-dolares-a-pesos-uruguayos")).toBe("/en/convertir/*");
    expect(bucketOf("https://cambio-uruguay.com/pt")).toBe("/pt");
  });

  it("ignores the query string so one page is one row", () => {
    expect(bucketOf("https://cambio-uruguay.com/guias/algo?utm_source=x")).toBe("/guias/*");
  });
});

describe("zero-click pool", () => {
  it("flags the high-volume no-click queries and nothing else", () => {
    // Shaped after the real August 2026 reading: "dolar hoy" 29.997 impressions → 4 clicks.
    expect(isZeroClick(q("dolar hoy", 4, 29997, 10.1))).toBe(true);
    // Same terrible CTR but tiny volume: not enough evidence, stays out.
    expect(isZeroClick(q("cosa rara", 0, 40, 9))).toBe(false);
    // Plenty of volume and a real CTR: a live query, not a dead pool.
    expect(isZeroClick(q("cambio gales", 14, 2069, 5.7))).toBe(false);
  });

  it("reports the pool's share of impressions", () => {
    const rows = [q("dolar hoy", 4, 30000, 10), q("guia", 40, 1000, 5)];
    const pool = zeroClickPool(rows);
    expect(pool.queries).toBe(1);
    expect(pool.impressions).toBe(30000);
    expect(pool.shareOfImpressions).toBeCloseTo(30000 / 31000, 5);
  });
});

describe("ctrCurve", () => {
  const rows: GscKeyed[] = [
    // Position 3, click-available, big sample.
    q("a", 300, 10000, 3),
    // Position 8, worse CTR, big sample.
    q("b", 100, 10000, 8),
    // A zero-click monster at position 3 that must NOT drag the curve down.
    q("dolar hoy", 5, 100000, 3),
  ];

  it("excludes the zero-click pool from the curve", () => {
    const curve = ctrCurve(rows);
    const p3 = curve.find(c => c.position === 3)!;
    expect(p3.derived).toBe(true);
    // 300/10000 = 3 %. Including the zero-click row would give 305/110000 ≈ 0,28 %.
    expect(p3.ctr).toBeCloseTo(0.03, 4);
  });

  it("never lets a later position beat an earlier one", () => {
    const curve = ctrCurve([q("a", 50, 10000, 2), q("b", 900, 10000, 9)]);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].ctr).toBeLessThanOrEqual(curve[i - 1].ctr + 1e-12);
    }
  });

  it("marks interpolated points as underived", () => {
    const curve = ctrCurve(rows);
    expect(curve.find(c => c.position === 5)!.derived).toBe(false);
    // Interpolated between the 3 % at position 3 and the 1 % at position 8.
    expect(curve.find(c => c.position === 5)!.ctr).toBeGreaterThan(0.01);
    expect(curve.find(c => c.position === 5)!.ctr).toBeLessThan(0.03);
  });

  it("curveAt interpolates between integer positions", () => {
    const curve = ctrCurve(rows);
    const at3 = curveAt(curve, 3);
    const at4 = curveAt(curve, 4);
    const at35 = curveAt(curve, 3.5);
    expect(at35).toBeLessThanOrEqual(at3);
    expect(at35).toBeGreaterThanOrEqual(at4);
  });
});

describe("strikingDistance", () => {
  const curve = ctrCurve([q("ref", 300, 10000, 3), q("ref2", 100, 10000, 8)]);

  it("never proposes work on a query the SERP answers itself", () => {
    const out = strikingDistance([q("dolar hoy", 4, 29997, 10.1)], curve);
    expect(out).toEqual([]);
  });

  it("rejects a query that already ranks high and still gets no clicks", () => {
    // Position 4,06 with 2.845 impressions and 0 clicks — the real
    // /convertir/300-dolares-a-pesos-uruguayos case. Ranking is not the problem, so there is no
    // striking-distance work to do.
    const out = strikingDistance([q("300 dolares a pesos uruguayos", 0, 2845, 4.06)], curve);
    expect(out).toEqual([]);
  });

  it("keeps a real opportunity and sizes it against the site's own curve", () => {
    const out = strikingDistance([q("cambio gales", 14, 2069, 5.7)], curve);
    expect(out).toHaveLength(1);
    // 2069 impressions × 3 % at position 3, minus the 14 clicks it already gets.
    expect(out[0].potentialClicks).toBe(Math.round(2069 * 0.03 - 14));
    expect(out[0].kind).toBe("striking-distance");
  });

  it("ignores queries already at or above the target position", () => {
    expect(strikingDistance([q("indumex cotizaciones", 6, 500, 2.2)], curve)).toEqual([]);
  });
});

describe("ctrBelowCurve", () => {
  it("flags a page earning far less than its position normally pays here", () => {
    const curve = ctrCurve([q("ref", 300, 10000, 3), q("ref2", 100, 10000, 8)]);
    // 0,6 % where the curve pays 3 %: below the line, but with enough clicks to prove the query is
    // click-available in the first place. (A fixture of 2 clicks in 5.000 would be zero-click
    // shaped, and the detector is right to skip that one.)
    const out = ctrBelowCurve([q("https://cambio-uruguay.com/x", 30, 5000, 3)], curve);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("ctr-below-curve");
    expect(out[0].potentialClicks).toBeGreaterThan(100);
  });

  it("does not call a SERP-answered page a snippet problem", () => {
    // /convertir/300-dolares-a-pesos-uruguayos: 7.824 impresiones, 0 clics, posición 4,4. It has
    // the zero-click shape, so rewriting its title wins nothing — and the same URL is listed as
    // peso muerto, which is where the contradiction showed up in the first dry run.
    const curve = ctrCurve([q("ref", 300, 10000, 3), q("ref2", 100, 10000, 8)]);
    const url = "https://cambio-uruguay.com/convertir/300-dolares-a-pesos-uruguayos";
    expect(ctrBelowCurve([q(url, 0, 7824, 4.4)], curve)).toEqual([]);
    expect(deadWeight([q(url, 0, 7824, 4.4)])).toHaveLength(1);
  });

  it("leaves a page performing at its curve alone", () => {
    const curve = ctrCurve([q("ref", 300, 10000, 3), q("ref2", 100, 10000, 8)]);
    expect(ctrBelowCurve([q("https://cambio-uruguay.com/y", 150, 5000, 3)], curve)).toEqual([]);
  });
});

describe("cannibalisation", () => {
  const pair = (page: string, query: string, clicks: number, impressions: number, position: number): GscPageQuery => ({
    page,
    query,
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position,
  });

  it("reports a query split across several of our URLs", () => {
    // The real one: /historico/brou/usd/ebrou outranking /historico/brou/usd for "cotizacion brou".
    const out = cannibalisation([
      pair("https://cambio-uruguay.com/historico/brou/usd/ebrou", "cotizacion brou", 0, 5186, 8.52),
      pair("https://cambio-uruguay.com/historico/brou", "cotizacion brou", 0, 762, 8.2),
      pair("https://cambio-uruguay.com/historico/brou/usd", "cotizacion brou", 0, 707, 8.6),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].urls).toHaveLength(3);
    expect(out[0].impressions).toBe(6655);
  });

  it("does not count a rounding-error URL as a competitor", () => {
    const out = cannibalisation([
      pair("https://cambio-uruguay.com/a", "x", 10, 5000, 3),
      pair("https://cambio-uruguay.com/b", "x", 0, 3, 40),
    ]);
    expect(out).toEqual([]);
  });
});

describe("movers and new queries", () => {
  const current = [q("sube", 20, 500, 4), q("baja", 2, 500, 9), q("nueva", 1, 300, 12)];
  const previous = [q("sube", 5, 400, 6), q("baja", 15, 480, 5)];

  it("separates risers from fallers", () => {
    const { rising, falling } = movers(current, previous);
    expect(rising.map(r => r.subject)).toContain("sube");
    expect(falling.map(r => r.subject)).toContain("baja");
  });

  it("only calls a query new when it has real volume", () => {
    expect(newQueries(current, previous).map(r => r.subject)).toEqual(["nueva"]);
    expect(newQueries([q("chica", 0, 20, 30)], previous)).toEqual([]);
  });

  it("does not sell a head term back as new demand", () => {
    // "precio del dólar" arrived as "new" only because the accent makes it a different string; it
    // is the same answer-box query, and there is no page to write for it.
    expect(newQueries([q("precio del dólar", 0, 738, 9.1)], previous)).toEqual([]);
  });
});

describe("deadWeight", () => {
  it("names the pages Google shows and nobody clicks", () => {
    const out = deadWeight([
      q("https://cambio-uruguay.com/convertir/5-dolares-a-pesos-uruguayos", 0, 4572, 9.53),
      q("https://cambio-uruguay.com/guias/algo", 40, 1200, 6),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].subject).toContain("/convertir/5-dolares");
  });
});

describe("buildAlerts", () => {
  const series = (clicks: number[], impressions = 20000) =>
    clicks.map((c, i) => ({
      day: `2026-08-${String(i + 1).padStart(2, "0")}`,
      clicks: c,
      impressions,
      position: 8,
    }));

  it("stays quiet inside normal weekly noise", () => {
    expect(buildAlerts(series([10, 10, 10, 10, 10, 10, 10, 9, 10, 9, 10, 10, 9, 10]))).toEqual([]);
  });

  it("escalates a collapse and merely warns about a dip", () => {
    const warn = buildAlerts(series([20, 20, 20, 20, 20, 20, 20, 14, 14, 14, 14, 14, 14, 14]));
    expect(warn.map(a => a.code)).toContain("clicks-drop");
    const critical = buildAlerts(series([20, 20, 20, 20, 20, 20, 20, 5, 5, 5, 5, 5, 5, 5]));
    expect(critical.find(a => a.code === "clicks-collapse")?.level).toBe("critical");
  });

  it("says nothing without two full weeks to compare", () => {
    expect(buildAlerts(series([10, 10, 10]))).toEqual([]);
  });
});

describe("pageTypes", () => {
  it("aggregates URLs into families with impression-weighted position", () => {
    const rows = pageTypes([
      q("https://cambio-uruguay.com/guias/a", 100, 1000, 4),
      q("https://cambio-uruguay.com/guias/b", 100, 3000, 8),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].bucket).toBe("/guias/*");
    expect(rows[0].urls).toBe(2);
    expect(rows[0].ctr).toBeCloseTo(200 / 4000, 6);
    expect(rows[0].position).toBeCloseTo((4 * 1000 + 8 * 3000) / 4000, 6);
  });
});

describe("rankOpportunities", () => {
  it("interleaves the kinds so the reader sees more than one problem", () => {
    const a = [1, 2, 3].map(n => ({ kind: "rising" as const, subject: `a${n}`, impressions: 0, clicks: 0, position: 0, potentialClicks: 0, note: "" }));
    const b = [1, 2].map(n => ({ kind: "falling" as const, subject: `b${n}`, impressions: 0, clicks: 0, position: 0, potentialClicks: 0, note: "" }));
    expect(rankOpportunities([a, b]).map(o => o.subject)).toEqual(["a1", "b1", "a2", "b2", "a3"]);
  });
});

// The retry classifier. Search Console answers 403 for a quota burst AND for a service account with
// no access; only the first is worth retrying.
describe("isQuotaError", () => {
  const err = (status: number, reason?: string, message?: string) => ({
    response: { status, data: { error: { message, errors: reason ? [{ reason }] : undefined } } },
  });

  it("retries a QPS burst — the one that stopped the first production backfill", () => {
    expect(
      isQuotaError(err(403, "quotaExceeded", "Search Analytics QPS quota exceeded. Learn about usage limits"))
    ).toBe(true);
  });

  it("retries a 429 and a rate-limit reason", () => {
    expect(isQuotaError(err(429))).toBe(true);
    expect(isQuotaError(err(403, "rateLimitExceeded"))).toBe(true);
  });

  it("does NOT retry a permission 403 — that is a configuration error, not a burst", () => {
    expect(isQuotaError(err(403, "forbidden", "User does not have sufficient permission for site"))).toBe(false);
  });

  it("does not retry anything else", () => {
    expect(isQuotaError(err(400, undefined, "Invalid dimension"))).toBe(false);
    expect(isQuotaError(err(500))).toBe(false);
    expect(isQuotaError(new Error("socket hang up"))).toBe(false);
  });
});

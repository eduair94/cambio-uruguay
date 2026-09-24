import { describe, expect, it } from "vitest";
import { housingCohorts } from "../../classes/marketseries/cohorts";
import { marketLogWriteOperation, seriesOperation, MARKET_HIST_MAX_DAYS, MARKET_SERIES_MAX_POINTS } from "../../classes/marketseries/store";
import type { MarketPriceLog, MarketSeriesPoint } from "../../classes/marketseries/types";
import { observation } from "./fixtures";

const cohort = housingCohorts(observation())[0]!;
const point: MarketSeriesPoint = { d: "2026-09-18", n: 8, p25: 1, med: 2, p75: 3, m2: null, w7: null, w30: null, w90: null };

describe("seriesOperation: histogram history", () => {
  const labels = { department: null, neighborhood: null, brand: null, model: null };
  const hist = { n: 40, log: false, edges: [0, 10, 20], counts: [20, 20], below: 0, above: 0 };
  const setOf = (op: ReturnType<typeof seriesOperation>) => (op.updateOne.update as Array<{ $set: Record<string, any> }>)[0]!.$set;

  it("keeps the last 100 daily shapes, replacing today's", () => {
    const set = setOf(seriesOperation({ cohort, labels, label: "x", point, hist }, "2026-09-18"));
    const [concat, max] = set.hists.$slice;
    expect(max).toBe(-MARKET_HIST_MAX_DAYS);
    expect(MARKET_HIST_MAX_DAYS).toBe(100);
    expect(concat.$concatArrays[0].$filter.cond).toEqual({ $ne: ["$$this.d", { $literal: "2026-09-18" }] });
    expect(concat.$concatArrays[1]).toEqual([{ $literal: { d: "2026-09-18", ...hist } }]);
  });

  it("a day without a shape still drops a stale one from an earlier run of the same day", () => {
    const set = setOf(seriesOperation({ cohort, labels, label: "x", point, hist: null }, "2026-09-18"));
    expect(set.hists.$slice[0].$concatArrays[1]).toEqual([]);
  });
});

describe("seriesOperation", () => {
  const labels = { department: "$ Montevideo", neighborhood: null, brand: null, model: null };
  const op = seriesOperation({ cohort, labels, label: "$ raro", point, hist: null }, "2026-09-18");
  const set = (op.updateOne.update as Array<{ $set: Record<string, any> }>)[0]!.$set;

  it("upserts by key with an update PIPELINE", () => {
    expect(op.updateOne.filter).toEqual({ key: cohort.key });
    expect(op.updateOne.upsert).toBe(true);
    expect(Array.isArray(op.updateOne.update)).toBe(true);
  });

  it("wraps every value in $literal: a label starting with '$' would be read as a field path", () => {
    expect(set.label).toEqual({ $literal: "$ raro" });
    expect(set.labels).toEqual({ $literal: labels });
    expect(set.latest).toEqual({ $literal: point });
    expect(set.key).toEqual({ $literal: cohort.key });
    expect(set.dims).toEqual({ $literal: cohort.dims });
  });

  it("replaces today's point instead of duplicating it, and keeps the newest 1100", () => {
    const [concat, max] = set.points.$slice;
    expect(max).toBe(-MARKET_SERIES_MAX_POINTS);
    expect(concat.$concatArrays[0].$filter.cond).toEqual({ $ne: ["$$this.d", { $literal: "2026-09-18" }] });
    expect(concat.$concatArrays[0].$filter.input).toEqual({ $ifNull: ["$points", []] });
    expect(concat.$concatArrays[1]).toEqual([{ $literal: point }]);
  });
});

describe("marketLogWriteOperation", () => {
  // Desde el 2026-09-22 la cosecha de alquileres escribe la misma colección cada hora, con un
  // pipeline atómico. Este job lee todos los logs, calcula y recién después escribe: si en el medio
  // la cosecha agregó un punto, un reemplazo ciego lo borraba. Ahora el reemplazo sólo aplica si el
  // documento sigue como estaba al leerlo; si no, la cosecha ya registró algo más nuevo.
  const before: MarketPriceLog = {
    key: "alquiler:infocasas:1",
    vertical: "alquiler",
    advertId: "infocasas:1",
    firstSeen: "2026-09-18",
    lastSeen: "2026-09-20",
    points: [
      { d: "2026-09-18", p: 30000, c: "UYU" },
      { d: "2026-09-20", p: 29000, c: "UYU" },
    ],
  };
  const after: MarketPriceLog = { ...before, lastSeen: "2026-09-24", points: [...before.points, { d: "2026-09-24", p: 28000, c: "UYU" }] };

  it("replaces a known log only while it is still as it was read", () => {
    expect(marketLogWriteOperation(after, before)).toEqual({
      replaceOne: {
        filter: {
          key: "alquiler:infocasas:1",
          lastSeen: "2026-09-20",
          points: { $size: 2 },
          "points.1.d": "2026-09-20",
          "points.1.p": 29000,
          "points.1.c": "UYU",
        },
        replacement: after,
      },
    });
  });
  it("a new log is only inserted if nobody created it in the meantime", () => {
    expect(marketLogWriteOperation(after, undefined)).toEqual({
      updateOne: { filter: { key: "alquiler:infocasas:1" }, update: { $setOnInsert: after }, upsert: true },
    });
  });
});

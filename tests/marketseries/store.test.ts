import { describe, expect, it } from "vitest";
import { housingCohorts } from "../../classes/marketseries/cohorts";
import { seriesOperation, MARKET_SERIES_MAX_POINTS } from "../../classes/marketseries/store";
import type { MarketSeriesPoint } from "../../classes/marketseries/types";
import { observation } from "./fixtures";

const cohort = housingCohorts(observation())[0]!;
const point: MarketSeriesPoint = { d: "2026-09-18", n: 8, p25: 1, med: 2, p75: 3, m2: null, w7: null, w30: null, w90: null };

describe("seriesOperation", () => {
  const labels = { department: "$ Montevideo", neighborhood: null, brand: null, model: null };
  const op = seriesOperation({ cohort, labels, label: "$ raro", point }, "2026-09-18");
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

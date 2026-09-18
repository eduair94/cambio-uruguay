import { describe, expect, it } from "vitest";
import { levelStats, medianStats, pairStats, quantile } from "../../classes/marketseries/stats";

describe("quantile", () => {
  it("interpolates linearly between (n-1)p positions", () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(quantile([10], 0.5)).toBe(10);
  });
});

describe("levelStats", () => {
  it("keeps the count but publishes nothing under 8", () => {
    expect(levelStats([1, 2, 3, 4, 5, 6, 7])).toEqual({ n: 7, p25: null, med: null, p75: null });
  });
  it("p25 / median / p75 from 8 on, order-independent", () => {
    expect(levelStats([8, 1, 7, 2, 6, 3, 5, 4])).toEqual({ n: 8, p25: 2.75, med: 4.5, p75: 6.25 });
  });
});

describe("medianStats", () => {
  it("same minimum as the level", () => {
    expect(medianStats([1, 2, 3])).toEqual({ n: 3, med: null });
    expect(medianStats([1, 2, 3, 4, 5, 6, 7, 8])).toEqual({ n: 8, med: 4.5 });
  });
});

describe("pairStats", () => {
  it("nobody repriced: zero change, all 'same'", () => {
    expect(pairStats(Array(8).fill(1))).toEqual({ n: 8, chg: 0, down: 0, up: 0, same: 8, outliers: 0 });
  });
  it("everyone down 10 %: -10 %", () => {
    expect(pairStats(Array(8).fill(0.9))).toMatchObject({ n: 8, chg: -0.1, down: 8 });
  });
  it("geometric mean: -20 % and +25 % cancel out", () => {
    expect(pairStats([0.8, 1.25, 0.8, 1.25, 0.8, 1.25, 0.8, 1.25]).chg).toBe(0);
  });
  it("a pair outside [0.5, 2] is a typo, counted apart", () => {
    expect(pairStats([...Array(8).fill(1), 3, 0.4])).toMatchObject({ n: 8, outliers: 2, chg: 0 });
  });
  it("under 8 pairs the change is withheld but the counts stay", () => {
    expect(pairStats([0.9, 0.9])).toEqual({ n: 2, chg: null, down: 2, up: 0, same: 0, outliers: 0 });
  });
  it("a rounding is not a move: +/-0.5 % threshold", () => {
    expect(pairStats([1.004, 0.996, 1.006, 0.994])).toMatchObject({ same: 2, up: 1, down: 1 });
  });
});

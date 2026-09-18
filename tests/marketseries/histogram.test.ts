import { describe, expect, it } from "vitest";
import { buildHistogram, MARKET_HISTOGRAM_MINIMUM } from "../../classes/marketseries/histogram";

const range = (from: number, count: number, step = 1): number[] => Array.from({ length: count }, (_, i) => from + i * step);

/** Every price counted exactly once: in a bin, below the first edge, or above the last. */
function recount(prices: number[], hist: NonNullable<ReturnType<typeof buildHistogram>>): number[] {
  const counts = hist.counts.map(() => 0);
  for (const price of prices) {
    if (price < hist.edges[0]! || price > hist.edges[hist.edges.length - 1]!) continue;
    let bin = hist.edges.findIndex((edge, i) => i > 0 && price < edge) - 1;
    if (bin < 0) bin = hist.counts.length - 1;
    counts[bin]!++;
  }
  return counts;
}

describe("buildHistogram", () => {
  it("draws nothing under 30 observations: with fewer the shape is noise", () => {
    expect(MARKET_HISTOGRAM_MINIMUM).toBe(30);
    expect(buildHistogram(range(100, 29))).toBeNull();
    expect(buildHistogram(range(100, 30))).not.toBeNull();
  });

  it("nothing to draw when everybody asks the same", () => {
    expect(buildHistogram(Array(40).fill(25000))).toBeNull();
  });

  it("a compact market gets a linear axis with round steps", () => {
    const prices = range(20000, 100, 100);
    const hist = buildHistogram(prices)!;
    expect(hist.log).toBe(false);
    const step = hist.edges[1]! - hist.edges[0]!;
    expect(hist.edges.every((edge, i) => i === 0 || Math.abs(edge - hist.edges[i - 1]! - step) < 1e-6)).toBe(true);
    expect([1, 2, 2.5, 5].some(base => Math.abs(step / 10 ** Math.floor(Math.log10(step)) - base) < 1e-9)).toBe(true);
    expect(hist.counts.length).toBeLessThanOrEqual(21);
  });

  it("a skewed market (p99 over 4 times p1) gets log-spaced bins", () => {
    const prices = range(0, 200).map(i => Math.round(50000 * 1.02 ** i));
    const hist = buildHistogram(prices)!;
    expect(hist.log).toBe(true);
    const ratios = hist.edges.slice(1).map((edge, i) => edge / hist.edges[i]!);
    expect(Math.max(...ratios) / Math.min(...ratios)).toBeLessThan(1.02);
  });

  it("counts every price once: bins, plus what falls outside p1..p99", () => {
    const prices = [...range(100, 199), 1_000_000];
    const hist = buildHistogram(prices)!;
    expect(hist.n).toBe(200);
    expect(hist.above).toBeGreaterThanOrEqual(1);
    expect(hist.edges[hist.edges.length - 1]!).toBeLessThan(1_000_000);
    expect(hist.counts).toEqual(recount(prices, hist));
    expect(hist.counts.reduce((a, b) => a + b, 0) + hist.below + hist.above).toBe(200);
  });

  it("edges strictly increase even after rounding", () => {
    const prices = range(0, 60).map(i => 99_000 + i * 70);
    const hist = buildHistogram(prices)!;
    expect(hist.edges.every((edge, i) => i === 0 || edge > hist.edges[i - 1]!)).toBe(true);
    expect(hist.counts).toHaveLength(hist.edges.length - 1);
  });
});

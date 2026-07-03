import moment from "moment-timezone";
import { describe, expect, it } from "vitest";
import { buildUpsertOps, chunkDateRange, detectGaps } from "../classes/bcu_backfill";
import type { BcuQuote } from "../classes/bcu_soap";

const mvd = (ymd: string) => moment.tz(ymd, "America/Montevideo").startOf("day").toDate();

describe("detectGaps", () => {
  it("finds the large missing span between two dense clusters", () => {
    const existing = [mvd("2026-03-10"), mvd("2026-03-11"), mvd("2026-03-12"), mvd("2026-06-16"), mvd("2026-06-17")];
    const gaps = detectGaps(existing, mvd("2026-06-17"), 4);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].from.getTime()).toBe(mvd("2026-03-13").getTime());
    expect(gaps[0].to.getTime()).toBe(mvd("2026-06-15").getTime());
  });

  it("flags a trailing gap between the last data point and today", () => {
    const existing = [mvd("2026-06-10"), mvd("2026-06-11")];
    const gaps = detectGaps(existing, mvd("2026-06-23"), 4);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].from.getTime()).toBe(mvd("2026-06-12").getTime());
    expect(gaps[0].to.getTime()).toBe(mvd("2026-06-23").getTime());
  });

  it("does not flag normal weekend-sized gaps below the threshold", () => {
    // Fri 12th → Mon 15th is a 3-day gap; with minGapDays=4 it is not a hole.
    const existing = [mvd("2026-06-11"), mvd("2026-06-12"), mvd("2026-06-15"), mvd("2026-06-16")];
    const gaps = detectGaps(existing, mvd("2026-06-16"), 4);
    expect(gaps).toEqual([]);
  });

  it("returns [] for empty input", () => {
    expect(detectGaps([], mvd("2026-06-23"), 4)).toEqual([]);
  });
});

describe("chunkDateRange", () => {
  it("returns the range unchanged when it fits within maxDays", () => {
    const chunks = chunkDateRange(mvd("2026-03-17"), mvd("2026-04-03"), 30);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].from.getTime()).toBe(mvd("2026-03-17").getTime());
    expect(chunks[0].to.getTime()).toBe(mvd("2026-04-03").getTime());
  });

  it("splits a long range into contiguous, non-overlapping windows of at most maxDays", () => {
    const from = mvd("2026-03-19");
    const to = mvd("2026-06-15"); // 88 days span
    const chunks = chunkDateRange(from, to, 30);

    // Covers the full range, in order, starting and ending exactly on the bounds.
    expect(chunks[0].from.getTime()).toBe(from.getTime());
    expect(chunks[chunks.length - 1].to.getTime()).toBe(to.getTime());

    for (const c of chunks) {
      const span = (c.to.getTime() - c.from.getTime()) / 86_400_000;
      expect(span).toBeLessThanOrEqual(30);
      expect(c.to.getTime()).toBeGreaterThanOrEqual(c.from.getTime());
    }
    // No gap and no overlap between consecutive windows: next.from === prev.to + 1 day.
    for (let i = 1; i < chunks.length; i++) {
      const prevToPlus1 = chunks[i - 1].to.getTime() + 86_400_000;
      expect(chunks[i].from.getTime()).toBe(prevToPlus1);
    }
  });
});

describe("buildUpsertOps", () => {
  const quotes: BcuQuote[] = [
    { date: mvd("2026-04-01"), code: "USD", type: "BILLETE", name: "DLS. USA BILLETE", buy: 41.9, sell: 41.9 },
    { date: mvd("2026-04-01"), code: "UI", type: "", name: "UNIDAD INDEXADA", buy: 6.4, sell: 6.4 },
  ];

  it("builds an idempotent upsert op per quote keyed by origin/date/code/type", () => {
    const ops = buildUpsertOps(quotes);
    expect(ops).toEqual([
      { filter: { origin: "bcu", date: mvd("2026-04-01"), code: "USD", type: "BILLETE" }, update: { name: "DLS. USA BILLETE", buy: 41.9, sell: 41.9 } },
      { filter: { origin: "bcu", date: mvd("2026-04-01"), code: "UI", type: "" }, update: { name: "UNIDAD INDEXADA", buy: 6.4, sell: 6.4 } },
    ]);
  });

  it("collapses duplicate keys, keeping the last value", () => {
    const dup: BcuQuote[] = [
      { date: mvd("2026-04-01"), code: "USD", type: "BILLETE", name: "DLS. USA BILLETE", buy: 1, sell: 1 },
      { date: mvd("2026-04-01"), code: "USD", type: "BILLETE", name: "DLS. USA BILLETE", buy: 2, sell: 2 },
    ];
    const ops = buildUpsertOps(dup);
    expect(ops).toHaveLength(1);
    expect(ops[0].update).toEqual({ name: "DLS. USA BILLETE", buy: 2, sell: 2 });
  });

  it("honours a custom origin", () => {
    const ops = buildUpsertOps([quotes[0]], "BCU");
    expect(ops[0].filter.origin).toBe("bcu");
  });
});

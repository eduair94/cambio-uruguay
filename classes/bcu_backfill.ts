import moment from "moment-timezone";
import type { BcuQuote } from "./bcu_soap";

/**
 * Pure planning helpers for the BCU history backfill. No DB or network here so they
 * can be unit-tested directly; the runner (`bcu_backfill.ts`) wires these to Mongo
 * and the SOAP client.
 */

export interface DateGap {
  from: Date;
  to: Date;
}

export interface UpsertOp {
  filter: { origin: string; date: Date; code: string; type: string };
  update: { name: string; buy: number; sell: number };
}

const startOfDay = (d: Date): Date => moment.tz(d, "America/Montevideo").startOf("day").toDate();
const addDays = (d: Date, n: number): Date => moment.tz(d, "America/Montevideo").startOf("day").add(n, "day").toDate();
const dayDiff = (a: Date, b: Date): number =>
  moment.tz(b, "America/Montevideo").startOf("day").diff(moment.tz(a, "America/Montevideo").startOf("day"), "days");

/**
 * Find missing spans in a series of existing data dates. A gap is a jump larger than
 * `minGapDays` between consecutive dates (so normal weekend/holiday gaps are ignored),
 * plus a trailing gap from the last date up to `today`. Each span is inclusive and
 * already trimmed to the missing days.
 */
export function detectGaps(existingDates: Date[], today: Date, minGapDays = 4): DateGap[] {
  if (existingDates.length === 0) return [];
  const sorted = [...new Set(existingDates.map((d) => startOfDay(d).getTime()))]
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  const gaps: DateGap[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (dayDiff(sorted[i - 1], sorted[i]) > minGapDays) {
      gaps.push({ from: addDays(sorted[i - 1], 1), to: addDays(sorted[i], -1) });
    }
  }

  const last = sorted[sorted.length - 1];
  if (dayDiff(last, today) > minGapDays) {
    gaps.push({ from: addDays(last, 1), to: startOfDay(today) });
  }
  return gaps;
}

/**
 * Split [from, to] (inclusive) into contiguous, non-overlapping windows of at most
 * `maxDays` span each. The BCU SOAP service rejects ranges beyond a fixed limit
 * ("Rango de fechas excede lo permitido"), so long backfills must be chunked.
 */
export function chunkDateRange(from: Date, to: Date, maxDays = 30): DateGap[] {
  const chunks: DateGap[] = [];
  let start = startOfDay(from);
  const end = startOfDay(to);
  while (start.getTime() <= end.getTime()) {
    const candidate = addDays(start, maxDays);
    const chunkTo = candidate.getTime() <= end.getTime() ? candidate : end;
    chunks.push({ from: start, to: chunkTo });
    start = addDays(chunkTo, 1);
  }
  return chunks;
}

/**
 * Turn normalized quotes into idempotent bulk-upsert operations keyed by
 * {origin, date, code, type}. Duplicate keys collapse to the last value.
 */
export function buildUpsertOps(quotes: BcuQuote[], origin = "bcu"): UpsertOp[] {
  const o = origin.toLowerCase();
  const byKey = new Map<string, UpsertOp>();
  for (const q of quotes) {
    const key = `${o}|${q.date.getTime()}|${q.code}|${q.type}`;
    byKey.set(key, {
      filter: { origin: o, date: q.date, code: q.code, type: q.type },
      update: { name: q.name, buy: q.buy, sell: q.sell },
    });
  }
  return [...byKey.values()];
}

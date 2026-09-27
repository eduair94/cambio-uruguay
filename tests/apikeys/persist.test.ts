import { describe, expect, it, vi } from "vitest";
import { persistUsage } from "../../classes/apikeys/persist";
import type { UsageDaysRepo, UsageRow } from "../../classes/apikeys/usage";
import { FakeRedis } from "./fakes";

function repo() {
  const table = new Map<string, UsageRow>();
  const r: UsageDaysRepo & { table: Map<string, UsageRow> } = {
    table,
    async upsertDay(day, rows) {
      for (const row of rows) table.set(`${day}|${row.client}|${row.route}`, row);
      return rows.length;
    },
    async readRange() {
      return [...table.values()];
    },
  };
  return r;
}

describe("copia del medidor a Mongo", () => {
  it("copia ayer y hoy, y correrla dos veces no duplica", async () => {
    const redis = new FakeRedis();
    await redis.hincrby("usage:2026-09-26", "ua:ArboitePanel/1.0|/exchange/la_favorita", 290);
    await redis.hincrby("usage:2026-09-27", "key:000000000000000000000001|/regional", 7);
    const target = repo();
    const touchLastUsed = vi.fn(async () => undefined);
    const now = new Date("2026-09-27T15:07:00Z");

    const first = await persistUsage({ redis, repo: target, store: { touchLastUsed }, now });
    const second = await persistUsage({ redis, repo: target, store: { touchLastUsed }, now });

    expect(first).toEqual({ days: ["2026-09-26", "2026-09-27"], rows: 2, keysTouched: 1 });
    expect(second.rows).toBe(2);
    expect(target.table.size).toBe(2);
    expect(target.table.get("2026-09-26|ua:ArboitePanel/1.0|/exchange/la_favorita")?.count).toBe(290);
    expect(touchLastUsed).toHaveBeenCalledWith(["000000000000000000000001"], now);
  });
});

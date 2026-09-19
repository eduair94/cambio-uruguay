import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runWaterHarvest } from "../../classes/utilities/water/run";
import type { WaterNotice } from "../../classes/utilities/water/parse";

const page = readFileSync(join(__dirname, "fixtures", "ose_list.html"), "utf8");
const empty = "<html><div class=\"view-content\"></div></html>";
function memory() {
  const stored: WaterNotice[] = [];
  return { stored, store: { async upsert(notices: WaterNotice[]) { stored.push(...notices); } } };
}

describe("runWaterHarvest", () => {
  it("reads the newest pages and stops at the first empty one", async () => {
    const db = memory();
    const seen: number[] = [];
    const result = await runWaterHarvest({ store: db.store, pages: 5, delayMs: 0,
      fetchPage: async number => { seen.push(number); return number < 2 ? page : empty; } });
    expect(seen).toEqual([0, 1, 2]);
    expect(result).toMatchObject({ pages: 3, notices: 8, total: 11363 });
    expect(db.stored).toHaveLength(8);
  });

  it("fails when the first page no longer parses", async () => {
    const db = memory();
    await expect(runWaterHarvest({ store: db.store, delayMs: 0, fetchPage: async () => empty })).rejects.toThrow("layout");
    expect(db.stored).toEqual([]);
  });

  it("walks the whole archive in backfill mode", async () => {
    const db = memory();
    const small = page.replace("de 11363 resultados", "de 25 resultados");
    const seen: number[] = [];
    await runWaterHarvest({ store: db.store, pages: "all", delayMs: 0, fetchPage: async number => { seen.push(number); return small; } });
    expect(seen).toEqual([0, 1, 2]);
  });
});

import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
  crawlGuide, guideKey, guideYearUrl, guideYearsFor, parseGuideYearPage, planGuideTargets, referenceFor, type CarGuideEntry,
} from "../../classes/autos/catalog/guide";

const HTML = fs.readFileSync(path.join(__dirname, "fixtures", "guide-toyota-hilux-2018.html"), "utf8");
const HILUX = { brandSlug: "toyota", modelSlug: "hilux", year: 2018 };
const NOW = new Date("2026-09-17T12:00:00Z");

describe("parseGuideYearPage", () => {
  it("reads the average and every version price", () => {
    const page = parseGuideYearPage(HTML, HILUX)!;
    expect(page.averageUsd).toBe(30_897);
    expect(page.updatedLabel).toBe("16 sep., 2026");
    expect(page.versions).toEqual([
      { name: "Toyota Hilux 2018 Srv", slug: "srv", priceUsd: 27_200 },
      { name: "Toyota Hilux 2018 Dx", slug: "dx", priceUsd: 32_990 },
      { name: "Toyota Hilux 2018 Sr", slug: "sr", priceUsd: 32_500 },
    ]);
  });
  it("ignores version links of another model-year and pages without a price", () => {
    expect(parseGuideYearPage(HTML, { ...HILUX, year: 2019 })!.versions).toEqual([]);
    expect(parseGuideYearPage("<html>nada</html>", HILUX)).toBeNull();
  });
  it("builds the public URL", () => {
    expect(guideYearUrl(HILUX)).toBe("https://www.mercadolibre.com.uy/precios-autos/toyota/hilux/2018/");
  });
});

const entry = (overrides: Partial<CarGuideEntry>): CarGuideEntry => ({
  key: guideKey("toyota", "hilux", 2018), ...HILUX, status: "ok", averageUsd: 30_897, updatedLabel: null,
  versions: [{ name: "Toyota Hilux 2018 Srv", slug: "srv", priceUsd: 27_200 }], fetchedAt: "2026-09-16T00:00:00Z", ...overrides,
});

describe("planGuideTargets", () => {
  it("reads new model-years first, then stale ones, and waits on missing pages", () => {
    const targets = [
      { brandSlug: "toyota", modelSlug: "hilux", year: 2018, listings: 40 },
      { brandSlug: "fiat", modelSlug: "uno", year: 2010, listings: 5 },
      { brandSlug: "fiat", modelSlug: "uno", year: 2011, listings: 50 },
      { brandSlug: "kia", modelSlug: "rio", year: 2015, listings: 9 },
    ];
    const previous = new Map([
      ["toyota|hilux|2018", { status: "ok" as const, fetchedAt: "2026-09-01T00:00:00Z" }],
      ["kia|rio|2015", { status: "missing" as const, fetchedAt: "2026-09-10T00:00:00Z" }],
    ]);
    expect(planGuideTargets(targets, previous, NOW).map(target => `${target.modelSlug}${target.year}`)).toEqual(["uno2011", "uno2010", "hilux2018"]);
  });
  it("skips fresh pages and retries failures after a day", () => {
    const targets = [
      { brandSlug: "a", modelSlug: "b", year: 2020, listings: 1 },
      { brandSlug: "a", modelSlug: "b", year: 2021, listings: 1 },
    ];
    const previous = new Map([
      ["a|b|2020", { status: "ok" as const, fetchedAt: "2026-09-15T00:00:00Z" }],
      ["a|b|2021", { status: "failed" as const, fetchedAt: "2026-09-16T00:00:00Z" }],
    ]);
    expect(planGuideTargets(targets, previous, NOW).map(target => target.year)).toEqual([2021]);
  });
});

describe("crawlGuide", () => {
  it("marks 404 as missing, stops after three failures in a row and respects the gap", async () => {
    const statuses = [404, 200, 500, 500, 500, 200];
    const sleeps: number[] = [];
    const targets = statuses.map((_, index) => ({ brandSlug: "b", modelSlug: "m", year: 2000 + index, listings: 1 }));
    const result = await crawlGuide(targets, {
      maxDurationMs: 60_000, gapMs: 1_500, now: () => NOW,
      sleep: async ms => { sleeps.push(ms); },
      fetchPage: async url => {
        const index = Number(/\/(\d{4})\/$/.exec(url)![1]) - 2000;
        const body = statuses[index] === 200 ? HTML.split("hilux/2018").join(`m/${2000 + index}`).split("toyota").join("b") : "";
        return { status: statuses[index]!, body };
      },
    });
    expect(result.entries.map(item => item.status)).toEqual(["missing", "ok", "failed", "failed", "failed"]);
    expect(result.entries[1]!.versions).toHaveLength(3);
    expect(result.requests).toBe(5);
    expect(result.note).toBe("la guía no responde");
    expect(sleeps.length).toBe(4);
    expect(sleeps.every(ms => ms === 1_500)).toBe(true);
  });
  it("stops when the time budget runs out", async () => {
    let clock = NOW.getTime();
    const result = await crawlGuide([HILUX, { ...HILUX, year: 2019 }].map(target => ({ ...target, listings: 1 })), {
      maxDurationMs: 1_000, gapMs: 0, now: () => new Date(clock),
      sleep: async () => undefined,
      fetchPage: async () => { clock += 2_000; return { status: 200, body: HTML }; },
    });
    expect(result.entries).toHaveLength(1);
    expect(result.note).toBe("presupuesto agotado");
  });
});

describe("references", () => {
  const guide = new Map([[guideKey("toyota", "hilux", 2018), entry({})]]);
  it("prefers the version price and falls back to the year average", () => {
    expect(referenceFor({ ...HILUX, trimLabel: "SRV" }, guide)).toEqual({ priceUsd: 27_200, basis: "version", updatedAt: "2026-09-16T00:00:00Z" });
    expect(referenceFor({ ...HILUX, trimLabel: "Dx" }, guide)).toEqual({ priceUsd: 30_897, basis: "year", updatedAt: "2026-09-16T00:00:00Z" });
    expect(referenceFor({ ...HILUX, year: 2017, trimLabel: null }, guide)).toBeNull();
    expect(referenceFor({ ...HILUX, trimLabel: null }, new Map([[guideKey("toyota", "hilux", 2018), entry({ status: "missing", averageUsd: null })]]))).toBeNull();
  });
  it("lists the model's guide rows with bare version names", () => {
    expect(guideYearsFor("toyota", "hilux", guide)).toEqual({
      guide: [{ year: 2018, averageUsd: 30_897, versions: [{ name: "Srv", priceUsd: 27_200 }] }],
      guideUpdatedAt: "2026-09-16T00:00:00Z",
    });
    expect(guideYearsFor("kia", "rio", guide)).toEqual({ guide: [], guideUpdatedAt: null });
  });
});

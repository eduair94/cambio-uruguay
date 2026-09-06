import { describe, expect, it } from "vitest";
import { operationSnapshot, snapshotRefusal, validateSaleHarvest, saleHarvestRefusal, rentalCoverage } from "../../classes/propertyopportunities/store";
import type { OpportunityAnalysisResult } from "../../classes/propertyopportunities/types";
import type { SaleHarvestResult } from "../../classes/propertyopportunities/sales";

const stats = () => ({ input: 1000, eligible: 100, analyzed: 20, shortlisted: 0, qualified: 0, excluded: {}, risks: {} });
const result = (): OpportunityAnalysisResult => ({ version: 1, algorithm: "local-asking-comparables-v1", generatedAt: "2026-09-06T06:00:00Z", usdUyu: 40, items: [], stats: { rent: stats(), sale: stats() } });
const snapshot = () => operationSnapshot(result(), "rent", "2026-09-06T05:00:00Z", []);

describe("property opportunity publication guards", () => {
  it("counts the actual recent analysis corpus rather than the last small hourly harvest", () => {
    const meta = { generatedAt: "2026-09-06T06:47:00Z", sources: [{ key: "infocasas", listings: 1 }] } as any;
    const rows = [
      { id: "one", source: "infocasas" as const, lastSeen: "2026-09-06" },
      { id: "one", source: "infocasas" as const, lastSeen: "2026-09-06" },
      { id: "two", source: "infocasas" as const, lastSeen: "2026-09-03" },
      { id: "old", source: "infocasas" as const, lastSeen: "2026-09-02" },
      { id: "future", source: "infocasas" as const, lastSeen: "2026-09-07" },
    ];
    const coverage = rentalCoverage(meta, rows, "2026-09-06T08:00:00Z");
    expect(coverage).toHaveLength(1);
    expect(coverage[0]).toMatchObject({ source: "infocasas", observed: 2, lastRead: "2026-09-06", complete: false });
    expect(meta.sources[0].listings).toBe(1);
  });
  it("does not assign the last batch date to a source without recent own readings", () => {
    const meta = { generatedAt: "2026-09-06T06:47:00Z", sources: [{ key: "elpais", listings: 200 }] } as any;
    const rows = [{ id: "expired", source: "elpais" as const, lastSeen: "2026-09-01" }];
    expect(rentalCoverage(meta, rows, "2026-09-06T08:00:00Z")).toEqual([]);
  });
  it("selects the latest reading by instant while retaining its original timestamp", () => {
    const rows = [
      { id: "earlier", source: "infocasas" as const, lastSeen: "2026-09-06T06:00:00Z" },
      { id: "later", source: "infocasas" as const, lastSeen: "2026-09-06T04:00:00-03:00" },
    ];
    expect(rentalCoverage(null, rows, "2026-09-06T08:00:00Z")[0].lastRead).toBe("2026-09-06T04:00:00-03:00");
  });
  it("does not renew source freshness when a new harvest collapses despite an intact historical archive", () => {
    const previous = { key: "infocasas" as const, readAt: "2026-09-05T06:00:00Z", coverage: [{ source: "infocasas" as const, observed: 2000, lastRead: "2026-09-05T06:00:00Z", complete: false, note: "Partial sample" }] };
    const capture = { readAt: "2026-09-06T06:00:00Z", listings: Array(200), coverage: { pagesRequested: 350, failedPages: 0 } } as unknown as SaleHarvestResult;
    expect(saleHarvestRefusal(capture, previous)).toContain("collapsed");
    capture.listings = Array(1500);
    expect(saleHarvestRefusal(capture, previous)).toBeNull();
    capture.coverage.failedPages = 100;
    expect(saleHarvestRefusal(capture, previous)).toContain("failed");
    expect(saleHarvestRefusal(capture, null)).toContain("failed");
  });
  it("allows an honestly empty shortlist when the input market remains intact", () => {
    expect(snapshotRefusal(snapshot(), snapshot())).toBeNull();
  });
  it("keeps a previous analysis when the input suddenly collapses", () => {
    const next = snapshot(); next.stats.input = 200;
    expect(snapshotRefusal(next, snapshot())).toContain("collapsed");
  });
  it("refuses an older generation and an invalid clock", () => {
    const next = snapshot(); next.generatedAt = "2026-09-05T00:00:00Z";
    expect(snapshotRefusal(next, snapshot())).toContain("Newer");
    next.generatedAt = "invalid";
    expect(snapshotRefusal(next, null)).toContain("dates");
  });
  it("refuses oversized public metadata before Mongo can reject the whole document", () => {
    const next = snapshot(); next.coverage = [{ source: "infocasas", observed: 10, lastRead: next.generatedAt, complete: false, note: "x".repeat(8 * 1024 * 1024) }];
    expect(snapshotRefusal(next, null)).toContain("budget");
  });
  it("refuses a missing or stale capture without writing anything", () => {
    const capture = { ok: false, operation: "sale", source: "infocasas", readAt: "2026-09-06T05:00:00Z", listings: [] } as unknown as SaleHarvestResult;
    expect(() => validateSaleHarvest(capture, "2026-09-06T06:00:00Z")).toThrow();
  });
  it("never accepts rental IDs, duplicated IDs or freshened old observation dates as sales", () => {
    const row = { id: "sale:infocasas:123", operation: "sale", source: "infocasas", lastSeen: "2026-09-06" };
    const capture = { ok: true, operation: "sale", source: "infocasas", readAt: "2026-09-06T05:00:00Z", listings: [row] } as unknown as SaleHarvestResult;
    expect(() => validateSaleHarvest(capture, "2026-09-06T06:00:00Z")).not.toThrow();
    expect(() => validateSaleHarvest({ ...capture, listings: [row, row] } as unknown as SaleHarvestResult, "2026-09-06T06:00:00Z")).toThrow();
    expect(() => validateSaleHarvest({ ...capture, listings: [{ ...row, operation: "rent" }] } as unknown as SaleHarvestResult, "2026-09-06T06:00:00Z")).toThrow();
    expect(() => validateSaleHarvest({ ...capture, listings: [{ ...row, lastSeen: "2026-09-05" }] } as unknown as SaleHarvestResult, "2026-09-06T06:00:00Z")).toThrow();
  });
})

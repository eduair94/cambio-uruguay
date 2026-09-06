import { describe, expect, it } from "vitest";
import { operationSnapshot, snapshotRefusal, validateSaleHarvest, saleHarvestRefusal } from "../../classes/propertyopportunities/store";
import type { OpportunityAnalysisResult } from "../../classes/propertyopportunities/types";
import type { SaleHarvestResult } from "../../classes/propertyopportunities/sales";

const stats = () => ({ input: 1000, eligible: 100, analyzed: 20, shortlisted: 0, qualified: 0, excluded: {}, risks: {} });
const result = (): OpportunityAnalysisResult => ({ version: 1, algorithm: "local-asking-comparables-v1", generatedAt: "2026-09-06T06:00:00Z", usdUyu: 40, items: [], stats: { rent: stats(), sale: stats() } });
const snapshot = () => operationSnapshot(result(), "rent", "2026-09-06T05:00:00Z", []);

describe("property opportunity publication guards", () => {
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

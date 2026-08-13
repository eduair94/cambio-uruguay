// sync_cambio.ts now always writes last_sync.txt, including when its budget ran
// out and it skipped origins. That is deliberate — a killed run used to leave the
// timestamp stale and /health screamed "down" — but it means a fresh timestamp no
// longer proves the run covered anything. This is the check that keeps a
// half-dead sync from reading as healthy.
import { describe, expect, it } from "vitest";
import { isPartialSyncRun } from "../../classes/sync_health";

describe("isPartialSyncRun", () => {
  it("accepts the normal steady state of a few failing casas", () => {
    // The real 2026-08-13 baseline: one origin 403ing out of 47.
    expect(isPartialSyncRun({ total: 47, success: 46, errors: 1 })).toBe(false);
    expect(isPartialSyncRun({ total: 47, success: 40, errors: 7 })).toBe(false);
  });

  it("flags the budget-exhausted run that only reached the first few origins", () => {
    // What the outage actually looked like: 6 origins scraped, 41 unreached.
    expect(isPartialSyncRun({ total: 47, success: 6, errors: 41 })).toBe(true);
  });

  it("does not flag anything when there are no results to judge", () => {
    expect(isPartialSyncRun(undefined)).toBe(false);
    expect(isPartialSyncRun(null)).toBe(false);
    expect(isPartialSyncRun({ total: 0, success: 0, errors: 0 })).toBe(false);
  });
});

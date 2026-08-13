// `currency-sync` is a pm2 app on a `*/5 * * * *` cron restart, so the whole
// origin loop lives under a hard 5-minute guillotine. Before this guard the loop
// was unbounded: on 2026-08-13 the shared proxy behind the Prex scraper went
// dead, every one of its axios calls blocked ~2 minutes on the TCP connect, and
// the run never got past origin #7 of 47. pm2 killed the process mid-loop every
// 5 minutes, `last_sync.txt` was never written, and /health reported the API
// down for ~5 hours while 40 casas silently stopped refreshing.
//
// These tests pin the two bounds that make that impossible: no single origin may
// outlast its timeout, and the loop always persists its results before the cron
// comes for it.
import { beforeEach, describe, expect, it, vi } from "vitest";

const writes: Record<string, string> = {};

vi.mock("fs", () => {
  const writeFileSync = (p: string, d: string) => {
    writes[p] = d;
  };
  return { default: { writeFileSync }, writeFileSync };
});

vi.mock("../../classes/cambio", () => ({ Cambio: class {} }));

vi.mock("../../classes/rate_changes", () => ({
  publishPendingRateChanges: vi.fn(async () => ({ sent: 0, pending: 0 })),
}));

const originsMock: Record<string, any> = {};
vi.mock("../../classes/origins", () => ({
  get origins() {
    return originsMock;
  },
}));

import { sync_cambios } from "../../classes/sync_cambio";

/** Minimal stand-in for a scraper class: `new Origin(key).sync_data()`. */
const originClass = (sync_data: () => Promise<void>) =>
  class {
    constructor(public key: string) {}
    sync_data() {
      return sync_data();
    }
  };

const results = () => JSON.parse(writes["last_sync_results.json"]);
const byOrigin = (origin: string) => results().origins.find((o: any) => o.origin === origin);

beforeEach(() => {
  for (const k of Object.keys(writes)) delete writes[k];
  for (const k of Object.keys(originsMock)) delete originsMock[k];
  process.env.SYNC_ORIGIN_TIMEOUT_MS = "80";
  process.env.SYNC_BUDGET_MS = "10000";
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("sync_cambios origin timeout", () => {
  it("fails a stalled origin instead of letting it hang the run", async () => {
    originsMock.before = originClass(async () => undefined);
    originsMock.stalls = originClass(() => new Promise<void>(() => undefined));
    originsMock.after = originClass(async () => undefined);

    await sync_cambios();

    expect(byOrigin("stalls").status).toBe("error");
    expect(byOrigin("stalls").error).toMatch(/timed out after 80ms/);
    // The whole point: the origins queued behind the stalled one still run.
    expect(byOrigin("before").status).toBe("success");
    expect(byOrigin("after").status).toBe("success");
    expect(results().summary).toMatchObject({ total: 3, success: 2, errors: 1 });
  });

  it("still writes last_sync.txt when an origin stalls", async () => {
    originsMock.stalls = originClass(() => new Promise<void>(() => undefined));

    await sync_cambios();

    // /health reads this file; a missing write is what made the API look down.
    expect(writes["last_sync.txt"]).toBeTruthy();
    expect(Number.isNaN(Date.parse(writes["last_sync.txt"]))).toBe(false);
  });
});

describe("sync_cambios global budget", () => {
  it("records the origins it could not reach rather than dying mid-loop", async () => {
    process.env.SYNC_BUDGET_MS = "40";
    originsMock.slow = originClass(() => new Promise<void>((r) => setTimeout(r, 60)));
    originsMock.unreached_a = originClass(async () => undefined);
    originsMock.unreached_b = originClass(async () => undefined);

    await sync_cambios();

    expect(byOrigin("slow").status).toBe("success");
    // Silently short runs read as healthy downstream, so unreached origins are
    // reported as failures — /estado shows them red instead of omitting them.
    expect(byOrigin("unreached_a")).toMatchObject({ status: "error" });
    expect(byOrigin("unreached_a").error).toMatch(/budget/i);
    expect(byOrigin("unreached_b").status).toBe("error");
    expect(results().summary).toMatchObject({ total: 3, success: 1, errors: 2 });
    expect(writes["last_sync.txt"]).toBeTruthy();
  });
});

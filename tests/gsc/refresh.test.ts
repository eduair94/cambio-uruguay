// Exercise the real refresh -> attribution -> revenue-plan path with synthetic data only.
// Both Google APIs are mocked; a query that looks like a URL is still a query.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../classes/gsc/client", () => ({
  searchAnalytics: vi.fn(),
  inspectUrl: vi.fn(),
  siteUrl: () => "sc-domain:cambio-uruguay.com",
  dayOffset: (days: number, now: number) => new Date(now - days * 86400000).toISOString().slice(0, 10),
  lastFinalDay: () => "2026-09-18",
}));

import { inspectUrl, searchAnalytics } from "../../classes/gsc/client";
import { refreshSearchConsole } from "../../classes/gsc/refresh";
import type { GscRow } from "../../classes/gsc/types";
import { DEFEND_KINDS, priceActions } from "../../classes/revenueplan/plan";
import { buildValueTable } from "../../classes/revenueplan/value";
import type { RevenueSnapshot } from "../../classes/site-analytics/revenue";

const historicalPage = "https://cambio-uruguay.com/historico/bcu/usd";
const guidePage = "https://cambio-uruguay.com/guias/fixture";
const urlShapedQuery = "https://cambio-uruguay.com/guias/solo-consulta";

const row = (keys: string[], clicks: number): GscRow => ({
  keys, clicks, impressions: 500, ctr: clicks / 500, position: 6,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(searchAnalytics).mockImplementation(async (request) => {
    // Archive reads do not participate in the reporting-window fixtures.
    if (request.startDate === request.endDate) return [];
    const previous = request.endDate < "2026-09-18";
    switch (request.dimensions?.join(",")) {
      case "page":
        return [row([historicalPage], previous ? 50 : 20), row([guidePage], previous ? 40 : 20)];
      case "query":
        return [
          row(["baja con destino"], previous ? 30 : 10),
          row(["baja sin destino"], previous ? 14 : 2),
          row([urlShapedQuery], previous ? 16 : 3),
        ];
      case "page,query":
        return [
          row([guidePage, "baja con destino"], 10),
          // A query equal to the page's URL must not overwrite known page-level attribution.
          row(["https://cambio-uruguay.com/convertir/fixture", historicalPage], 5),
        ];
      default:
        return [];
    }
  });
});

async function refresh() {
  const { snapshot } = await refreshSearchConsole({
    now: Date.parse("2026-09-21T12:00:00Z"),
    inspectSize: 0,
    backfillDays: 0,
    refetchRecentDays: 0,
  });
  expect(inspectUrl).not.toHaveBeenCalled();
  return snapshot;
}

describe("falling-page attribution through the refresh", () => {
  it("keeps each falling page as its own destination before query attribution", async () => {
    const snapshot = await refresh();
    const falling = snapshot.opportunities.filter((opportunity) => opportunity.kind === "falling");
    expect(falling.find((opportunity) => opportunity.subject === historicalPage)).toMatchObject({
      urls: [historicalPage], potentialClicks: 30,
    });
    expect(falling.find((opportunity) => opportunity.subject === guidePage)).toMatchObject({
      urls: [guidePage], potentialClicks: 20,
    });
  });

  it("only gives falling queries a destination evidenced by the query-page report", async () => {
    const snapshot = await refresh();
    const falling = snapshot.opportunities.filter((opportunity) => opportunity.kind === "falling");
    expect(falling.find((opportunity) => opportunity.subject === "baja con destino")?.urls).toEqual([guidePage]);
    expect(falling.find((opportunity) => opportunity.subject === "baja sin destino")).toBeDefined();
    expect(falling.find((opportunity) => opportunity.subject === "baja sin destino")?.urls).toBeUndefined();
    expect(falling.find((opportunity) => opportunity.subject === urlShapedQuery)).toBeDefined();
    expect(falling.find((opportunity) => opportunity.subject === urlShapedQuery)?.urls).toBeUndefined();
  });

  it("prices the refreshed page by its measured family and leaves unknown queries unattributed", async () => {
    const snapshot = await refresh();
    // Invented figures: historical RPM is 4x the site RPM, with enough sample for measurement.
    const revenue: RevenueSnapshot = {
      key: "site", asOf: "2026-09-21", currency: "USD",
      range: { start: "2026-08-24", end: "2026-09-20" },
      totals: { adRevenue: 12, adImpressions: 1200, adClicks: 6, screenPageViews: 6000, sessions: 4000, rpm: 2 },
      families: [{
        bucket: "/historico/*", urls: 1, adRevenue: 8, adImpressions: 400, adClicks: 4,
        screenPageViews: 1000, rpm: 8, shareOfRevenue: 2 / 3,
      }],
      topPages: [], daily: [], pending: false,
    };
    const actions = priceActions(snapshot.opportunities, buildValueTable(revenue), DEFEND_KINDS);
    expect(actions.find((action) => action.subject === historicalPage)).toMatchObject({
      url: historicalPage, bucket: "/historico/*", basis: "medido", weightedClicks: 120,
    });
    expect(actions.find((action) => action.subject === urlShapedQuery)).toMatchObject({
      url: null, bucket: null, weightedClicks: 13,
    });
  });
});

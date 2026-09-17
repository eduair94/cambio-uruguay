import { describe, expect, it, vi } from "vitest";

vi.mock("../../classes/appdb", () => ({
  appConnection: () => ({ collection: () => ({}) }),
  appModel: (_name: string, schema: unknown, collection: string) => ({ schema, collection: { name: collection } }),
}));

import { sourceEnabled, WEB_SOURCES } from "../../classes/autos/sources";
import { sourceRetirementFilter } from "../../classes/autos/store";

describe("sourceEnabled", () => {
  it("defaults to every source and honours both switches", () => {
    expect(WEB_SOURCES).toEqual(["clasiautos", "julio", "shoppingdeautos", "carper", "fidocar", "carone"]);
    expect(sourceEnabled("carone", {})).toBe(true);
    expect(sourceEnabled("carone", { AUTOS_SOURCES: "clasiautos,facebook" })).toBe(false);
    expect(sourceEnabled("facebook", { AUTOS_SOURCES: "clasiautos,facebook" })).toBe(true);
    expect(sourceEnabled("facebook", { AUTOS_FB_ENABLED: "0" })).toBe(false);
    expect(sourceEnabled("shoppingdeautos", { AUTOS_SHOPPINGDEAUTOS_ENABLED: "0" })).toBe(false);
  });
});

describe("sourceRetirementFilter", () => {
  it("only ever considers the same source's unseen adverts from the last 21 days", () => {
    const now = "2026-09-17T12:00:00.000Z";
    const filter = sourceRetirementFilter({ source: "carone", startedAt: now, listings: [{ id: "1", source: "carone" }] as never });
    expect(filter).toEqual({
      "listing.source": "carone", key: { $nin: ["carone-1"] },
      lastSeen: { $lt: now, $gte: "2026-08-27T12:00:00.000Z" }, retiredAt: null,
    });
  });
});

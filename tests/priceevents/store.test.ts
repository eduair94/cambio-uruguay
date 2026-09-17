import { describe, expect, it, vi } from "vitest";

// Final review M7: `offersSeenTodayByVertical` used to `.select()` the whole `history` array (up to
// 120 points, `classes/pricewatch/record.ts`) even though `analyzeOfferOutcome` only ever looks at
// today plus the last 60 days. This locks down the actual projection object mongoose receives, since
// mixing a `$slice` operator with plain field-inclusion in one `.select()` call is easy to get wrong
// (a mongoose 6.x query silently drops an inclusion projection if it's mixed with an EXCLUSION one —
// this is neither, both sides are inclusions, but the shape is worth pinning down with a real
// assertion rather than trusting it by inspection).
const modelCalls = vi.hoisted(() => ({
  selectArg: undefined as unknown,
  filterArg: undefined as unknown,
}));

vi.mock("../../classes/models/PricewatchOffer", () => ({
  PricewatchOfferModel: {
    find: (filter: unknown) => {
      modelCalls.filterArg = filter;
      return {
        select: (arg: unknown) => {
          modelCalls.selectArg = arg;
          return {
            lean: () => ({
              cursor: () => [],
            }),
          };
        },
      };
    },
  },
}));

vi.mock("../../classes/models/PriceEventSnapshot", () => ({
  PriceEventSnapshotModel: {},
}));

import { PRICE_EVENT_LOOKBACK_DAYS } from "../../classes/priceevents/types";
import { offersSeenTodayByVertical } from "../../classes/priceevents/store";

describe("offersSeenTodayByVertical", () => {
  it("filters by vertical and lastSeen=today, riding the existing { vertical, lastSeen } index", () => {
    offersSeenTodayByVertical("equipar", "2026-11-27");
    expect(modelCalls.filterArg).toEqual({ vertical: "equipar", lastSeen: "2026-11-27" });
  });

  it("projects history with $slice: -61 (60-day lookback + today), never the full 120-point array", () => {
    offersSeenTodayByVertical("equipar", "2026-11-27");
    const projection = modelCalls.selectArg as Record<string, unknown>;
    expect(projection.history).toEqual({ $slice: -(PRICE_EVENT_LOOKBACK_DAYS + 1) });
    expect(projection.history).toEqual({ $slice: -61 });
  });

  it("still requests every field analyzeOfferOutcome and the bySource tally need, as plain inclusions", () => {
    offersSeenTodayByVertical("sillas", "2026-11-27");
    const projection = modelCalls.selectArg as Record<string, unknown>;
    for (const field of [
      "listingId",
      "vertical",
      "category",
      "productKey",
      "sellerKey",
      "sellerName",
      "title",
      "url",
      "currency",
      "firstSeen",
      "source",
    ]) {
      expect(projection[field]).toBe(1);
    }
  });
});

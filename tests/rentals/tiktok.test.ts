import { describe, expect, it } from "vitest";
import { RENTAL_SOURCES, RENTAL_SOURCE_LABEL } from "../../classes/rentals/types";

describe("TikTok is a rental source", () => {
  it("is enumerated with its label", () => {
    expect(RENTAL_SOURCES).toContain("tiktok");
    expect(RENTAL_SOURCE_LABEL.tiktok).toBe("TikTok");
  });
});

import { describe, expect, it } from "vitest";
import { RENTAL_SOURCES, RENTAL_SOURCE_LABEL } from "../../classes/rentals/types";

describe("Instagram and Facebook Reels are rental sources", () => {
  it("are enumerated with their labels", () => {
    expect(RENTAL_SOURCES).toEqual(expect.arrayContaining(["tiktok", "instagram", "facebookreels"]));
    expect(RENTAL_SOURCE_LABEL.instagram).toBe("Instagram");
    expect(RENTAL_SOURCE_LABEL.facebookreels).toBe("Facebook Reels");
  });
});

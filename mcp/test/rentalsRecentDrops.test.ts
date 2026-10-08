import { describe, expect, it } from "vitest";
import { compactRental, rentalLine } from "../src/rentals/compact";
import { rentalSearchParams } from "../src/rentals/search";
import { RENTAL_SORTS } from "../src/rentals/types";
import { rental } from "./fixtures";

// The directory gained "publicadas en los últimos N días" (`dias`), "bajó de precio" (`bajo`) and
// the "mayor baja" sort on 2026-10-08; the assistant answers through this tool and could not ask
// for any of them.
describe("recent adverts and price drops in search_rentals", () => {
  it("passes the window, the drop filter and the sort under the site's own names", () => {
    const params = rentalSearchParams({ department: "Montevideo", postedWithinDays: 7, priceDropped: true, sort: "baja" });
    expect(params).toMatchObject({ dias: 7, bajo: true, sort: "baja" });
    expect(rentalSearchParams({})).toMatchObject({ dias: undefined, bajo: undefined });
    expect(RENTAL_SORTS).toContain("baja");
  });

  it("says how much a listing dropped, from what and when", () => {
    const line = rentalLine(
      compactRental({ ...rental(), priceDrop: { listingId: "infocasas:1", from: 30_000, to: 27_000, currency: "UYU", at: "2026-10-03", pct: 10 } })
    );
    expect(line).toContain("bajó 10 %");
    expect(line).toContain("2026-10-03");
    expect(rentalLine(compactRental(rental()))).not.toContain("bajó");
  });
});

import { describe, expect, it } from "vitest";
import { compactRental, rentalLine } from "../src/rentals/compact";
import { householdBody } from "../src/rentals/household";
import { rentalSearchParams, searchRentals } from "../src/rentals/search";
import { rental } from "./fixtures";
import type { SiteApi } from "../src/site";

// The directory gained "Plazo" (anual / invernal) and "Muebles" (con / sin) on 2026-10-09, after a
// reader asked for them; the assistant answers through this tool and could not ask for either.
describe("contract period and furniture in search_rentals", () => {
  it("passes them under the site's own names", () => {
    expect(rentalSearchParams({ furnished: true })).toMatchObject({ furnished: true, sinMuebles: undefined });
    expect(rentalSearchParams({ furnished: false })).toMatchObject({ furnished: undefined, sinMuebles: 1 });
    expect(rentalSearchParams({ term: "invernal" }).plazo).toBe("invernal");
    expect(rentalSearchParams({})).toMatchObject({ furnished: undefined, sinMuebles: undefined, plazo: undefined });
  });

  it("says what the shown advert says: furnished, unfurnished, winter", () => {
    const winter = rental({ matchingOffer: { ...rental().matchingOffer, furnished: false, terms: ["invernal"] } });
    const line = rentalLine(compactRental(winter as never));
    expect(line).toContain("sin muebles");
    expect(line).toContain("invernal (marzo a diciembre)");
    const both = rental({ matchingOffer: { ...rental().matchingOffer, furnished: true, terms: ["anual", "invernal"] } });
    expect(rentalLine(compactRental(both as never))).toContain("contrato anual o invernal");
    const plain = rentalLine(compactRental(rental() as never));
    expect(plain).not.toContain("muebles");
    expect(plain).not.toContain("invernal");
  });

  it("warns that a furniture filter only finds adverts that say so", async () => {
    const site = { get: async () => ({ items: [], total: 0, meta: { usdUyu: 41 } }) } as unknown as SiteApi;
    const out = await searchRentals(site, { furnished: false, term: "invernal" });
    expect(out.text).toContain("DICEN sin muebles");
    expect(out.text).toContain("Invernal = contrato de marzo a diciembre");
  });
});

describe("furniture in rank_rentals_for_household", () => {
  it("asks the site's ranking for furnished or unfurnished homes", () => {
    const base = { people: [{ label: "Ana" }], housingBudgetUyu: 30_000 };
    expect(householdBody({ ...base, furnished: false })).toMatchObject({ furnished: false, unfurnished: true });
    expect(householdBody({ ...base, furnished: true })).toMatchObject({ furnished: true, unfurnished: false });
    expect(householdBody(base)).toMatchObject({ furnished: false, unfurnished: false });
  });
});

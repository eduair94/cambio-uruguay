import { describe, expect, it } from "vitest";
import { RENTALS_RATE_API, medianUsdSell } from "../../classes/rentals/rate";

describe("medianUsdSell", () => {
  // The public feed is ONE flat array with every currency and every rate type interleaved. Picking
  // the wrong rows shifts every dollar-quoted rent on the page at once.
  it("uses only what a person pays at a counter", () => {
    expect(
      medianUsdSell([
        { code: "USD", origin: "brou", type: "", sell: 41 },
        { code: "USD", origin: "itau", type: "", sell: 43 },
        { code: "USD", origin: "cambio_sir", type: "", sell: 42 },
        { code: "USD", origin: "bcu", type: "", sell: 39.5 },
        { code: "USD", origin: "brou", type: "INTERBANCARIO", sell: 39.9 },
        { code: "EUR", origin: "brou", type: "", sell: 47 },
      ])
    ).toBe(42);
  });

  it("averages the two middle rates when the count is even", () => {
    expect(
      medianUsdSell([
        { code: "USD", origin: "a", sell: 40 },
        { code: "USD", origin: "b", sell: 42 },
      ])
    ).toBe(41);
  });

  it("returns 0 rather than a made-up rate", () => {
    expect(medianUsdSell([])).toBe(0);
    expect(medianUsdSell(null)).toBe(0);
    expect(medianUsdSell([{ code: "USD", origin: "bcu", sell: 40 }])).toBe(0);
  });
});

describe("RENTALS_RATE_API", () => {
  // This one cost a whole run: `cambio-uruguay.com/api/` is the NUXT app's route namespace and
  // answers 404. The rate rows live on the Express API's own subdomain.
  it("points at the API host, not at the site", () => {
    expect(RENTALS_RATE_API).toBe("https://api.cambio-uruguay.com");
  });
});

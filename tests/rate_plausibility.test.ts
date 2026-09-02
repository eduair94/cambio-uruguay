// The guard that stands between an upstream typo and the site's headline number.
//
// Every case here is taken from the 201 rows the live API served on 2026-09-01, the day
// lafavorita.com.uy published `3905` in its own Compra cell and /dolar-hoy answered
// "Compra $ 3.905,00". The negative cases matter more than the positive one: a guard that also
// rejects real quotes is worse than no guard, because it deletes the product.
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { implausibleReason, rateKey, shouldAlert } from "../classes/rate_plausibility";

describe("implausibleReason", () => {
  it("rejects the quote that actually shipped", () => {
    const reason = implausibleReason({ origin: "la_favorita", code: "USD", buy: 3905, sell: 41.45 });
    expect(reason).toMatch(/compra 3905 mayor que venta 41\.45/);
  });

  it("rejects it whichever way the decimal was lost, as long as buy ends up above sell", () => {
    expect(implausibleReason({ code: "EUR", buy: 4580, sell: 49.8 })).not.toBeNull();
  });

  it("accepts an ordinary quote", () => {
    expect(implausibleReason({ origin: "brou", code: "USD", buy: 39.05, sell: 41.45 })).toBeNull();
  });

  it("accepts the wide spreads casas really charge for the Argentine peso", () => {
    // buy 0,02 / sell 0,20 is a 10x spread and it is what 38 casas quoted that day: they barely
    // want the currency. A ratio-based rule would have deleted all of them.
    expect(implausibleReason({ code: "ARS", buy: 0.02, sell: 0.2 })).toBeNull();
    expect(implausibleReason({ code: "ARS", buy: 0.01, sell: 0.25 })).toBeNull();
    expect(implausibleReason({ code: "ARS", buy: 0.021, sell: 0.35 })).toBeNull();
  });

  it("accepts buy === sell, which is how BCU and the interbancario publish", () => {
    expect(implausibleReason({ origin: "bcu", code: "USD", type: "BILLETE", buy: 40.5, sell: 40.5 })).toBeNull();
    expect(
      implausibleReason({ origin: "la_favorita", code: "USD", type: "INTERBANCARIO", buy: 40.236, sell: 40.236 })
    ).toBeNull();
  });

  it("accepts a one-sided quote, which plenty of casas publish", () => {
    expect(implausibleReason({ code: "GBP", buy: 0, sell: 61.78 })).toBeNull();
    expect(implausibleReason({ code: "GBP", buy: 51.27, sell: 0 })).toBeNull();
  });

  it("rejects a non-number rather than storing NaN", () => {
    expect(implausibleReason({ code: "USD", buy: Number.NaN, sell: 41 })).toMatch(/no es un número/);
  });

  it("accepts the four-figure quotes that are real", () => {
    // Gold is quoted per troy ounce: six figures, and both sides ordered correctly.
    expect(implausibleReason({ origin: "brou", code: "XAU", buy: 168955.68, sell: 184912.6 })).toBeNull();
  });
});

describe("rateKey", () => {
  it("identifies a quote by casa, currency and type", () => {
    expect(rateKey({ origin: "la_favorita", code: "USD", type: "", buy: 1, sell: 2 })).toBe("la_favorita|USD|");
    expect(rateKey({ origin: "bcu", code: "USD", type: "BILLETE", buy: 1, sell: 2 })).toBe("bcu|USD|BILLETE");
  });
});

describe("shouldAlert", () => {
  const files: string[] = [];
  const tmpFile = () => {
    const f = path.join(os.tmpdir(), `rate-memo-${files.length}-${process.pid}.json`);
    files.push(f);
    return f;
  };
  afterEach(() => {
    for (const f of files.splice(0)) {
      try {
        fs.unlinkSync(f);
      } catch {
        /* already gone */
      }
    }
  });

  it("alerts once per quote per day — the scrape runs every five minutes", () => {
    const f = tmpFile();
    expect(shouldAlert("la_favorita|USD|", "2026-09-01", f)).toBe(true);
    expect(shouldAlert("la_favorita|USD|", "2026-09-01", f)).toBe(false);
    expect(shouldAlert("la_favorita|USD|", "2026-09-01", f)).toBe(false);
  });

  it("alerts again the next day, because it is still broken", () => {
    const f = tmpFile();
    shouldAlert("la_favorita|USD|", "2026-09-01", f);
    expect(shouldAlert("la_favorita|USD|", "2026-09-02", f)).toBe(true);
  });

  it("keeps quotes independent", () => {
    const f = tmpFile();
    expect(shouldAlert("la_favorita|USD|", "2026-09-01", f)).toBe(true);
    expect(shouldAlert("la_favorita|EUR|", "2026-09-01", f)).toBe(true);
  });

  it("forgets other days so the file cannot grow forever", () => {
    const f = tmpFile();
    shouldAlert("a|USD|", "2026-09-01", f);
    shouldAlert("b|USD|", "2026-09-02", f);
    expect(Object.keys(JSON.parse(fs.readFileSync(f, "utf8")))).toEqual(["b|USD|"]);
  });

  it("alerts rather than crashing when the memo is unreadable", () => {
    const f = tmpFile();
    fs.writeFileSync(f, "no soy json");
    expect(shouldAlert("a|USD|", "2026-09-01", f)).toBe(true);
  });
});

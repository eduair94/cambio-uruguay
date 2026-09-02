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
import { auditAgainstPeers, bandFor, implausibleReason, rateKey, shouldAlert } from "../classes/rate_plausibility";
import type { RateLike } from "../classes/rate_plausibility";

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

// La banda entre casas: el caso que la regla por fila no puede ver.
//
// Los tres casos vienen del mismo día real (2026-09-01, 201 filas servidas por la API pública):
// la compra rota de la_favorita, la cotización genuinamente rara de tradelix para el peso
// argentino, y el resto del mercado como contexto.
describe("auditAgainstPeers", () => {
  const row = (origin: string, code: string, buy: number, sell: number, type = ""): RateLike => ({
    origin,
    code,
    type,
    buy,
    sell,
  });

  /** 41 casas cotizando el dólar entre 39 y 41,50, que es lo que había ese día. */
  const usdMarket = (): RateLike[] =>
    Array.from({ length: 40 }, (_, i) => row(`casa_${i}`, "USD", 39 + (i % 10) * 0.1, 41 + (i % 5) * 0.1));

  /** 38 casas cotizando el peso argentino con spreads de diez veces, que también es real. */
  const arsMarket = (): RateLike[] =>
    Array.from({ length: 38 }, (_, i) => row(`casa_${i}`, "ARS", 0.02, 0.2 + (i % 3) * 0.01));

  it("marca como imposible la compra que se publicó de verdad", () => {
    const judged = auditAgainstPeers([...usdMarket(), row("la_favorita", "USD", 3905, 41.45)]);
    const hit = judged.find((r) => r.origin === "la_favorita");
    expect(hit?.verdict.level).toBe("imposible");
    expect(hit?.verdict.side).toBe("buy");
  });

  it("VE EL CASO ESPEJO: la coma perdida del lado de la venta", () => {
    // Por fila esto es coherente —compra menor que venta— así que la otra guarda lo deja pasar.
    // Sólo se nota contra las otras 40 casas.
    const judged = auditAgainstPeers([...usdMarket(), row("cambio_x", "USD", 39.05, 4120)]);
    const hit = judged.find((r) => r.origin === "cambio_x");
    expect(hit?.verdict.level).toBe("imposible");
    expect(hit?.verdict.side).toBe("sell");
  });

  it("no borra un precio malo de verdad: lo marca sospechoso", () => {
    // tradelix compra el peso argentino a 0,15 donde el resto paga 0,02. Es carísimo, no es un
    // error de parseo, y borrarlo sería inventar que la casa no cotiza.
    const judged = auditAgainstPeers([...arsMarket(), row("tradelix", "ARS", 0.15, 0.55)]);
    const hit = judged.find((r) => r.origin === "tradelix");
    expect(hit?.verdict.level).toBe("sospechosa");
  });

  it("deja en paz al mercado normal", () => {
    const judged = auditAgainstPeers([...usdMarket(), ...arsMarket()]);
    expect(judged.filter((r) => r.verdict.level !== "ok")).toEqual([]);
  });

  it("no juzga un grupo sin muestra suficiente", () => {
    // Cuatro casas no hacen un mercado; una banda sobre eso marca cualquier cosa.
    const judged = auditAgainstPeers([
      row("a", "XAU", 168955, 184912),
      row("b", "XAU", 170000, 185000),
      row("c", "XAU", 169500, 184000),
      row("d", "XAU", 1, 2),
    ]);
    expect(judged.every((r) => r.verdict.level === "ok")).toBe(true);
  });

  it("separa por tipo: el interbancario no se compara contra el mostrador", () => {
    const judged = auditAgainstPeers([
      ...usdMarket(),
      ...Array.from({ length: 6 }, (_, i) => row(`banco_${i}`, "USD", 40.2, 40.2, "INTERBANCARIO")),
    ]);
    expect(judged.filter((r) => r.verdict.level !== "ok")).toEqual([]);
  });
});

describe("bandFor", () => {
  it("le da banda ancha sola a una moneda dispersa y angosta a una apretada", () => {
    const usd = bandFor(Array.from({ length: 40 }, (_, i) => 39 + (i % 10) * 0.1))!;
    const ars = bandFor([...Array(20).fill(0.02), ...Array(18).fill(0.2)])!;
    // El cociente alto/bajo de la banda es lo que mide cuánta dispersión tolera cada grupo.
    expect(ars.softHigh / ars.softLow).toBeGreaterThan(usd.softHigh / usd.softLow);
  });

  it("no devuelve banda sin muestra", () => {
    expect(bandFor([1, 2, 3, 4])).toBeNull();
    expect(bandFor([])).toBeNull();
  });
});

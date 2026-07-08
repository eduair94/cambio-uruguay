import { describe, expect, it } from "vitest";
import { AIService } from "../classes/ai_service";
import { isPublicRate, publicRates } from "../classes/rate_source";

// A tiny live-market sample: the BCU official reference (bank-only for EVERY
// currency), a wholesale/interbank quote, and two real casas de cambio.
const ROWS = [
  { origin: "bcu", code: "USD", type: "BILLETE", name: "DLS. USA BILLETE", buy: 40.3, sell: 40.5 },
  { origin: "bcu", code: "USD", type: "CABLE", name: "DLS. USA CABLE", buy: 40.1, sell: 40.6 },
  { origin: "brou", code: "USD", type: "INTERBANCARIO", name: "Dólar interbancario", buy: 39.9, sell: 40.7 },
  { origin: "cambio_sir", code: "USD", type: "", name: "Dólar", buy: 40.0, sell: 41.0 },
  { origin: "aeromar", code: "USD", type: "BILLETE", name: "Dólar", buy: 40.2, sell: 40.9 },
];

const LOCAL_DATA: any = {
  bcu: { name: "Banco Central del Uruguay", website: "", maps: "", bcu: "", departments: ["Montevideo"] },
  cambio_sir: { name: "Cambio Sir", website: "", maps: "", bcu: "", departments: ["Montevideo"] },
  aeromar: { name: "Aeromar", website: "", maps: "", bcu: "", departments: ["Maldonado"] },
};

describe("isPublicRate / publicRates", () => {
  it("drops the BCU reference for every currency (bank-only)", () => {
    expect(isPublicRate({ origin: "bcu", code: "USD", type: "BILLETE" } as any)).toBe(false);
    expect(isPublicRate({ origin: "bcu", code: "ARS", type: "BILLETE" } as any)).toBe(false);
  });

  it("drops wholesale/interbank quote types at any origin", () => {
    expect(isPublicRate({ origin: "brou", type: "INTERBANCARIO" } as any)).toBe(false);
    expect(isPublicRate({ origin: "brou", type: "PROMED.FONDO" } as any)).toBe(false);
    expect(isPublicRate({ origin: "brou", type: "CABLE" } as any)).toBe(false);
  });

  it("keeps plain/cash (BILLETE, '') casa quotes", () => {
    expect(isPublicRate({ origin: "cambio_sir", type: "" } as any)).toBe(true);
    expect(isPublicRate({ origin: "aeromar", type: "BILLETE" } as any)).toBe(true);
  });

  it("filters a list to public-obtainable quotes only", () => {
    expect(publicRates(ROWS as any).map(r => r.origin).sort()).toEqual(["aeromar", "cambio_sir"]);
  });
});

describe("AIService.buildPrompt excludes non-public (BCU / interbank) quotes", () => {
  const build = (req: any) => (new AIService() as any).buildPrompt(req, ROWS);

  it("never lists the Banco Central as a place to buy/sell", () => {
    const prompt = build({ type: "best_rates", language: "es", currency: "USD" });
    expect(prompt).not.toMatch(/Banco Central/i);
  });

  it("never quotes the BCU reference rate in the market data", () => {
    const prompt = build({ type: "market_summary", language: "es" });
    // 40.30 / 40.50 are the BCU billete numbers — must not surface anywhere.
    expect(prompt).not.toContain("40.30");
    expect(prompt).not.toContain("40.50");
  });

  it("counts only the real casas de cambio, not BCU or interbank origins", () => {
    const prompt = build({ type: "market_summary", language: "es", localData: LOCAL_DATA });
    expect(prompt).toContain("2 casas de cambio");
    expect(prompt).toContain("Cambio Sir");
    expect(prompt).toContain("Aeromar");
  });

  it("keeps BCU out of the geographic-presence list too", () => {
    const prompt = build({ type: "market_summary", language: "es", localData: LOCAL_DATA });
    expect(prompt).not.toMatch(/Banco Central del Uruguay: /);
  });
});

// A richer market: two liquid currencies, a single-source exotic, an index unit,
// a sub-unit currency, an eBROU quote and a BCU row.
const MARKET = [
  { origin: "cambio_sir", code: "USD", type: "", name: "Dólar", buy: 39.6, sell: 40.8 },
  { origin: "aeromar", code: "USD", type: "", name: "Dólar", buy: 40.0, sell: 41.0 },
  { origin: "brou", code: "USD", type: "EBROU", name: "Dólar", buy: 39.5, sell: 40.9 },
  { origin: "prex", code: "ARS", type: "", name: "Peso Argentino", buy: 0.03, sell: 0.03 },
  { origin: "fortex", code: "ARS", type: "", name: "Peso Argentino", buy: 0.0264, sell: 0.0326 },
  { origin: "la_favorita", code: "PEN", type: "", name: "Sol Peruano", buy: 10.9, sell: 14.29 },
  { origin: "itau", code: "UI", type: "", name: "Unidad Indexada", buy: 6.61, sell: 6.61 },
  { origin: "bcu", code: "USD", type: "BILLETE", name: "DLS. USA BILLETE", buy: 40.3, sell: 40.5 },
];

describe("AIService.buildPrompt data quality", () => {
  const build = (req: any) => (new AIService() as any).buildPrompt(req, MARKET);

  it("keeps real precision for sub-unit currencies (no 0.03 collapse)", () => {
    const prompt = build({ type: "market_summary", language: "es" });
    expect(prompt).toContain("0.0264"); // would be "0.03" under a flat toFixed(2)
  });

  it("drops single-source exotics and index units from the all-currency summary", () => {
    const prompt = build({ type: "market_summary", language: "es" });
    expect(prompt).toContain("2 monedas (ARS, USD)");
    expect(prompt).not.toContain("PEN"); // only one house → no meaningful comparison
    expect(prompt).not.toMatch(/\bUI \(/); // index unit, not a tradeable divisa
  });

  it("labels empty/cash quotes as BILLETE and surfaces EBROU", () => {
    const prompt = build({ type: "currency_analysis", language: "es", currency: "USD" });
    expect(prompt).toContain("BILLETE");
    expect(prompt).toContain("EBROU");
    expect(prompt).not.toContain("[N/A]");
  });

  it("still analyzes a single-source currency when the request targets it", () => {
    const prompt = build({ type: "currency_analysis", language: "es", currency: "PEN" });
    expect(prompt).toContain("PEN");
    expect(prompt).toContain("Sol Peruano");
  });
});

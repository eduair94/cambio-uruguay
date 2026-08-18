// The money classifier is the whole editorial claim of /tendencias-uruguay: it decides which of
// Uruguay's trending searches and threads get presented as "esto es de plata". These tests pin the
// cases that were actually measured wrong against the live feeds on 2026-08-18, so a future
// keyword addition cannot quietly bring them back.
import { describe, expect, it } from "vitest";
import { classifyMoney, normalizeForMatch } from "../classes/trends/classify";

describe("the money classifier", () => {
  it("strips accents so dolar and dólar are the same word", () => {
    expect(normalizeForMatch("Dólar Hoy")).toBe("dolar hoy");
    expect(normalizeForMatch("INFLACIÓN  anual")).toBe("inflacion anual");
    expect(classifyMoney("cotización del dólar").money).toBe("money");
  });

  it("classifies the obvious money terms", () => {
    for (const term of [
      "salario mínimo",
      "aumento de tarifas de UTE",
      "IRPF 2026",
      "cotizacion del euro",
      "alquiler en Montevideo",
      "prestamo del BROU",
    ]) {
      expect(classifyMoney(term).money, term).toBe("money");
    }
  });

  it("reads English titles too", () => {
    // The most engaged thread of the week when this was written was in English and the
    // Spanish-only table scored it "no".
    expect(
      classifyMoney("I have a collection of foreign currencies. What can I buy with this in Uruguay?")
        .money
    ).toBe("money");
    expect(classifyMoney("What is a normal salary in Uruguay?").money).toBe("money");
  });

  it("matches whole words only", () => {
    // Substring matching is how keyword classifiers embarrass themselves: "iva" inside "Bolivia",
    // "paro" inside "disparo", "cambio" inside "recambio".
    expect(classifyMoney("viaje a Bolivia").money).toBe("no");
    expect(classifyMoney("hubo un disparo en el barrio").money).toBe("no");
    expect(classifyMoney("recambio de cubiertas").money).toBe("no");
  });

  it("does NOT call the ambiguous single words money on their own", () => {
    // Measured false positives: "no paro de comer dulces" is not a labour conflict, the bank in
    // "banco de la plaza" is furniture, and "cambio" is also a haircut. They may be money — that is
    // what the "maybe" bucket is for — but the page must not assert it.
    expect(classifyMoney("Cómo hacen para no comer cosas dulces? Yo no paro").money).not.toBe("money");
    expect(classifyMoney("me senté en un banco de la plaza").money).not.toBe("money");
    expect(classifyMoney("cambio de look").money).not.toBe("money");
  });

  it("keeps the unambiguous phrase even when the bare word was dropped", () => {
    expect(classifyMoney("seguro de paro").money).toBe("money");
    expect(classifyMoney("paro general del PIT-CNT").money).toBe("money");
    expect(classifyMoney("casa de cambio en Rivera").money).toBe("money");
    expect(classifyMoney("el banco central subió la tasa").money).toBe("money");
  });

  it("reports which keyword fired, so the page can show its own reasoning", () => {
    const verdict = classifyMoney("aumento del salario mínimo");
    expect(verdict.money).toBe("money");
    expect(verdict.matchedOn).toContain("salario");
    expect(verdict.matchedOn).toContain("aumento");
  });

  it("falls back to maybe, never to money, for the merely suggestive", () => {
    expect(classifyMoney("Temu llega a Uruguay").money).toBe("maybe");
    expect(classifyMoney("cinco de oro").money).toBe("maybe");
  });

  it("a strong hit beats a weak one", () => {
    // "economia" alone is maybe; with "impuesto" in the same text it is money.
    expect(classifyMoney("economia").money).toBe("maybe");
    expect(classifyMoney("economia", "sube el impuesto").money).toBe("money");
  });

  it("says no when there is nothing to say, including on empty input", () => {
    expect(classifyMoney("Fluminense vs Independiente Rivadavia").money).toBe("no");
    expect(classifyMoney("").money).toBe("no");
    expect(classifyMoney(null, undefined).money).toBe("no");
  });
});

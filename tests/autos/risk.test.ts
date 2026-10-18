import { describe, expect, it } from "vitest";
import { descriptionFlags, foldOffsets } from "../../classes/autos/normalize";
import { declaredRisks, quoteAround, riskCategories, risksIn, worstSeverity } from "../../classes/autos/risk";

describe("foldOffsets", () => {
  it("lowercases and unaccents without moving a single offset", () => {
    const text = "Año 2012 — CHOCADO leve, ñandú. Ürsula";
    expect(foldOffsets(text)).toHaveLength(text.length);
    const folded = foldOffsets(text);
    const index = folded.indexOf("chocado");
    expect(text.slice(index, index + 7)).toBe("CHOCADO");
  });
  it("turns each punctuation mark into one space, never collapsing a run", () => {
    expect(foldOffsets("a!!!b")).toBe("a   b");
  });
});

describe("declaredRisks", () => {
  it("reads what the seller says and quotes it back", () => {
    const risks = declaredRisks(
      "Fiat Uno 2012",
      "Impecable de motor. Tiene una deuda de 52000 pesos de patente que se descuenta del precio. Consultas al 099 123 456.",
    );
    expect(riskCategories(risks)).toEqual(["deuda"]);
    expect(risks[0]!.from).toBe("description");
    expect(risks[0]!.quote).toContain("deuda de 52000 pesos");
    // The quote is published: it may never carry a phone number.
    expect(risks[0]!.quote).not.toMatch(/099/);
  });
  it("does not count what the advert denies", () => {
    expect(declaredRisks("", "Sin deuda, nunca chocado, libre de prenda y no tiene multas.")).toEqual([]);
    expect(declaredRisks("", "Auto sin choques, único dueño")).toEqual([]);
  });
  it("separates a debt from missing paperwork, and keeps both", () => {
    const risks = declaredRisks("", "Solo libreta, falta el título. Además tiene prenda del banco.");
    expect(riskCategories(risks)).toEqual(["deuda", "papeles"]);
  });
  it("reads the salvage market for what it is", () => {
    expect(riskCategories(declaredRisks("", "Resto de aseguradora, se vuelve a empadronar sin problemas"))).toEqual(["recupero"]);
    expect(riskCategories(declaredRisks("VW Gol para repuestos", ""))).toEqual(["mecanica"]);
    expect(riskCategories(declaredRisks("", "Ex taxi, motor hecho a nuevo"))).toEqual(["uso_intensivo"]);
    expect(riskCategories(declaredRisks("", "Chapa argentina, no se puede empadronar acá"))).toEqual(["chapa_extranjera"]);
  });
  it("prefers the title's wording when both say the same thing", () => {
    const risks = declaredRisks("CHOCADO DE ATRÁS, anda perfecto", "El choque fue de atrás, chapa y pintura pendiente");
    expect(risks).toHaveLength(1);
    expect(risks[0]!.from).toBe("title");
    expect(risks[0]!.quote).toContain("CHOCADO");
  });
  it("sorts the serious ones first", () => {
    const risks = declaredRisks("", "Ex taxi. Tiene deuda de sucive.");
    expect(risks.map(risk => risk.category)).toEqual(["deuda", "uso_intensivo"]);
    expect(worstSeverity(risks)).toBe("alta");
    expect(worstSeverity([])).toBeNull();
  });
  // ml-MLU700970425, 2026-10-17: a 2024 C3 at USD 7.990 against a USD 12.990 median, published as an
  // opportunity. Its own text explained the price; "impagas?" stopped at "impaga|ble".
  it("reads unpaid fines however the seller spells them", () => {
    const risks = declaredRisks(
      "Citroën C3 1.2 Puretech 82 Feel",
      "El auto esta igual a nuevo.  Cero errores. \nU$S 7990 contado.\nEL precio es porque tiene multas impagable.\nEs para andar así nomas."
    );
    expect(risks).toMatchObject([{ category: "deuda", quote: "EL precio es porque tiene multas impagable." }]);
    for (const text of ["Tiene multas impagables", "Con multas atrasadas", "multas por pagar", "tiene multas de transito", "Debe multas"])
      expect(riskCategories(declaredRisks("", text)), text).toEqual(["deuda"]);
    for (const text of ["No tiene multas", "Sin multas ni deudas", "Al día, cero multas"])
      expect(declaredRisks("", text), text).toEqual([]);
  });
  // Measured 2026-10-17 on the 104 live opportunities: once declared risks gate opportunities, these
  // two read a dealer's financing paperwork and a hail cover as risks.
  it("does not read financing paperwork or a hail cover as a risk", () => {
    for (const text of [
      "En el valor de la cuota incluimos costo de certificados, prenda y títulos del auto a su nombre!",
      "Financiamos con crédito prendario",
      "• además tenemos un toldo que es del modelo del auto que es anti granizo",
      "Incluye funda antigranizo",
    ])
      expect(declaredRisks("", text), text).toEqual([]);
    for (const text of ["Auto prendado", "Tiene prenda", "Está con prenda", "Prenda vigente"])
      expect(riskCategories(declaredRisks("", text)), text).toEqual(["deuda"]);
    for (const text of ["Daños por granizo", "Granizo leve en el techo"])
      expect(riskCategories(declaredRisks("", text)), text).toEqual(["siniestro"]);
  });
  it("never repeats a category", () => {
    const risks = risksIn("Chocado, siniestrado, accidentado y sin airbags", "title");
    expect(risks).toHaveLength(1);
  });
});

describe("quoteAround", () => {
  it("cuts on sentence ends and keeps whole words", () => {
    const text = "Primera frase que no importa. Tiene deuda de patente de 3 años. Otra frase más.";
    const index = text.indexOf("deuda");
    const quote = quoteAround(text, index, 5);
    expect(quote.startsWith("Tiene")).toBe(true);
    expect(quote.endsWith("años.")).toBe(true);
  });
  it("caps a run-on description with an ellipsis", () => {
    const long = `${"palabra ".repeat(40)}chocado ${"otra ".repeat(40)}`;
    const quote = quoteAround(long, long.indexOf("chocado"), 7);
    expect(quote.length).toBeLessThanOrEqual(160);
    expect(quote).toContain("chocado");
  });
});

describe("risks and the older flag vocabulary", () => {
  it("never let a flagged advert come back without its risk", () => {
    const cases: Array<[string, string]> = [
      ["damaged", "El auto está chocado de adelante"],
      ["damaged", "Motor fundido, se vende para repuestos"],
      ["recovered", "Recuperado de robo, papeles al día"],
      ["paperwork", "Se vende con matrículas entregadas"],
      ["paperwork", "Tiene una deuda de 40000"],
      ["foreign_plate", "Chapa brasilera"],
    ];
    for (const [flag, text] of cases) {
      expect(descriptionFlags(text)).toContain(flag);
      expect(declaredRisks(text, "").length, text).toBeGreaterThan(0);
    }
  });
});

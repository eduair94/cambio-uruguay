import { describe, expect, it } from "vitest";
import { rentalPeriodEvidence } from "../../classes/rentals/eligibility";
import {
  aggregateFurnished,
  aggregateTerms,
  applyRentalTextFacts,
  combineFurnished,
  furnishedFromText,
  rentalTermsFromText,
} from "../../classes/rentals/textFacts";

describe("furnishedFromText", () => {
  it("reads the advert's own words, title first", () => {
    expect(furnishedFromText("Apartamento amueblado en Pocitos")).toBe(true);
    expect(furnishedFromText("Monoambiente AMOBLADO frente al mar")).toBe(true);
    expect(furnishedFromText("Casa semi amueblada en Malvín")).toBe(true);
    expect(furnishedFromText("Alquiler Monoambiente Al Frente En Punta Carretas 7o Piso - Sin Muebles")).toBe(false);
    expect(furnishedFromText("Apartamento no amueblado, 2 dormitorios")).toBe(false);
    expect(furnishedFromText("Apartamento 2 dormitorios", "Se entrega sin amoblar, con cocina equipada.")).toBe(false);
    expect(furnishedFromText("Apartamento 2 dormitorios", "Se alquila con muebles y electrodomésticos.")).toBe(true);
    expect(furnishedFromText("Apartamento 2 dormitorios")).toBeNull();
  });

  it("does not read kitchen cabinets as furniture", () => {
    // Measured 2026-10-09: "cocina integrada con muebles aéreos y bajo mesada" is a kitchen.
    expect(furnishedFromText("Apto", "Cocina integrada con muebles aéreos y bajo mesada, baño completo.")).toBeNull();
    expect(furnishedFromText("Apto", "Cocina definida con muebles de calidad.")).toBeNull();
    expect(furnishedFromText("Apto", "Kitchenette con muebles nuevos.")).toBeNull();
  });

  it("says nothing when the advert offers both or contradicts itself", () => {
    expect(furnishedFromText("Alquiler Apartamento Con O Sin Amoblar A $21000")).toBeNull();
    expect(furnishedFromText("Apartamento En Cordón Amoblado Ó Sin Amoblar De 1 Dormitorio")).toBeNull();
    expect(furnishedFromText("Apartamento", "Amueblado opcional, a convenir con el propietario.")).toBeNull();
    // A title the description contradicts says nothing.
    expect(furnishedFromText("Apartamento amueblado", "Se entrega sin muebles.")).toBeNull();
  });
});

describe("contract periods", () => {
  it("tells year-round and winter contracts apart, and offers both when the advert does", () => {
    expect(rentalTermsFromText("Apartamento en alquiler anual")).toEqual(["anual"]);
    expect(rentalTermsFromText("Casa 3 dormitorios - Anual")).toEqual(["anual"]);
    expect(rentalTermsFromText("ALQUILER INVERNAL PUNTA DEL ESTE 2026")).toEqual(["invernal"]);
    expect(rentalTermsFromText("Apartamento", "Precio alquiler invernal: USD 1200 por mes.")).toEqual(["invernal"]);
    expect(rentalTermsFromText("Monoambiente en primera línea", "Disponible en alquiler anual e invernal.")).toEqual(["anual", "invernal"]);
    expect(rentalTermsFromText("Apartamento 2 dormitorios")).toEqual([]);
    expect(rentalTermsFromText("Alquiler anual con jardín de invierno")).toEqual(["anual"]);
    expect(rentalTermsFromText("Casa en alquiler", "Ropa de cama para invierno y calefacción.")).toEqual([]);
  });

  it("keeps a winter contract out of comparisons while publishing it", () => {
    const winter = rentalPeriodEvidence("ALQUILER INVERNAL PUNTA DEL ESTE 2026");
    expect(winter).toMatchObject({ winter: true, stay: false, shortTerm: true });
    // "Temporada invernal" is the winter contract, not a summer stay.
    expect(rentalPeriodEvidence("Se alquila temporada invernal")).toMatchObject({ winter: true, stay: false });
    expect(rentalPeriodEvidence("Alquiler temporada 2027")).toMatchObject({ stay: true });
  });
});

describe("combining what portals and words say", () => {
  it("lets a portal field and the words disagree into no claim", () => {
    expect(combineFurnished(true, null)).toBe(true);
    expect(combineFurnished(true, false)).toBeNull();
    expect(combineFurnished(false, true)).toBe(true);
    expect(combineFurnished(undefined, false)).toBe(false);
  });

  it("aggregates the adverts of one home", () => {
    expect(aggregateFurnished([true, null])).toBe(true);
    expect(aggregateFurnished([false, null])).toBe(false);
    expect(aggregateFurnished([true, false])).toBeNull();
    expect(aggregateFurnished([null, undefined])).toBeNull();
    expect(aggregateTerms([["invernal"], ["anual"], undefined])).toEqual(["anual", "invernal"]);
  });

  it("applies both to a freshly read advert, from its description when it has one", () => {
    const listing = applyRentalTextFacts({
      title: "Apartamento en Atlántida",
      description: "Alquiler invernal de marzo a diciembre, USD 600 por mes. Sin muebles.",
      details: undefined,
      furnished: null,
      furnishedPortal: undefined,
      terms: undefined,
    });
    expect(listing).toMatchObject({ furnished: false, terms: ["invernal"] });
    const infocasas = applyRentalTextFacts({ title: "Apartamento", furnished: null, furnishedPortal: true, terms: undefined });
    expect(infocasas.furnished).toBe(true);
  });
});

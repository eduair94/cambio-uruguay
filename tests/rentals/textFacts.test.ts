import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRentalProperties } from "../../classes/rentals/dedupe";
import { rentalPeriodEvidence } from "../../classes/rentals/eligibility";
import { textFactsStale, withTodaysTextFacts } from "../../classes/rentals/store";
import {
  aggregateFurnished,
  aggregateTerms,
  applyRentalTextFacts,
  combineFurnished,
  commonExpensesFromText,
  furnishedFromText,
  readCommonExpensesFromText,
  rentalTermsFromText,
} from "../../classes/rentals/textFacts";
import type { RawRental, RentalOffer } from "../../classes/rentals/types";

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

// Measured 2026-11-07/08 on the public API: 21-40 % of the InfoCasas and El País adverts without the
// portal's gastos comunes state them in their own description, and without them a card has no total.
describe("gastos comunes a description states", () => {
  const usdUyu = 40;
  const pesos = { price: 30_000, currency: "UYU" as const };

  it("reads the figure next to its label, in the currency it is written in", () => {
    // /alquileres/montevideo-pocitos-bulevar-espana-tkufq2-r8jimc: "No informado" beside this text.
    expect(commonExpensesFromText("Cochera para un auto.\n\nGastos comunes: $U11.000.-\nIncluyen limpieza de áreas comunes.", { price: 45_000, currency: "UYU" }, usdUyu))
      .toEqual({ commonExpenses: 11_000, commonExpensesCurrency: "UYU" });
    expect(commonExpensesFromText("Edificio con portería. GC aprox. $6.000", pesos, usdUyu)).toEqual({ commonExpenses: 6_000, commonExpensesCurrency: "UYU" });
    expect(commonExpensesFromText("GASTOS COMUNES: $3600", pesos, usdUyu)).toEqual({ commonExpenses: 3_600, commonExpensesCurrency: "UYU" });
    expect(commonExpensesFromText("Precio U$S 1.000, gastos comunes U$S 150", { price: 1_000, currency: "USD" }, usdUyu))
      .toEqual({ commonExpenses: 150, commonExpensesCurrency: "USD" });
    // The rent beside it is never read: only the gastos comunes are this reader's.
    expect(commonExpensesFromText("Alquiler $25.000 + GC $4.000. Contrato anual.", pesos, usdUyu)).toEqual({ commonExpenses: 4_000, commonExpensesCurrency: "UYU" });
  });

  it("takes an explicit 'sin gastos comunes' as zero, but not a discount", () => {
    expect(commonExpensesFromText("Apartamento tipo casa, sin gastos comunes.", pesos, usdUyu)).toEqual({ commonExpenses: 0, commonExpensesCurrency: null });
    expect(commonExpensesFromText("No paga gastos comunes", pesos, usdUyu)).toEqual({ commonExpenses: 0, commonExpensesCurrency: null });
    // The zone statistics' rule for the same words (propertyzones/project.ts) has the last word.
    expect(readCommonExpensesFromText("Sin gastos comunes durante los primeros 6 meses", pesos, usdUyu)).toEqual({ reading: null, reason: "conditional" });
  });

  it("abstains whenever the text does not say one monthly figure", () => {
    expect(readCommonExpensesFromText("Gastos comunes $3.600 y $4.000", pesos, usdUyu)).toEqual({ reading: null, reason: "ambiguous" });
    expect(readCommonExpensesFromText("Gastos comunes $5.000. Sin gastos comunes para el garaje.", pesos, usdUyu).reason).toBe("ambiguous");
    expect(readCommonExpensesFromText("Precio con gastos comunes incluidos", pesos, usdUyu).reason).toBe("included");
    expect(readCommonExpensesFromText("GC $4.000 incluidos en el precio", pesos, usdUyu).reason).toBe("included");
    expect(readCommonExpensesFromText("Gastos comunes $48.000 anuales", pesos, usdUyu).reason).toBe("yearly");
    expect(readCommonExpensesFromText("Hermoso apartamento con vista al mar", pesos, usdUyu)).toEqual({ reading: null, reason: "silent" });
    expect(readCommonExpensesFromText("", pesos, usdUyu).reason).toBe("silent");
  });

  it("keeps only what can be a month of gastos comunes for that rent, in pesos at the run's rate", () => {
    // Above the rent: a zero too many, or the year.
    expect(readCommonExpensesFromText("Gastos comunes $45.000", pesos, usdUyu)).toEqual({ reading: null, reason: "implausible" });
    expect(readCommonExpensesFromText("Gastos comunes $150", pesos, usdUyu).reason).toBe("implausible");
    // A dollar rent with gastos comunes in pesos is the usual Punta del Este advert: US$ 8.500 is $ 340.000.
    expect(commonExpensesFromText("Gastos comunes $ 26.000", { price: 8_500, currency: "USD" }, usdUyu)).toEqual({ commonExpenses: 26_000, commonExpensesCurrency: "UYU" });
    expect(commonExpensesFromText("Gastos comunes $ 26.000", { price: 8_500, currency: "USD" }, 0)).toBeNull();
    // A bare number beside a dollar rent could be either currency.
    expect(readCommonExpensesFromText("Gastos comunes: 450", { price: 1_500, currency: "USD" }, usdUyu).reason).toBe("unmarked");
    expect(commonExpensesFromText("Gastos comunes: 3.500", pesos, usdUyu)).toEqual({ commonExpenses: 3_500, commonExpensesCurrency: "UYU" });
  });

  const advert = (over: Partial<RawRental> = {}) => ({
    source: "infocasas" as const, title: "Apartamento 2 dormitorios", price: 30_000, currency: "UYU" as const,
    commonExpenses: null as number | null, commonExpensesCurrency: null as "UYU" | "USD" | null,
    furnished: null, furnishedPortal: undefined, terms: undefined, description: undefined,
    details: { description: "Luminoso. Gastos comunes: $5.500", images: [], builtArea: null, totalArea: null, landArea: null, terraceArea: null, amenities: [], guaranteeText: "" },
    ...over,
  });

  afterEach(() => vi.unstubAllEnvs());

  it("is published only with RENTALS_GC_FROM_TEXT=1, and then labelled as the description's", () => {
    expect(applyRentalTextFacts(advert(), { usdUyu })).toMatchObject({ commonExpenses: null, commonExpensesCurrency: null });
    expect(applyRentalTextFacts(advert(), { usdUyu })).not.toHaveProperty("commonExpensesSource");
    vi.stubEnv("RENTALS_GC_FROM_TEXT", "1");
    expect(applyRentalTextFacts(advert(), { usdUyu })).toMatchObject({ commonExpenses: 5_500, commonExpensesCurrency: "UYU", commonExpensesSource: "description" });
  });

  it("never moves a figure the portal published, and leaves the portals it does not measure alone", () => {
    const portal = applyRentalTextFacts(advert({ commonExpenses: 4_000, commonExpensesCurrency: "UYU" }), { usdUyu, gcFromText: true });
    expect(portal).toMatchObject({ commonExpenses: 4_000, commonExpensesCurrency: "UYU" });
    expect(portal).not.toHaveProperty("commonExpensesSource");
    // A portal's explicit zero is a figure too.
    expect(applyRentalTextFacts(advert({ commonExpenses: 0 }), { usdUyu, gcFromText: true }).commonExpenses).toBe(0);
    expect(applyRentalTextFacts(advert({ source: "facebook" }), { usdUyu, gcFromText: true }).commonExpenses).toBeNull();
    // An advert that carries no rent (the furniture-only callers) is not read for money.
    expect(applyRentalTextFacts({ title: "Apto", description: "Gastos comunes $5.000", furnished: null, terms: undefined }, { usdUyu, gcFromText: true }))
      .not.toHaveProperty("commonExpenses");
  });

  it("reads only the published description, so the label points at a text the reader can see", () => {
    const hidden = advert({ description: "Gastos comunes: $5.500", details: { ...advert().details, description: "Luminoso." } });
    expect(applyRentalTextFacts(hidden, { usdUyu, gcFromText: true }).commonExpenses).toBeNull();
  });

  it("is idempotent, and takes back what it read once the flag is off", () => {
    const read = applyRentalTextFacts(advert(), { usdUyu, gcFromText: true });
    expect(applyRentalTextFacts(read, { usdUyu, gcFromText: true })).toEqual(read);
    const off = applyRentalTextFacts(read, { usdUyu, gcFromText: false });
    expect(off).toMatchObject({ commonExpenses: null, commonExpensesCurrency: null });
    expect(off).not.toHaveProperty("commonExpensesSource");
  });

  it("travels with the advert into its property", () => {
    const raw = {
      ...applyRentalTextFacts(advert(), { usdUyu, gcFromText: true }),
      listingId: "infocasas:1", url: "https://www.infocasas.com.uy/1", sellerName: "x", sellerType: "desconocido",
      image: null, publishedAt: null, propertyType: "apartamento", department: "Montevideo", neighborhood: "Pocitos",
      address: "", street: "", streetNumber: "", latitude: null, longitude: null, bedrooms: 2, bathrooms: 1, area: 60,
      parkingSpaces: null, petsAllowed: null, guarantees: [],
    } as RawRental;
    const [property] = buildRentalProperties([raw], {
      usdUyu, today: "2026-11-08", offerFirstSeen: new Map(), propertyFirstSeen: new Map(), offerToProperty: new Map(), propertyCanonicalOffer: new Map(),
    });
    expect(property!.offers[0]).toMatchObject({ commonExpenses: 5_500, commonExpensesSource: "description" });
  });

  it("re-reads the stored adverts in the daily run, with the same rules", () => {
    // As a current InfoCasas read stores it: the portal's own furniture field is always a boolean.
    const stored = {
      ...advert(), furnishedPortal: false, listingId: "infocasas:1", url: "u", priceUyu: 30_000, sellerName: "x", sellerType: "desconocido",
      image: null, publishedAt: null, petsAllowed: null, guarantees: [], parkingSpaces: null, furnished: null, firstSeen: "2026-11-01", lastSeen: "2026-11-08",
    } as unknown as RentalOffer;
    expect(textFactsStale(stored, { usdUyu, gcFromText: false })).toBe(false);
    expect(textFactsStale(stored, { usdUyu, gcFromText: true })).toBe(true);
    const updated = withTodaysTextFacts(stored, { usdUyu, gcFromText: true });
    expect(updated).toMatchObject({ commonExpenses: 5_500, commonExpensesCurrency: "UYU", commonExpensesSource: "description" });
    expect(textFactsStale(updated, { usdUyu, gcFromText: true })).toBe(false);
    // Turning the flag off takes the figure back on the next sweep; a portal's figure never moves.
    expect(textFactsStale(updated, { usdUyu, gcFromText: false })).toBe(true);
    expect(withTodaysTextFacts(updated, { usdUyu, gcFromText: false })).not.toHaveProperty("commonExpensesSource");
    expect(textFactsStale({ ...stored, commonExpenses: 4_000, commonExpensesCurrency: "UYU" }, { usdUyu, gcFromText: true })).toBe(false);
  });
});

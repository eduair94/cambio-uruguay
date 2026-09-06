import { describe, expect, it } from "vitest";
import { analyzeOpportunities, opportunityRisks } from "../../classes/propertyopportunities/analyze";
import type { OpportunityListing } from "../../classes/propertyopportunities/types";

const NOW = "2026-09-06T12:00:00.000Z";
const listing = (description: string, overrides: Partial<OpportunityListing> = {}): OpportunityListing => ({
  id: "sale:infocasas:123", operation: "sale", listingId: "infocasas:123", source: "infocasas",
  url: "https://www.infocasas.com.uy/apartamento/123", title: "Apartamento de 1 dormitorio", image: null,
  sellerName: "Inmobiliaria Uno", department: "Montevideo", locality: "Montevideo", neighborhood: "Cordón",
  propertyType: "apartamento", bedrooms: 1, bathrooms: 1, area: { value: 40, basis: "built" },
  price: { amount: 100000, currency: "USD" }, expenses: { amount: 3000, currency: "UYU" },
  lastSeen: NOW, publishedAt: null, description, parkingSpaces: null, furnished: null, ...overrides,
});

describe("own-source risk variants found in expanded comparison samples", () => {
  it.each(["[RESERVADO] CONSULTORIOS, OFICINAS, VIVIENDA", "VENDIDO - Apartamento", "Apartamento actualmente no disponible"])("excludes current advertised status: %s", title => {
    expect(opportunityRisks(listing("", { title }))).toContain("unavailable");
  });

  it("does not interpret reservation terms, other sold units or visit bookings as unavailability", () => {
    for (const description of ["Se reserva con 10% del precio.", "Vendidos otros apartamentos, esta unidad está disponible.", "Reservá tu visita.", "Salón reservado para uso común.", "Esta unidad no está vendida ni reservada."])
      expect(opportunityRisks(listing(description))).not.toContain("unavailable");
    expect(opportunityRisks(listing("Estado: reservado"))).toContain("unavailable");
  });

  it("excludes lead-generation examples without treating ordinary reference numbers as fake listings", () => {
    expect(opportunityRisks(listing("Esta publicación muestra una unidad de referencia por características. Un asesor acerca alternativas concretas."))).toContain("price_on_request");
    expect(opportunityRisks(listing("Referencia interna 36066. Esta unidad está disponible y tenemos llaves."))).not.toContain("price_on_request");
  });

  it.each([
    "Gastos comunes $ 3500\nAlquilado, atención inversores\nConsulte.",
    "Hoy se encuentra alquilado con contrato vencido.",
    "Alquilado con contrato vigente hasta 2028.",
    "La unidad está arrendada. Consulte condiciones del contrato.",
    "Cuenta con una renta activa de $18.500 y flujo constante de inquilinos.",
  ])("excludes explicitly occupied property: %s", description => {
    expect(opportunityRisks(listing(description))).toContain("occupied");
  });

  it.each([
    "No se encuentra alquilado con contrato. Está vacío.",
    "No está actualmente alquilado. Tenemos llaves.",
    "No se vende alquilado. Entrega sin inquilinos.",
    "Anteriormente alquilado con contrato, hoy vacío.",
    "Fue arrendado con contrato hasta 2020. Hoy vacío.",
    "Puede ser alquilado con contrato anual. Ideal para renta.",
    "Ideal para inversores. Renta estimada $ 25.000.",
    "No genera renta activa. Está vacío.",
    "Sin renta activa. Ideal para inversión.",
    "No cuenta con una renta activa, se encuentra vacío.",
  ])("preserves negated, historical and hypothetical tenancy: %s", description => {
    expect(opportunityRisks(listing(description))).not.toContain("occupied");
  });

  it.each([
    "Gastos de ocupación + Reglamento de copropiedad y plano de Mesura 4%",
    "Gastos de ocupación y conexiones: 4%.",
    "Gtos. de ocupación y conexiones 3,5%.",
    "Gastos de ocupación y conexiones no incluidos: 4%.",
    "Al precio publicado se debe agregar un 4% correspondiente a conexiones.",
    "El precio no incluye gastos de ocupación del 4,5% + 0,25% de fondo de reserva.",
    "+ GARAJE OPCIONAL U$S 20.000 + 4,5% GASTOS DE OCUPACIÓN.",
  ])("excludes own additional purchase costs with intervening labels: %s", description => {
    expect(opportunityRisks(listing(description))).toContain("extra_purchase_costs");
  });

  it.each([
    "Sin gastos de ocupación. Comisión 3% más IVA.",
    "No tiene gastos de ocupación y conexiones. Comisión 3% más IVA.",
    "Gastos de ocupación incluidos en el precio. Comisión 3% más IVA.",
    "Gastos de ocupación y conexiones incluidos en el precio, comisión inmobiliaria 3%.",
    "Gastos de ocupación y conexiones 4% incluidos en el precio.",
    "Gastos de ocupación y conexiones 4% a cargo del vendedor.",
    "Conexiones hechas a nuevo. Comisión inmobiliaria 3% más IVA.",
    "Al precio publicado se debe agregar un 3% correspondiente a comisión inmobiliaria.",
  ])("does not turn ordinary agency fees or included costs into exclusions: %s", description => {
    expect(opportunityRisks(listing(description))).not.toContain("extra_purchase_costs");
  });

  it("separates pending repairs from completed paintwork and preferences", () => {
    expect(opportunityRisks(listing("Está para hacer arreglos de revoque y pintura."))).toContain("needs_renovation");
    for (const description of ["Se hicieron arreglos de revoque y pintura.", "Recién pintado, pronto para entrar.", "Puede pintarse a gusto del comprador."])
      expect(opportunityRisks(listing(description))).not.toContain("needs_renovation");
  });

  it("excludes planned construction and explicitly priced connections without rejecting completed structures", () => {
    expect(opportunityRisks(listing("La estructura será de hormigón armado en su totalidad. Conexiones: 4%."))).toEqual(expect.arrayContaining(["project", "extra_purchase_costs"]));
    expect(opportunityRisks(listing("Estructura de hormigón armado. Conexiones: 4% incluidos en el precio."))).not.toContain("project");
    expect(opportunityRisks(listing("Conexiones: 4% incluidos en el precio."))).not.toContain("extra_purchase_costs");
    expect(opportunityRisks(listing("Conexiones 100% hechas, todo nuevo."))).not.toContain("extra_purchase_costs");
  });

  it("recognizes a future delivery month using the advert reading date, without labelling a past delivery as future", () => {
    expect(opportunityRisks(listing("Ocupación junio 2028. Si se puede, vemos la obra."))).toContain("project");
    expect(opportunityRisks(listing("Entrega en diciembre 2026."))).toContain("project");
    expect(opportunityRisks(listing("Entrega junio 2025, edificio ya terminado."))).not.toContain("project");
    expect(opportunityRisks(listing("Ocupación junio 2026, entrega inmediata."))).not.toContain("project");
  });

  it("excludes a dwelling currently configured as an office without rejecting optional home-office use", () => {
    expect(opportunityRisks(listing("Inmueble actualmente utilizado para oficina pero admite vivienda. Dos habitaciones tipo oficinas con paredes divisorias de madera."))).toContain("special_layout");
    expect(opportunityRisks(listing("Apartamento de 1 dormitorio. Admite uso como oficina o vivienda."))).not.toContain("special_layout");
    expect(opportunityRisks(listing("Dormitorio amplio y ambiente adicional actualmente utilizado como oficina."))).not.toContain("special_layout");
  });

  it("keeps an explicit multinivel loft's shared social and sleeping area outside ordinary bedroom comparisons", () => {
    expect(opportunityRisks(listing("Arquitectura multinivel estilo loft. Área Social y Dormitorio: bajando unos cómodos escalones se accede al ambiente principal."))).toContain("special_layout");
    expect(opportunityRisks(listing("Apartamento de estilo loft con dormitorio independiente y living separado."))).not.toContain("special_layout");
  });

  it("detects a private area that contradicts the reported built area without counting the balcony as interior", () => {
    expect(opportunityRisks(listing("59,35 m² privados + 8,35 m² de balcón.", { area: { value: 67.7, basis: "built" } }))).toContain("attribute_conflict");
    expect(opportunityRisks(listing("59,35 m² privados + 8,35 m² de balcón.", { area: { value: 59.35, basis: "built" } }))).not.toContain("attribute_conflict");
  });

  it("requires the own labelled price to agree within 1%, while retaining tolerance for approximate common expenses", () => {
    const rent = { operation: "rent" as const, id: "rent:infocasas:123", price: { amount: 36000, currency: "UYU" as const } };
    expect(opportunityRisks(listing("Alquiler: $38.000", rent))).toContain("attribute_conflict");
    expect(opportunityRisks(listing("Alquiler: $38.000.", rent))).toContain("attribute_conflict");
    expect(opportunityRisks(listing("Alquiler: $36.300. Gastos comunes aproximados $3.200.", rent))).not.toContain("attribute_conflict");
    expect(opportunityRisks(listing("Gastos comunes aproximados $3.400.", rent))).toContain("attribute_conflict");
  });

  it("does not count an optional paid rental garage as an included parking space", () => {
    expect(opportunityRisks(listing("Opción de alquilar garaje en el mismo edificio a $3.800.", { parkingSpaces: 1 }))).toContain("attribute_conflict");
    expect(opportunityRisks(listing("Garaje propio incluido en el precio.", { parkingSpaces: 1 }))).not.toContain("attribute_conflict");
  });

  it("compares a comfortable staircase with staircases, never with an elevator", () => {
    const subject = listing("Apartamento en tercer piso por cómoda escalera.");
    const peers = (access: string) => Array.from({ length: 8 }, (_, index) => listing(`Apartamento por ${access}.`, {
      id: `sale:infocasas:${200 + index}`, listingId: `infocasas:${200 + index}`,
      url: `https://www.infocasas.com.uy/apartamento/${200 + index}`, sellerName: `Agencia ${index}`,
      price: { amount: 150000, currency: "USD" },
    }));
    expect(analyzeOpportunities([subject, ...peers("ascensor")], { now: NOW, usdUyu: 41.5 }).items.some(item => item.subject.id === subject.id)).toBe(false);
    expect(analyzeOpportunities([subject, ...peers("escalera")], { now: NOW, usdUyu: 41.5 }).items.some(item => item.subject.id === subject.id)).toBe(true);
  });

  it.each(["piscina", "gimnasio"])("does not treat explicit absence of %s as missing information compatible with its presence", amenity => {
    const subject = listing(`El edificio no cuenta con ${amenity}.`);
    const peers = Array.from({ length: 8 }, (_, index) => listing(`Edificio con ${amenity}.`, {
      id: `sale:infocasas:${200 + index}`, listingId: `infocasas:${200 + index}`,
      url: `https://www.infocasas.com.uy/apartamento/${200 + index}`, sellerName: `Agencia ${index}`,
      price: { amount: 150000, currency: "USD" },
    }));
    expect(analyzeOpportunities([subject, ...peers], { now: NOW, usdUyu: 41.5 }).items.some(item => item.subject.id === subject.id)).toBe(false);
  });
});

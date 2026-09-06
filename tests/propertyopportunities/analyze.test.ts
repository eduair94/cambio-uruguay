import { describe, expect, it } from "vitest";
import { analyzeOpportunities, opportunityLocationConflict, opportunityRisks } from "../../classes/propertyopportunities/analyze";
import { rentalOpportunityListings } from "../../classes/propertyopportunities/rentalAdapter";
import type { OpportunityListing, OpportunityOperation } from "../../classes/propertyopportunities/types";
import type { RentalOffer, RentalProperty } from "../../classes/rentals/types";

const options = { now: "2026-09-06T12:00:00.000Z", usdUyu: 40 };

function listing(id: string, patch: Partial<OpportunityListing> = {}): OpportunityListing {
  const operation = patch.operation ?? "sale";
  const source = patch.source ?? "infocasas";
  return {
    id: `${operation}:${source}:${id}`, operation, source, listingId: id,
    url: `https://www.infocasas.com.uy/apartamento/${id}`, title: "Apartamento de 2 dormitorios y 1 baño",
    image: `https://cdn1.infocasas.com.uy/${id}.jpg`, sellerName: `Inmobiliaria ${id}`,
    department: "Montevideo", locality: "Montevideo", neighborhood: "Cordón", propertyType: "apartamento",
    bedrooms: 2, bathrooms: 1, area: { value: 50, basis: "built" },
    price: { amount: 100_000, currency: "USD" }, expenses: null,
    lastSeen: "2026-09-06", publishedAt: "2026-08-10", description: "",
    parkingSpaces: null, furnished: null, ...patch,
  };
}

function market(operation: OpportunityOperation = "sale", n = 12): OpportunityListing[] {
  const patch = operation === "rent"
    ? { operation, price: { amount: 30_000, currency: "UYU" as const }, expenses: { amount: 3_000, currency: "UYU" as const } }
    : { operation };
  return [
    listing("subject", { ...patch, price: { amount: operation === "rent" ? 20_000 : 80_000, currency: operation === "rent" ? "UYU" : "USD" } }),
    ...Array.from({ length: n }, (_, i) => listing(`peer-${i}`, patch)),
  ];
}
const subject = (rows: OpportunityListing[]) => analyzeOpportunities(rows, options).items.find(item => item.subject.listingId === "subject");

describe("local asking-price opportunities", () => {
  it("compares the subject against other adverts and publishes the actual bounded sample", () => {
    const rows = market();
    const before = JSON.stringify(rows);
    const result = analyzeOpportunities(rows, options);
    const item = result.items.find(item => item.subject.listingId === "subject")!;
    expect(item.analysis).toMatchObject({
      median: 100_000, q25: 100_000, q75: 100_000, gapPct: 20, conservativeGapPct: 20,
      distinctN: 12, sellersN: 12, currency: "USD", pricingBasis: "asking_price", confidence: "supported",
    });
    expect(item.comparables).toHaveLength(10);
    expect(item.comparables.every(peer => peer.listingId !== "subject" && peer.comparisonPrice === 100_000)).toBe(true);
    expect(item.cautions).toContain("asking_prices_only");
    expect(JSON.stringify(rows)).toBe(before);
    expect(result.stats.sale).toMatchObject({ input: 13, eligible: 13, qualified: 1, shortlisted: 1 });
  });

  it("is deterministic under input permutations", () => {
    const rows = market();
    expect(analyzeOpportunities([...rows].reverse(), options)).toEqual(analyzeOpportunities(rows, options));
  });

  it("keeps two evidence signals on one advert and handles exact threshold boundaries", () => {
    const result = analyzeOpportunities(market(), options);
    expect(result.algorithm).toBe("local-asking-comparables-v2");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.analysis).toMatchObject({ signals: ["total_price", "price_per_m2"], evidenceTier: "standard",
      comparisonScope: "same_features", perAreaMedian: 2000, perAreaQ25: 2000, perAreaQ75: 2000,
      sensitivity: { minimumGapPct: 20, minimumPerAreaGapPct: 20, omittedSellersN: 12 } });
  });

  it("requires three advertisers even for a small exploratory sample", () => {
    const rows = market("sale", 6);
    rows.slice(1).forEach((row, i) => row.sellerName = `Agency ${Math.floor(i / 2)}`);
    expect(subject(rows)?.analysis).toMatchObject({ distinctN: 6, sellersN: 3, evidenceTier: "exploratory" });
    rows.slice(1).forEach((row, i) => row.sellerName = `Agency ${i % 2}`);
    expect(subject(rows)).toBeUndefined();
  });

  it("rejects an exploratory advantage that vanishes when one advertiser is omitted", () => {
    const rows = market("sale", 5);
    rows[1]!.price.amount = 81_000; rows[2]!.price.amount = 81_000;
    rows[1]!.sellerName = rows[2]!.sellerName = "Lower advertiser";
    rows[3]!.sellerName = rows[4]!.sellerName = "Higher advertiser";
    expect(subject(rows)).toBeUndefined();
    rows[1]!.price.amount = 100_000; rows[2]!.price.amount = 100_000;
    expect(subject(rows)?.analysis.sensitivity?.omittedSellersN).toBe(3);
  });

  it("chooses an adequate physical cohort before price and never widens to obtain a larger discount", () => {
    const narrow = market("sale", 5); narrow.slice(1).forEach(row => row.price.amount = 81_000);
    const wider = Array.from({ length: 8 }, (_, i) => listing(`wider-${i}`, { area: { value: 60, basis: "built" }, price: { amount: 130_000, currency: "USD" } }));
    expect(subject([...narrow, ...wider])).toBeUndefined();
    const item = subject([narrow[0]!, ...wider])!;
    expect(item.analysis).toMatchObject({ evidenceTier: "exploratory", comparisonScope: "wider_area", areaTolerancePct: 25, signals: ["price_per_m2"] });
    expect(item.comparables.every(peer => peer.listingId.startsWith("wider-"))).toBe(true);
  });

  it("does not combine operations, currencies, area bases or different localities", () => {
    for (const change of [
      { operation: "rent" as const, price: { amount: 30_000, currency: "UYU" as const }, expenses: { amount: 0, currency: "UYU" as const } },
      { locality: "Las Piedras" }, { neighborhood: "Centro" }, { propertyType: "casa" as const },
      { bedrooms: 3 }, { bathrooms: 2 }, { area: { value: 50, basis: "total" as const } },
    ]) {
      const rows = market();
      rows.slice(1).forEach(row => Object.assign(row, change));
      expect(subject(rows)).toBeUndefined();
    }
  });

  it("abstains with missing locality or an unlabelled area, including a house's total plot size", () => {
    for (const patch of [
      { locality: "" }, { area: { value: 50, basis: "reported" as const } },
      { propertyType: "casa" as const, area: { value: 50, basis: "total" as const } },
    ]) {
      const rows = market(); Object.assign(rows[0]!, patch);
      expect(subject(rows)).toBeUndefined();
    }
  });

  it("requires five independent recent comparables and keeps fewer than eight exploratory", () => {
    expect(subject(market("sale", 4))).toBeUndefined();
    expect(subject(market("sale", 7))?.analysis.evidenceTier).toBe("exploratory");
    expect(subject(market("sale", 8))?.analysis.confidence).toBe("limited");
    const rows = market();
    rows.slice(1).forEach(row => row.lastSeen = "2026-09-02");
    expect(subject(rows)).toBeUndefined();
    rows.slice(1).forEach(row => row.lastSeen = "2026-09-03");
    expect(subject(rows)).toBeDefined();
    rows[0]!.lastSeen = "2026-09-07";
    expect(subject(rows)).toBeUndefined();
  });

  it("does not treat one agency or syndicated repeated photos as independent market evidence", () => {
    const agency = market(); agency.slice(1).forEach(row => row.sellerName = "Una inmobiliaria");
    expect(subject(agency)).toBeUndefined();
    const copies = market(); copies.slice(1).forEach(row => row.image = "https://cdn1.infocasas.com.uy/same.jpg");
    const originalIds = copies.map(row => row.id);
    expect(subject(copies)).toBeUndefined();
    expect(copies.map(row => row.id)).toEqual(originalIds);
    const addressCopies = market(); addressCopies.slice(1).forEach(row => row.address = "La misma calle 123");
    expect(subject(addressCopies)).toBeUndefined();
  });

  it("does not use possible copies of the subject or duplicate owner keys as its comparables", () => {
    const rows = market();
    rows.slice(1).forEach(row => row.propertyKey = "same-canonical-key");
    rows[0]!.propertyKey = "same-canonical-key";
    expect(subject(rows)).toBeUndefined();
  });

  it("counts identical long advert descriptions only once for the sample and the shortlist", () => {
    const rows = market();
    const own = "Living comedor con estufa a leña, cocina definida y patio de uso exclusivo. ".repeat(6);
    rows[0]!.description = own;
    rows.push(listing("subject-copy", { description: own, price: { amount: 80_000, currency: "USD" } }));
    const out = analyzeOpportunities(rows, options);
    expect(out.items).toHaveLength(1);
    expect(out.items[0]!.analysis.distinctN).toBe(12);
    expect(out.stats.sale.excluded.suspected_copy).toBe(1);
    rows.slice(1).forEach(row => row.description = own);
    expect(subject(rows)).toBeUndefined();
  });

  it("counts duplicate source IDs once and abstains on contradictory versions", () => {
    const rows = market();
    const result = analyzeOpportunities([...rows, ...rows.slice(1)], options);
    expect(result.items[0]!.analysis.distinctN).toBe(12);
    expect(result.stats.sale.excluded.duplicate_id).toBe(12);
    expect(subject([...rows, { ...rows[0]!, price: { amount: 500, currency: "USD" } }])).toBeUndefined();
  });

  it("uses one conversion rate and each rental advert's own known expenses", () => {
    const rows = market("rent");
    rows[1]!.price = { amount: 750, currency: "USD" };
    rows[1]!.expenses = { amount: 75, currency: "USD" };
    const item = subject(rows)!;
    expect(item.subject.comparisonPrice).toBe(23_000);
    expect(item.analysis).toMatchObject({ median: 33_000, currency: "UYU", pricingBasis: "monthly_total" });
    rows[0]!.expenses = null;
    expect(subject(rows)).toBeUndefined();
    rows[0]!.expenses = { amount: 0, currency: "UYU" };
    expect(subject(rows)).toBeDefined();
  });

  it("does not advertise a cheap base rent with expensive common expenses as an opportunity", () => {
    const rows = market("rent"); rows[0]!.expenses = { amount: 15_000, currency: "UYU" };
    expect(subject(rows)).toBeUndefined();
    rows[0]!.price = { amount: 30_000, currency: "UYU" };
    rows[0]!.expenses = { amount: 0, currency: "UYU" };
    rows.slice(1).forEach(row => row.expenses = { amount: 15_000, currency: "UYU" });
    expect(subject(rows)).toBeUndefined();
  });

  it("keeps a modest per-area advantage exploratory and rejects smaller units with worse unit prices", () => {
    const rows = market();
    rows[0]!.area = { value: 44, basis: "built" }; rows[0]!.price.amount = 82_000;
    expect(subject(rows)?.analysis).toMatchObject({ evidenceTier: "exploratory", signals: ["total_price"] });
    rows[0]!.price.amount = 90_000;
    expect(subject(rows)).toBeUndefined();
  });

  it("requires a discount against the lower quartile and rejects extreme discounts and dispersed samples", () => {
    const rows = market(); rows[0]!.price.amount = 83_000;
    rows.slice(1, 5).forEach(row => row.price.amount = 85_000);
    expect(subject(rows)?.analysis.evidenceTier).toBe("exploratory");
    rows[0]!.price.amount = 86_000;
    expect(subject(rows)).toBeUndefined();
    const extreme = market(); extreme[0]!.price.amount = 40_000;
    expect(analyzeOpportunities(extreme, options).stats.sale.excluded.extreme_discount).toBe(1);
    const dispersed = market(); dispersed.slice(1, 7).forEach(row => row.price.amount = 55_000);
    expect(subject(dispersed)).toBeUndefined();
  });

  it("keeps parking and new condition exact, and labels furnishing differences in local references", () => {
    for (const patch of [{ parkingSpaces: 1 }, { description: "A estrenar" }]) {
      const rows = market(); Object.assign(rows[0]!, patch);
      expect(subject(rows)).toBeUndefined();
    }
    const rows = market(); rows[0]!.furnished = true;
    expect(subject(rows)?.analysis).toMatchObject({ evidenceTier: "exploratory", comparisonScope: "local_context" });
    expect(subject(rows)?.comparables[0]!.differences.featureDifferences).toEqual([{ feature: "furnishing", subject: "furnished", comparable: "unknown" }]);
  });

  it("does not compare houses with materially different known plot sizes", () => {
    const rows = market();
    rows.forEach(row => { row.propertyType = "casa"; row.title = "Casa de 2 dormitorios y 1 baño"; row.landArea = 2_000; });
    rows[0]!.landArea = 200;
    expect(subject(rows)).toBeUndefined();
  });

  it("excludes contradictions from the comparison sample as well as the subject", () => {
    const rows = market(); rows[0]!.description = "Tiene 3 dormitorios";
    expect(subject(rows)).toBeUndefined();
    const peers = market(); peers.slice(1).forEach(row => row.description = "Tiene 3 dormitorios");
    expect(subject(peers)).toBeUndefined();
  });

  it("abstains when own private/interior area materially disagrees with the built field", () => {
    const row = listing("x", { area: { value: 60, basis: "built" }, description: "Cuenta con 45m2 propios distribuidos en living comedor y 2 dormitorios" });
    expect(opportunityRisks(row)).toContain("attribute_conflict");
    row.description = "60m² cubiertos y terraza de 15m² cubiertos";
    expect(opportunityRisks(row)).toEqual([]);
    row.description = "90m² totales, 60m² interiores y 30m² de terraza";
    expect(opportunityRisks(row)).toEqual([]);
    row.description = "59m² construidos";
    expect(opportunityRisks(row)).toEqual([]);
  });

  it("flags an isolated dwelling size heading without confusing balconies, total area or distances", () => {
    const row = listing("x", { area: { value: 52, basis: "built" }, description: "CARACTERÍSTICAS: 40 mtrs\nPiso 7 con doble ascensor" });
    expect(opportunityRisks(row)).toContain("attribute_conflict");
    for (const description of ["CARACTERÍSTICAS: patio de 40m²", "Superficie: 40m² de garaje", "Superficie: 60m² totales", "A 40 metros de la rambla", "Superficie: 51m²"])
      expect(opportunityRisks({ ...row, description })).not.toContain("attribute_conflict");
  });

  it("uses strict own exact expenses but preserves explicit estimates and published ranges", () => {
    const row = listing("x", { operation: "rent", price: { amount: 32_000, currency: "UYU" }, expenses: { amount: 3570, currency: "UYU" }, description: "Gastos comunes $ 3750" });
    expect(opportunityRisks(row)).toContain("attribute_conflict");
    for (const description of ["Gastos comunes aproximados $3750", "Gastos comunes $3750 (aprox.)", "Gastos comunes $3750 variables"])
      expect(opportunityRisks({ ...row, description })).not.toContain("attribute_conflict");
    expect(opportunityRisks({ ...row, description: "Gastos comunes $5000 aproximados" })).toContain("attribute_conflict");
    const range = { ...row, expenses: { amount: 5000, currency: "UYU" as const }, description: "Gastos comunes: $4.500 – $5.000 aprox." };
    expect(opportunityRisks(range)).not.toContain("attribute_conflict");
    expect(opportunityRisks({ ...range, expenses: { amount: 4700, currency: "UYU" }, description: "GC $4500 a $5000" })).not.toContain("attribute_conflict");
    expect(opportunityRisks({ ...range, expenses: { amount: 6000, currency: "UYU" } })).toContain("attribute_conflict");
  });

  it("does not mistake a building facility's floor for the apartment's floor", () => {
    const rows = market();
    rows[0]!.description = "Apartamento de 2 dormitorios en el primer piso. Gimnasio en planta baja y barbacoa en quinto piso.";
    expect(opportunityRisks(rows[0]!)).toEqual([]);
    rows.slice(1).forEach(row => row.amenities = ["Gimnasio"]);
    expect(subject(rows)).toBeDefined();
  });

  it.each([
    ["Precio de la cuota: USD 400", "partial_price"], ["Entrega inicial 60%", "partial_price"],
    ["Desde USD 80000", "partial_price"], ["Vivienda con renta", "occupied"],
    ["Casa a reciclar", "needs_renovation"], ["Se venden derechos posesorios", "restricted_rights"],
    ["Cooperativa de vivienda", "restricted_rights"], ["Apartamento en pozo", "project"],
    ["Dos casas independientes", "multiple_units"], ["Garaje se vende por separado", "extra_purchase_costs"],
    ["Cesión de alquiler", "restricted_rights"],
    ["Alquiler por temporada", "temporary"], ["Precio a consultar", "price_on_request"],
  ] as const)("excludes explicit own-source risk: %s", (description, risk) => {
    expect(opportunityRisks(listing("x", { description }))).toContain(risk);
    const rows = market(); rows[0]!.description = description;
    expect(subject(rows)).toBeUndefined();
  });

  it("does not mistake normal full-price financing, already renovated property or investment copy for a risk", () => {
    expect(opportunityRisks(listing("x", {
      description: "Acepta banco. Apartamento totalmente reciclado, ideal para renta. Desde sus ventanas se ve la plaza. Sin ocupantes.",
    }))).toEqual([]);
  });

  it("honors explicit negations without confusing investment copy with an occupied sale", () => {
    expect(opportunityRisks(listing("x", {
      description: "No está ocupado. No se encuentra alquilado. Sin inquilinos. No necesita arreglos. No requiere reforma.",
    }))).toEqual([]);
    expect(opportunityRisks(listing("x", { description: "La vivienda ocupada por inquilinos se vende con renta." }))).toContain("occupied");
  });

  it.each([
    "La ocupación será en junio de 2027", "La ocupación está fijada para noviembre 2028",
    "Arcadia II, nuevo proyecto. El dormitorio contará con placard.",
    "La construcción de los edificios presentados será de construcción tradicional.",
    "35% al contado y 65% financiado hasta finalizar la obra.",
  ])("recognizes explicitly future project delivery: %s", description => {
    expect(opportunityRisks(listing("x", { description }))).toContain("project");
  });

  it.each(["Gtos. ocupación: 3%", "Precio de venta USD 100000 + GASTOS DE OCUPACIÓN"])("excludes explicit additional occupation costs: %s", description => {
    expect(opportunityRisks(listing("x", { description }))).toContain("extra_purchase_costs");
  });

  it("does not infer future delivery or additional fees from negated or past statements", () => {
    expect(opportunityRisks(listing("x", { description: "La construcción se finalizó en 2020. Sin gastos de ocupación." }))).toEqual([]);
  });

  it("excludes the real GC-zero versus own description 2500 disagreement without overwriting it", () => {
    const rows = market("rent");
    rows[0]!.expenses = { amount: 0, currency: "UYU" };
    rows[0]!.description = "Gastos comunes $ 2.500 (variables).";
    expect(opportunityRisks(rows[0]!)).toContain("attribute_conflict");
    expect(subject(rows)).toBeUndefined();
    expect(rows[0]!.expenses!.amount).toBe(0);
    rows[0]!.expenses!.amount = 2300;
    rows[0]!.description = "GASTOS COMUNES: $0";
    expect(opportunityRisks(rows[0]!)).toContain("attribute_conflict");
  });

  it("understands explicit expense thousands in both source conventions", () => {
    for (const own of ["Gastos comunes $1.100", "GASTOS COMUNES $1,100", "Gastos comunes son de aproximadamente $1.100"])
      expect(opportunityRisks(listing("x", { expenses: { amount: 1100, currency: "UYU" }, description: own }))).toEqual([]);
  });

  it("rejects a materially different explicitly labelled own asking price without confusing another operation", () => {
    const row = listing("x", { price: { amount: 80_000, currency: "USD" }, description: "Precio de venta: U$D 110.000" });
    expect(opportunityRisks(row)).toContain("attribute_conflict");
    row.description = "Precio de venta: U$D 80.000. Alquiler: $20.000";
    expect(opportunityRisks(row)).toEqual([]);
  });

  it("vetoes the real Belvedere title incorrectly classified as Centro without relocating it", () => {
    const raw = listing("x", { neighborhood: "Centro", title: "Alquiler BELVEDERE Apto 2 dormitorios" });
    expect(opportunityLocationConflict(raw, ["centro", "belvedere"])).toBe(true);
    expect(raw.neighborhood).toBe("Centro");
    expect(opportunityLocationConflict(listing("x", { neighborhood: "Pocitos Nuevo", title: "En Pocitos Nuevo" }), ["pocitos", "pocitos nuevo"])).toBe(false);
    expect(opportunityLocationConflict(listing("x", { neighborhood: "Pocitos", title: "En Pocitos Nuevo" }), ["pocitos", "pocitos nuevo"])).toBe(true);
    const description = listing("x", { neighborhood: "Centro", title: "Apartamento Alquiler Centro Montevideo", description: "Alquiler de Apartamento 1 Dormitorio en Ciudad Vieja, Montevideo" });
    expect(opportunityLocationConflict(description, ["centro", "ciudad vieja"])).toBe(true);
    expect(opportunityLocationConflict({ ...description, description: "Apartamento en Centro, cerca de Ciudad Vieja" }, ["centro", "ciudad vieja"])).toBe(false);
  });

  it("excludes explicitly blind bedrooms and shared-patio layouts from the initial shortlist", () => {
    expect(opportunityRisks(listing("x", { description: "1 Dormitorio (Es Ciego, NO Tiene Ventanas)" }))).toContain("special_layout");
    expect(opportunityRisks(listing("x", { description: "Acceso por Patio Común" }))).toContain("special_layout");
    expect(opportunityRisks(listing("x", { description: "Apartamento Duplex por ingreso compartido" }))).toContain("special_layout");
    expect(opportunityRisks(listing("x", { description: "Actualmente equipado para escritorio. Apto vivienda." }))).toContain("special_layout");
    expect(opportunityRisks(listing("x", { description: "Apto para vivienda u oficina" }))).toEqual([]);
  });

  it("compares stairs only with stairs, rather than presuming unknown units have equal access", () => {
    const rows = market(); rows[0]!.description = "Primer piso por escalera";
    expect(subject(rows)).toBeUndefined();
    rows.slice(1).forEach(row => row.description = "Segundo piso x escalera");
    expect(subject(rows)).toBeDefined();
    rows.slice(1).forEach(row => { row.description = ""; row.amenities = ["Ascensor"]; });
    expect(subject(rows)).toBeUndefined();
    for (const description of ["Edificio con dos ascensores", "Edificio con ascensor"]) {
      rows[0]!.description = description;
      expect(subject(rows)).toBeDefined();
    }
  });

  it("keeps aspect exact and explicitly separates the furnishing/pool local context", () => {
    for (const description of ["Apartamento interior", "Apto interior", "Disposición interna", "Contrafrente", "Muy luminoso al frente", "Se alquila amueblado", "Piscina"])
    {
      const rows = market(); rows[0]!.description = description;
      if (["Se alquila amueblado", "Piscina"].includes(description))
        expect(subject(rows)?.analysis.comparisonScope).toBe("local_context");
      else expect(subject(rows)).toBeUndefined();
      rows.slice(1).forEach(row => row.description = description);
      expect(subject(rows)).toBeDefined();
    }
  });

  it("does not treat kitchen cupboards as a furnished home", () => {
    const rows = market(); rows[0]!.description = "Cocina con muebles bajo mesada y aéreo";
    expect(subject(rows)).toBeDefined();
    rows.slice(1).forEach(row => row.description = "Apartamento amueblado");
    expect(subject(rows)?.analysis.comparisonScope).toBe("local_context");
    expect(subject(rows)?.comparables[0]!.differences.featureDifferences).toEqual([{ feature: "furnishing", subject: "unknown", comparable: "furnished" }]);
  });

  it("does not compare a known ground-floor unit or shared gym against unknown facilities", () => {
    for (const description of ["Apartamento en planta baja", "Apartamento 2 Dormitorios\nPlanta Baja", "Apartamento tipo casita en planta baja interno", "Apto Estrenar", "Edificio con gimnasio"]) {
      const rows = market(); rows[0]!.description = description;
      if (description === "Edificio con gimnasio") expect(subject(rows)?.analysis.comparisonScope).toBe("local_context");
      else expect(subject(rows)).toBeUndefined();
      rows.slice(1).forEach(row => row.description = description);
      expect(subject(rows)).toBeDefined();
    }
  });

  it("excludes a parking-included attribute when the advert explicitly charges for an optional garage", () => {
    expect(opportunityRisks(listing("x", { parkingSpaces: 1, description: "OPCIÓN DE COCHERA - $5.000 adicionales" }))).toContain("attribute_conflict");
  });

  it("requires a source-qualified ID and the real source's host, and drops unapproved image hosts", () => {
    for (const url of ["https://evil.test/apartment", "https://www.infocasas.com.uy.evil.test/a", "https://127.0.0.1/a", "javascript:alert(1)"]) {
      const rows = market(); rows[0]!.url = url;
      expect(subject(rows)).toBeUndefined();
    }
    const mismatch = market(); mismatch[0]!.id = "sale:elpais:subject";
    expect(subject(mismatch)).toBeUndefined();
    const image = market(); image[0]!.image = "https://evil.test/track.jpg";
    expect(subject(image)!.subject.image).toBeNull();
  });

  it("honors a source's structured project flag even if its prose is silent", () => {
    expect(opportunityRisks(listing("x", { riskFlags: ["project"] }))).toContain("project");
  });

  it("publishes no private evidence or unrecognized injected fields", () => {
    const rows = market();
    rows[0]!.description = "Texto privado sin riesgos";
    rows[0]!.address = "Dirección privada 123";
    Object.assign(rows[0]!, { identity: { secret: "private" }, secret: "private" });
    Object.assign(rows[0]!.area!, { internalAddress: "private nested address" });
    const item = subject(rows)!;
    const json = JSON.stringify(item);
    expect(json).not.toContain("Dirección privada"); expect(json).not.toContain("Texto privado");
    expect(json).not.toContain("identity"); expect(json).not.toContain("secret");
    expect(Object.keys(item.subject)).not.toContain("description");
    expect(item.subject.area).toEqual({ value: 50, basis: "built" });
  });

  it("validates the snapshot clock/rate and distinguishes qualified results from the output cap", () => {
    expect(() => analyzeOpportunities(market(), { ...options, usdUyu: 0 })).toThrow();
    expect(() => analyzeOpportunities(market(), { ...options, now: "not a date" })).toThrow();
    const result = analyzeOpportunities(market(), { ...options, maxItemsPerOperation: 0 });
    expect(result.items).toEqual([]); expect(result.stats.sale.qualified).toBe(1);
    expect(result.stats.sale.shortlisted).toBe(0);
  });
});

describe("rental evidence adapter", () => {
  it("never borrows the canonical property's facts or a different offer's expenses", () => {
    const own = {
      version: 1, department: "Montevideo", neighborhood: "Cordón", propertyType: "apartamento",
      bedrooms: 2, bathrooms: 1, area: 90, address: "Oculta 123", addressHidden: true,
      description: "Texto propio", street: "oculta", streetNumber: "123", latitude: null, longitude: null,
    };
    const offer = {
      source: "infocasas", listingId: "infocasas:123", title: "Propio", url: "https://www.infocasas.com.uy/123",
      identity: own, details: { builtArea: 50, totalArea: 90 }, price: 25_000, currency: "UYU",
      commonExpenses: null, commonExpensesCurrency: null, lastSeen: "2026-09-06", publishedAt: null,
      image: null, parkingSpaces: null, furnished: null,
    } as RentalOffer;
    const property = { key: "canonical", offers: [offer, { ...offer, listingId: "legacy", identity: undefined }] } as RentalProperty;
    const result = rentalOpportunityListings([property]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "rent:infocasas:123", area: { value: 50, basis: "built" }, expenses: null, description: "Texto propio" });
    expect(result[0]!.address).toBeUndefined();
    const zero = { ...offer, commonExpenses: 0, commonExpensesCurrency: "UYU" as const };
    expect(rentalOpportunityListings([{ key: "x", offers: [zero] }])[0]!.expenses).toBeNull();
    for (const description of ["Sin gastos comunes", "Gastos comunes: $0", "GC = 0"]) {
      const explicit = { ...zero, identity: { ...zero.identity!, description } };
      expect(rentalOpportunityListings([{ key: "x", offers: [explicit] }])[0]!.expenses).toEqual({ amount: 0, currency: "UYU" });
    }
    const conflicting = { ...offer, details: { ...offer.details, totalArea: 32 } };
    expect(rentalOpportunityListings([{ key: "x", offers: [conflicting] }])[0]!.riskFlags).toContain("attribute_conflict");
    const interior = { ...offer, identity: { ...offer.identity!, department: "Canelones", neighborhood: "Centro" } };
    expect(rentalOpportunityListings([{ key: "x", offers: [interior] }])[0]!.locality).toBe("");
  });
});

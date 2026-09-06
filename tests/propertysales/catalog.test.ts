import { describe, expect, it } from "vitest";
import { buildSaleCatalog, mergeSaleCatalogInputs, publicSaleListing, saleOpportunityInputs } from "../../classes/propertysales/project";
import { casaswebHarvestRefusal, saleCatalogRefusal } from "../../classes/propertysales/store";
import type { OpportunityListing } from "../../classes/propertyopportunities/types";

const NOW = "2026-09-06T12:00:00.000Z";
const base = (overrides: Partial<OpportunityListing> = {}): OpportunityListing => ({
  id: "sale:infocasas:123", operation: "sale", source: "infocasas", listingId: "infocasas:123",
  url: "https://www.infocasas.com.uy/venta-apartamento/123", title: "Apartamento de 2 dormitorios", description: "Segundo piso luminoso.",
  image: "https://cdn1.infocasas.com.uy/apto.jpg", sellerName: "Agencia Uno", department: "Montevideo", locality: "Montevideo", neighborhood: "Cordón",
  propertyType: "apartamento", bedrooms: 2, bathrooms: 1, parkingSpaces: null, furnished: null,
  price: { amount: 120000, currency: "USD" }, expenses: null, area: { value: 55, basis: "built" },
  lastSeen: NOW, publishedAt: "2026-09-01", saleDetailReadAt: NOW, ...overrides,
});

describe("separate public sale catalogue", () => {
  it("also excludes directory data conflicts from opportunity subjects and comparable inputs, retaining private identity for valid rows", () => {
    const bad = ["Precio 90000 + cuotas", "Consta 5 casas con luz y agua potable", "Tiene 4 dormitorios todos en suite", "ENTREGA MAS SALDO CON MINISTERIO DE VIVIENDA", "USD 78.000 + Saldo ANV", "Oportunidad única de adquirir un terreno con mejoras. Construcción tradicional iniciada."];
    const rejected = bad.map(description => ({ listing: base({ description, bedrooms: 4, bathrooms: 3, title: "Casa", propertyType: "casa" }) }));
    const valid = { listing: base({ address: "Private own-identity evidence", expenses: { amount: 0, currency: "UYU" } }) };
    const rows = saleOpportunityInputs([...rejected, valid], NOW, 41.5);
    expect(rows).toHaveLength(1); expect(rows[0]?.address).toBe("Private own-identity evidence"); expect(rows[0]?.expenses).toBeNull();
    expect(valid.listing.expenses).toEqual({ amount: 0, currency: "UYU" });
  });
  it("retains absent source IDs and legacy firstSeen, but withdraws positively identified unavailable adverts", () => {
    const older = base({ lastSeen: "2026-09-01T12:00:00Z" });
    const unseen = base({ id: "sale:infocasas:124", listingId: "infocasas:124" });
    const fresh = base({ id: "sale:infocasas:125", listingId: "infocasas:125" });
    const merged = mergeSaleCatalogInputs([{ listing: older, firstSeen: null }, { listing: unseen, firstSeen: "2026-08-30" }], [base(), fresh]);
    expect(merged.find(row => row.listing.id === older.id)?.firstSeen).toBeNull();
    expect(merged.find(row => row.listing.id === fresh.id)?.firstSeen).toBe(NOW);
    expect(merged.some(row => row.listing.id === unseen.id)).toBe(true);
    expect(mergeSaleCatalogInputs(merged, [], [unseen.id]).some(row => row.listing.id === unseen.id)).toBe(false);
    expect(mergeSaleCatalogInputs(merged, [older]).find(row => row.listing.id === older.id)?.listing.lastSeen).toBe(NOW);
  });
  it("preserves each source advert, explicit missing fields and original dates", () => {
    const row = publicSaleListing({ listing: base(), firstSeen: "2026-09-03T10:01:00Z" }, NOW)!;
    expect(row).toMatchObject({ key: "infocasas-123", id: "sale:infocasas:123", lastSeen: NOW, firstSeen: "2026-09-03T10:01:00.000Z", publishedAt: "2026-09-01", expenses: null, parkingSpaces: null, geo: null });
    expect(row.areas).toEqual({ built: 55, total: null, land: null, terrace: null, reported: null });
  });
  it("does not deduplicate physically similar titles, photos, prices or units", () => {
    const rows = [base(), base({ id: "sale:infocasas:124", listingId: "infocasas:124", url: "https://www.infocasas.com.uy/otro/124" })];
    expect(buildSaleCatalog(rows.map(listing => ({ listing })), NOW, 41.5).listings.map(row => row.key)).toEqual(["infocasas-123", "infocasas-124"]);
  });
  it("projects safe fields and strips markup, contact details, query secrets and unrelated media hosts", () => {
    const listing = Object.assign(base({
      title: "Apartamento <script>bad()</script> 099 123 456", description: "Tiene jardín. <img src=x onerror=bad()> Contacto mail@agency.uy / +598 99 123 456",
      sellerName: "Agencia 099 123 456", url: "https://www.infocasas.com.uy/casa/123?token=private#private",
      images: ["https://evil.example/track?secret=private", "http://127.0.0.1/private", "https://cdn2.infocasas.com.uy/interior.jpg"],
      address: "Una dirección privada", geo: { lat: -34.9, lng: -56.2, precision: "approximate", secret: "private" } as any,
    }), { phone: "private", contact: "private", identity: { private: true } });
    const row = publicSaleListing({ listing }, NOW)!;
    expect(JSON.stringify(row)).not.toMatch(/private|bad\(\)|099|mail@|598|127\.0|evil|identity|address|onerror/);
    expect(row.images).toHaveLength(2);
    expect(row.geo).toEqual({ lat: -34.9, lng: -56.2, precision: "approximate" });
    expect(row.description).toContain("Tiene jardín");
  });
  it("removes named contact lines while retaining the property's descriptive facts and public agency name", () => {
    const row = publicSaleListing({ listing: base({ description: "Contacto: Persona Privada\nCorredor Responsable: Otra Persona\nAmplio living con balcón.\nAGENTE INMOBILIARIO: Nombre Particular" }) }, NOW)!;
    expect(row.description).toBe("Amplio living con balcón.");
    expect(row.sellerName).toBe("Agencia Uno");
  });
  it.each(["javascript:alert(1)", "https://evil.example/casa/123", "https://www.infocasas.com.uy/casa/124", "https://secret@www.infocasas.com.uy/casa/123"])("rejects an invalid source link %s", url => {
    expect(publicSaleListing({ listing: base({ url }) }, NOW)).toBeNull();
  });
  it("does not renew old reads, invent firstSeen or pretend publication is import time", () => {
    expect(publicSaleListing({ listing: base({ lastSeen: "2026-08-16T11:59:59Z" }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ lastSeen: "2026-09-07T00:00:00Z" }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ publishedAt: "2026-02-31" }), firstSeen: "2026-09-07" }, NOW)).toMatchObject({ firstSeen: null, publishedAt: null });
    expect(publicSaleListing({ listing: base({ lastSeen: "2026-08-16T12:00:00Z" }) }, NOW)).not.toBeNull();
  });
  it("does not convert a house's reported plot into a built area", () => {
    const row = publicSaleListing({ listing: base({ title: "Casa de 2 dormitorios", propertyType: "casa", area: { value: 500, basis: "reported" }, landArea: 500 }) }, NOW)!;
    expect(row.areas).toEqual({ built: null, total: null, land: 500, terrace: null, reported: 500 });
  });
  it("keeps useful purchase conditions visible instead of excluding all projects or occupied homes", () => {
    for (const [description, condition] of [
      ["En construcción, entrega prevista en 2028.", "project"], ["Actualmente alquilado.", "occupied"],
      ["Apartamento para reciclar.", "needs_renovation"], ["Gastos de ocupación: 4%", "extra_purchase_costs"],
      ["Acceso por patio común.", "special_layout"],
    ]) expect(publicSaleListing({ listing: base({ description }) }, NOW)?.conditions).toContain(condition);
  });
  it("does not mistake default zero monthly expenses for proof, or occupation fees for monthly expenses", () => {
    const withZero = base({ expenses: { amount: 0, currency: "UYU" }, description: "Gastos de ocupación exonerados." });
    expect(publicSaleListing({ listing: withZero }, NOW)?.expenses).toBeNull();
    expect(publicSaleListing({ listing: { ...withZero, description: "Sin gastos comunes." } }, NOW)?.expenses).toEqual({ amount: 0, currency: "UYU" });
    expect(publicSaleListing({ listing: { ...withZero, description: "Gastos comunes: 0" } }, NOW)?.expenses).toEqual({ amount: 0, currency: "UYU" });
  });
  it("withholds an unusually large uncorroborated monthly expense and a UI-based price with no verified conversion", () => {
    expect(publicSaleListing({ listing: base({ expenses: { amount: 13200, currency: "USD" } }) }, NOW)?.expenses).toBeNull();
    expect(publicSaleListing({ listing: base({ description: "El precio de la vivienda es de 660.000 UI" }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ bedrooms: 5, bathrooms: 4, title: "Casa", propertyType: "casa", description: "Cuenta con 5 dormitorios en suite." }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ bedrooms: 6, bathrooms: 3, title: "Casa", propertyType: "casa", description: "Tiene 6 habitaciones, 5 de ellas en suite." }) }, NOW)).toBeNull();
  });
  it.each(["Test Infocasas- NO CONTACTAR", "Este es un inmueble de prueba del portal Infocasas.com.uy"])("withholds an explicit publisher test advert: %s", description => {
    expect(publicSaleListing({ listing: base({ description }) }, NOW)).toBeNull();
  });
  it.each(["Campo de 663 Ha", "Terreno en venta Melo", "Venta de terreno", "Chacra en Canelones"])("withholds non-housing that was misclassified by the source: %s", title => {
    expect(publicSaleListing({ listing: base({ title }) }, NOW)).toBeNull();
  });
  it("keeps a house with a garden and withholds incomplete prices with remaining public housing debt", () => {
    expect(publicSaleListing({ listing: base({ title: "Casa con terreno", propertyType: "casa" }) }, NOW)).not.toBeNull();
    expect(publicSaleListing({ listing: base({ description: "Tiene saldo a ANV." }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ description: "Saldo de banco Bhu cuota de $27000." }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ description: "Tiene saldo al MVOTMA de 2000 UR." }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ description: "Se trata de derechos sucesorios." }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ description: "Precio USD 5000 por hectárea." }) }, NOW)).toBeNull();
  });
  it("shows optional parking as an additional choice and removes the included-parking count", () => {
    const row = publicSaleListing({ listing: base({ description: "Cochera opcional.", parkingSpaces: 1 }) }, NOW)!;
    expect(row.parkingSpaces).toBeNull(); expect(row.conditions).toContain("optional_parking");
  });
  it.each(["Reservado", "Vendido", "Entrega inicial de USD 20000 y 60 cuotas", "Se vende nuda propiedad"])("excludes non-available/partial purchase claims: %s", description => {
    expect(publicSaleListing({ listing: base({ title: description, description }) }, NOW)).toBeNull();
  });
  it("rejects contradictions between declared areas and source money", () => {
    expect(publicSaleListing({ listing: base({ areas: { built: 80, total: 55, land: null, terrace: null, reported: null } }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ description: "Precio de venta USD 150000" }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ description: "Su precio, de USD 119.000", price: { amount: 115000, currency: "USD" } }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ description: "Precio 90000 + cuotas", price: { amount: 90000, currency: "USD" } }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ title: "Casa de cuatro dormitorios", bedrooms: 4, bathrooms: 3,
      description: "La casa dispone de 4 dormitorios en suite, cada uno con baño privado.", propertyType: "casa" }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ title: "Casa de cuatro dormitorios", bedrooms: 4, bathrooms: 3,
      description: "4 dormitorios todos en suite.", propertyType: "casa" }) }, NOW)).toBeNull();
  });
  it("withholds token prices and uses the supplied exchange rate without repairing currencies", () => {
    expect(publicSaleListing({ listing: base({ price: { amount: 1, currency: "USD" } }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ price: { amount: 35000, currency: "UYU" } }) }, NOW, 41.5)).toBeNull();
    expect(publicSaleListing({ listing: base({ price: { amount: 1200000, currency: "UYU" } }) }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: base({ price: { amount: 1200000, currency: "UYU" } }) }, NOW, 41.5)?.price).toEqual({ amount: 1200000, currency: "UYU" });
  });
  it("does not relabel ambiguous Casasweb peso cards as dollars", () => {
    expect(publicSaleListing({ listing: base({ source: "casasweb", id: "sale:casasweb:123", listingId: "casasweb:123", url: "https://casasweb.com/VENTA_APARTAMENTO_CW123",
      title: "Venta U$S 330000", price: { amount: 330000, currency: "UYU" } }) }, NOW, 41.5)).toBeNull();
  });
  it("withholds Casasweb cards until a complete own detail was read and rejects evidence predating the current card", () => {
    const row = base({ source: "casasweb", id: "sale:casasweb:123", listingId: "casasweb:123", url: "https://casasweb.com/VENTA_APARTAMENTO_CW123" });
    expect(publicSaleListing({ listing: { ...row, saleDetailReadAt: undefined } }, NOW)).toBeNull();
    expect(publicSaleListing({ listing: { ...row, saleDetailReadAt: "2026-09-01" } }, NOW)).toBeNull();
  });
  it.each(["Tres casas a la venta en un solo padrón", "Venta de 3 apartamentos para renta", "Casa y dos apartamentos", "Complejo de 5 apartamentos"])("does not pretend a package is one home: %s", title => {
    expect(publicSaleListing({ listing: base({ title }) }, NOW)).toBeNull();
  });
  it("does not publish a five-home estate as an individual dwelling", () => {
    expect(publicSaleListing({ listing: base({ description: "Consta 5 casas con luz y agua potable. Cinco galpones." }) }, NOW)).toBeNull();
  });
  it("does not mistake the apartment's building context for a multiple-home sale", () => {
    expect(publicSaleListing({ listing: base({ title: "Apartamento en edificio de 3 apartamentos" }) }, NOW)).not.toBeNull();
  });
  it("reads a source's own card badges for projects and occupied properties", () => {
    const row = base({ source: "casasweb", id: "sale:casasweb:123", listingId: "casasweb:123", url: "https://casasweb.com/VENTA_APARTAMENTO_CW123", description: "2 Dormitorios Muy Bueno Renta" });
    expect(publicSaleListing({ listing: row }, NOW)?.conditions).toContain("occupied");
    expect(publicSaleListing({ listing: { ...row, description: "2 Dormitorios A Estrenar Proyecto" } }, NOW)?.conditions).toContain("project");
  });
  it("accepts the independently parsed Casasweb source with its own source URL and reported area", () => {
    const row = publicSaleListing({ listing: base({ source: "casasweb", id: "sale:casasweb:123", listingId: "casasweb:123",
      url: "https://casasweb.com/VENTA_APARTAMENTO_CW123", image: "https://casasweb.com/fotos/123s.jpg", area: { value: 55, basis: "reported" } }) }, NOW)!;
    expect(row).toMatchObject({ key: "casasweb-123", source: "casasweb", areas: { built: null, total: null, reported: 55 } });
  });
  it("counts only own source IDs and source dates despite duplicate inputs and expired rows", () => {
    const fresh = base({ lastSeen: "2026-09-05T11:00:00Z" });
    const rows = [base(), fresh, base({ id: "sale:infocasas:999", listingId: "infocasas:999", url: "https://www.infocasas.com.uy/a/999", lastSeen: "2026-08-01" })];
    const result = buildSaleCatalog(rows.map(listing => ({ listing })), NOW, 41.5);
    expect(result.meta).toMatchObject({ inputCount: 2, total: 1, excludedCount: 1, lastSourceReadAt: NOW, sourceCoverage: "partial", sources: [{ key: "infocasas", listings: 1, lastSeen: NOW, complete: false }] });
    expect(saleCatalogRefusal({ ...result.meta, inputCount: 20 }, { ...result.meta, inputCount: 1000 })).toContain("collapsed");
    expect(saleCatalogRefusal(result.meta, null)).toBeNull();
  });
  it("refuses failed, thin or operation-confused new Casasweb batches", () => {
    const harvest = { source: "casasweb", operation: "sale", ok: true, complete: false, readAt: NOW, unavailableIds: [],
      listings: [base({ source: "casasweb", id: "sale:casasweb:123" })], pagesRequested: 38, pagesRead: 38, failedPages: 0 } as any;
    expect(casaswebHarvestRefusal(harvest, NOW, null)).toBeNull();
    expect(casaswebHarvestRefusal({ ...harvest, ok: false }, NOW, null)).toContain("Invalid");
    expect(casaswebHarvestRefusal(harvest, NOW, { key: "casasweb", readAt: NOW, observed: 1000, complete: false })).toContain("collapsed");
    expect(casaswebHarvestRefusal({ ...harvest, unavailableIds: ["sale:casasweb:123"] }, NOW, null)).toContain("Conflicting");
  });
});

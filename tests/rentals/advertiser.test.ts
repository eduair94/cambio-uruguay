import { describe, expect, it } from "vitest";
import { advertiserClassification, contactFromVisibleHtml, directOwnerClaim, infoCasasAdvertiser, ownerDirectDeclaration, publicAdvertiserFields, publicAdvertiserUrl, publicContactPhone } from "../../classes/rentals/advertiser";
import { compatibleAdvertiserEvidence, retainAdvertiserFields } from "../../classes/rentals/advertiserRetention";
import { toRawRental } from "../../classes/rentals/sources/infocasas";
import { elpaisToRawRental } from "../../classes/rentals/sources/elpais";
import { toInfoCasasSale } from "../../classes/propertyopportunities/sales";
import { publicSaleListing } from "../../classes/propertysales/project";
import type { RentalAgency } from "../../classes/rentals/types";

const NOW = "2026-09-07T10:00:00.000Z";
const URL = "https://www.infocasas.com.uy/apartamento/123";
const owner = { id: 77, name: "Agencia pública", type: "inmobiliaria", particular: false, inmoLink: "/inmobiliarias/perfil/77-agencia", inmoPropsLink: "/inmobiliarias/77-agencia/propiedades" };
const agency: RentalAgency = { version: 1, key: "infocasas:77", name: owner.name, profileUrl: `https://www.infocasas.com.uy${owner.inmoLink}`, observedAt: NOW };
const row = { id: 123, link: "/apartamento/123", title: "Alquiler apartamento luminoso", description: "Cuenta con dos dormitorios.", price: { amount: 20_000, currency: { name: "UYU" } }, owner,
  locations: { state: [{ name: "Montevideo" }], neighbourhood: [{ name: "Centro" }] }, property_type: { name: "Apartamento" }, bedrooms: 2, bathrooms: 1, m2Built: 60 };

describe("source-owned public advertiser metadata", () => {
  it("El País never turns an untyped company name into an agency or a contradictory claim into owner proof", () => {
    const input = { _id: "6a42af6f3b79e8db94e26e37", transactionType: "rental", status: "active", title: "Apartamento en alquiler", province: "Montevideo", price: { amount: 20000, currency: "UYU" }, contact: { company: "Nombre publicado", phone: "PRIVATE" }, sourceAgency: { emails: ["PRIVATE"] } };
    const listing = elpaisToRawRental(input, NOW)!;
    expect(listing).not.toBeNull(); expect(listing.sellerType).toBe("desconocido"); expect(listing.ownerDirect).toBeNull(); expect(listing.publicContact).toBeUndefined();
    expect(JSON.stringify(listing)).not.toContain("PRIVATE");
    expect(elpaisToRawRental({ ...input, ownerDirect: true }, NOW)?.ownerDirect?.evidence).toBe("source_field");
    expect(elpaisToRawRental({ ...input, ownerDirect: true, description: "No soy el dueño" }, NOW)?.ownerDirect).toBeNull();
  });
  it("binds a native agency ID and own source profile without importing arbitrary owner fields", () => {
    const value = infoCasasAdvertiser({ ...owner, ...{ masked_phone: "PRIVATE", whatsapp_phone: "PRIVATE", subsidiaries: [{ email: "PRIVATE" }] } }, { url: URL, title: row.title, observedAt: NOW });
    expect(value.agency).toEqual({ ...agency, listingsUrl: `https://www.infocasas.com.uy${owner.inmoPropsLink}` });
    expect(value.publicContact).toBeUndefined(); expect(value.ownerDirect).toBeNull();
    expect(JSON.stringify(value)).not.toContain("PRIVATE");
  });
  it("does not join by name, fabricate URLs or accept mismatched/native/external profile links", () => {
    for (const change of [{ id: undefined }, { inmoLink: null, inmoPropsLink: null }, { inmoLink: "/inmobiliarias/perfil/78-agencia", inmoPropsLink: null }, { inmoLink: "https://evil.example/inmobiliarias/perfil/77-agencia", inmoPropsLink: null }, { type: "", particular: null }]) {
      expect(infoCasasAdvertiser({ ...owner, ...change }, { url: URL, title: row.title, observedAt: NOW }).agency).toBeNull();
    }
  });
  it("handles a source advertiser-listing link when no enhanced agency profile exists", () => {
    const result = infoCasasAdvertiser({ ...owner, inmoLink: null }, { url: URL, title: row.title, observedAt: NOW });
    expect(result.agency?.profileUrl).toBe(`https://www.infocasas.com.uy${owner.inmoPropsLink}`);
  });
  it.each(["Dueño directo alquila apartamento", "Alquila el propietario", "Trato directo con el dueño", "Propietario vende casa"])("accepts an explicit own transaction: %s", text => {
    expect(directOwnerClaim(text)).toBe(true);
    expect(ownerDirectDeclaration({ title: text }, URL, NOW)).toEqual({ declared: true, evidence: "advert_text", sourceUrl: URL, observedAt: NOW });
  });
  it.each(["Busco alquiler dueño directo", "No es dueño directo", "Sin trato directo con propietario", "Preferentemente dueño directo", "Sin comisión inmobiliaria", "No soy dueño directo", "No alquila el dueño", "No hay trato directo con el propietario", "No ofrecemos contacto directo con el dueño", "No vende el propietario"])("does not infer ownership: %s", title => {
    expect(advertiserClassification({ title }).direct).toBe(false);
  });
  it("a private seller is not necessarily the owner, and contradictory declarations are unknown", () => {
    expect(advertiserClassification({ particular: true })).toMatchObject({ sellerType: "particular", direct: false });
    expect(advertiserClassification({ type: "inmobiliaria", particular: true })).toEqual({ sellerType: "desconocido", direct: false, sourceDirect: false });
    expect(advertiserClassification({ type: "inmobiliaria", title: "Dueño directo" })).toMatchObject({ sellerType: "desconocido", direct: false });
    expect(advertiserClassification({ particular: true, title: "Dueño directo", description: "Comisión inmobiliaria un mes." })).toMatchObject({ sellerType: "desconocido", direct: false });
    expect(advertiserClassification({ ownerDirect: true })).toMatchObject({ sellerType: "particular", direct: true, sourceDirect: true });
    expect(advertiserClassification({ ownerDirect: true, description: "No soy el dueño" })).toMatchObject({ sellerType: "desconocido", direct: false });
    expect(advertiserClassification({ title: "Dueño directo", description: "Sin comisión inmobiliaria." }).direct).toBe(true);
  });
  it.each(["javascript:alert(1)", "http://agency.example", "https://127.0.0.1/a", "https://user:password@agency.example/a", "https://agency.example/login", "https://agency.example/a?token=private"])("rejects unsafe/private links: %s", url => expect(publicAdvertiserUrl(url)).toBeNull());
  it("normalizes published Uruguay phone formats and refuses masks/invalid numbers", () => {
    for (const text of ["099 123 456", "+598 99 123 456", "00598 99 123 456", "59899123456"]) expect(publicContactPhone(text)).toBe("+59899123456");
    expect(publicContactPhone("2901 2345")).toBe("+59829012345");
    for (const text of ["099 *** 456", "099xxxxxx", "123", "911", "+1 555 555 5555", "tel:099123456"]) expect(publicContactPhone(text)).toBeNull();
  });
  it("only preserves explicitly projected channels with own evidence, never private siblings", () => {
    const input = { agency, publicContact: { version: 1 as const, name: "Agencia pública", channels: [
      { kind: "email" as const, value: "business@example.com", sourceUrl: agency.profileUrl, observedAt: NOW, password: "PRIVATE" },
      { kind: "phone" as const, value: "+59899123456", sourceUrl: "https://www.infocasas.com.uy/inmobiliarias/perfil/88-otro", observedAt: NOW },
    ], secret: "PRIVATE" }, ownerDirect: { declared: true as const, evidence: "source_field" as const, sourceUrl: URL, observedAt: NOW } };
    const result = publicAdvertiserFields(input, { source: "infocasas", url: URL, sellerType: "inmobiliaria", now: NOW });
    expect(result.publicContact?.channels).toHaveLength(1); expect(result.ownerDirect).toBeNull(); expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(publicAdvertiserFields(input, { source: "infocasas", url: URL, now: "2026-10-07T10:00:00Z" }).publicContact).toBeNull();
  });
  it("extracts visible commercial fields but excludes forms, hidden attributes, scripts and masks", () => {
    const html = `<span>business@example.com</span><a href="tel:099123456">Teléfono</a><a href="https://wa.me/59899123456?text=private">WhatsApp</a>
      <script>{"phone":"PRIVATE","email":"private@example.com"}</script><span hidden>hidden@example.com</span><span style="display:none">css@example.com</span><form>form@example.com</form><span>Teléfono: 099***456</span>`;
    const result = contactFromVisibleHtml(html, agency, agency.profileUrl, NOW)!;
    expect(result.channels.map(x => x.kind).sort()).toEqual(["email", "phone", "profile", "whatsapp"]);
    expect(JSON.stringify(result)).not.toMatch(/private|hidden|css@|form@|\*/i);
  });
  it("the rental and sale adapters preserve safe native identity with actual read dates", () => {
    const rent = toRawRental({ ...row, operation_type_id: 2 }, NOW)!;
    expect(rent.agency?.key).toBe("infocasas:77"); expect(rent.agency?.observedAt).toBe(NOW);
    const sale = toInfoCasasSale({ ...row, title: "Apartamento luminoso", price: { amount: 120000, currency: { name: "USD" } }, operation_type_id: 1 }, NOW)!;
    expect(sale.agency?.key).toBe("infocasas:77");
    const published = publicSaleListing({ listing: sale }, NOW, 40)!;
    expect(published.agency?.key).toBe("infocasas:77"); expect(published.sellerType).toBe("inmobiliaria"); expect(published).not.toHaveProperty("address");
  });
  it("retains uninspected same-advert fields without renewing dates, but explicit clearing wins", () => {
    type AdvertiserFixture = Parameters<typeof retainAdvertiserFields>[1];
    const old: AdvertiserFixture = { source: "infocasas", listingId: "infocasas:123", url: URL, sellerType: "inmobiliaria", agency,
      publicContact: contactFromVisibleHtml("business@example.com", agency, agency.profileUrl, NOW) };
    const fresh: AdvertiserFixture = { source: old.source, listingId: old.listingId, url: URL, sellerType: old.sellerType };
    expect(retainAdvertiserFields(old, fresh, true).publicContact).toEqual(old.publicContact);
    expect(retainAdvertiserFields(old, { ...fresh, publicContact: null }, true).publicContact).toBeNull();
    expect(retainAdvertiserFields(old, { ...fresh, agency: null }, true).publicContact).toBeNull();
    expect(retainAdvertiserFields(old, fresh, false).publicContact).toBeUndefined();
    expect(retainAdvertiserFields(old, { ...fresh, listingId: "infocasas:124" }, true).publicContact).toBeUndefined();
    expect(retainAdvertiserFields({ ...old, agency: undefined, sellerName: "Agente anterior" }, { ...fresh, sellerName: "Otro agente" }, true).publicContact).toBeUndefined();
  });
  it("price/group/photo changes do not identify a different unit, but own physical contradictions do", () => {
    const first = { title: "Apartamento tercer piso", description: "Gimnasio en planta baja", street: "Colonia", streetNumber: "123", department: "Montevideo", bedrooms: 2, bathrooms: 1, area: 60 };
    expect(compatibleAdvertiserEvidence(first, { ...first, area: 61 })).toBe(true);
    for (const changes of [{ title: "Apartamento cuarto piso" }, { streetNumber: "125" }, { bedrooms: 3 }, { department: "Canelones" }, { area: 90 }]) expect(compatibleAdvertiserEvidence(first, { ...first, ...changes })).toBe(false);
    expect(compatibleAdvertiserEvidence(null, first)).toBe(false);
  });
});
